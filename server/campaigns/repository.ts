import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  getAddress,
  isAddress,
  keccak256,
} from "viem";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import {
  activationEvents,
  allocations,
  auditEvents,
  claims,
  distributions,
  identityAttestations,
  projectMembers,
  tokens,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { sha256, signClaimToken } from "../security/crypto.js";
import { normalizeBoundIdentity, type CampaignClaimMode } from "../claims/identity-binding.js";
import { inspectArcTokenTrust } from "../tokens/trust.js";
import { buildCampaignTree } from "./merkle.js";
import { parseClaimCondition } from "./conditions.js";

const AMOUNT_PATTERN = /^\d{1,30}(?:\.\d{1,18})?$/;
export type CampaignRecipientInput = {
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  amount: string;
  availableAt?: Date;
};

export function toAtomic(amount: string, decimals: number) {
  const normalized = amount.trim();
  if (!AMOUNT_PATTERN.test(normalized)) {
    throw new ApiError(400, "INVALID_AMOUNT", `Invalid recipient amount: ${amount}`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new ApiError(400, "INVALID_AMOUNT", `Amounts may use at most ${decimals} decimal places.`);
  }
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  if (BigInt(atomic) <= BigInt(0)) throw new ApiError(400, "INVALID_AMOUNT", "Amounts must be greater than zero.");
  return atomic;
}

export function formatAtomic(atomic: string, decimals: number) {
  if (decimals === 0) return atomic.replace(/^0+(?=\d)/, "");
  const value = atomic.padStart(decimals + 1, "0");
  const whole = value.slice(0, -decimals);
  const fraction = value.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function normalizeIdentity(type: CampaignRecipientInput["identityType"], identity: string) {
  return normalizeBoundIdentity(type, identity);
}

function maskedIdentity(type: CampaignRecipientInput["identityType"], value: string) {
  if (type === "email") {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
  }
  if (type === "wallet") return `${value.slice(0, 7)}…${value.slice(-5)}`;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export async function projectAccess(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
  });
  if (!membership || !["owner", "admin", "operator"].includes(membership.role)) {
    throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot manage campaigns for this project.");
  }
}

export async function resolveToken(projectId: string, requestedAddress?: string) {
  const db = getDb();
  const address = requestedAddress?.trim() || ARC_TESTNET.usdcAddress;
  if (!isAddress(address)) throw new ApiError(400, "INVALID_TOKEN", "Enter a valid Arc token contract address.");
  const contractAddress = getAddress(address);
  const existing = await db.query.tokens.findFirst({
    where: and(eq(tokens.chainCode, ARC_TESTNET.network), eq(tokens.contractAddress, contractAddress.toLowerCase())),
  });
  const trust = await inspectArcTokenTrust(contractAddress);
  const { symbol, name, decimals, verified } = trust;
  const existingMetadata = existing?.metadata as Record<string, unknown> | undefined;
  const approvedTrust = existingMetadata?.approvedTrust ?? existingMetadata?.trust ?? trust;
  const metadata = { ...existingMetadata, source: verified ? "circle" : "onchain", network: ARC_TESTNET.network, trust, approvedTrust };
  const [token] = await db.insert(tokens).values({
    projectId,
    chainCode: ARC_TESTNET.network,
    contractAddress: contractAddress.toLowerCase(),
    symbol,
    name,
    decimals,
    verified,
    metadata,
  }).onConflictDoUpdate({
    target: [tokens.chainCode, tokens.contractAddress],
    set: { symbol, name, decimals, metadata, updatedAt: new Date() },
  }).returning();
  return token;
}

export async function createCampaign(input: {
  userId: string;
  displayName: string;
  projectId: string;
  refundAddress: string;
  origin: string;
  name: string;
  tokenAddress?: string;
  recipients: CampaignRecipientInput[];
  expiresInHours: number;
  activationEvent?: string;
  referralReward?: string;
  claimMode?: CampaignClaimMode;
  claimCondition?: unknown;
  allowDuplicateIdentities?: boolean;
}) {
  if (!input.name.trim() || input.name.length > 100) {
    throw new ApiError(400, "INVALID_CAMPAIGN_NAME", "Campaign names must contain 1–100 characters.");
  }
  if (!input.recipients.length || input.recipients.length > 1_000) {
    throw new ApiError(400, "INVALID_RECIPIENT_COUNT", "Campaigns require 1–1,000 recipients.");
  }
  const claimMode = input.claimMode ?? "allowlist";
  const claimCondition = parseClaimCondition(input.claimCondition);
  await projectAccess(input.userId, input.projectId);
  const db = getDb();
  const token = await resolveToken(input.projectId, input.tokenAddress);
  const distributionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1_000);
  const seen = new Set<string>();
  const prepared = await Promise.all(input.recipients.map(async (recipient, index) => {
    const identity = normalizeIdentity(recipient.identityType, recipient.identity);
    const identityHash = await sha256(`${recipient.identityType}:${identity}`);
    if (seen.has(identityHash) && !input.allowDuplicateIdentities) {
      throw new ApiError(400, "DUPLICATE_RECIPIENT", `Recipient ${index + 1} appears more than once.`);
    }
    seen.add(identityHash);
    if (recipient.availableAt && (!Number.isFinite(recipient.availableAt.getTime()) || recipient.availableAt.getTime() >= expiresAt.getTime())) {
      throw new ApiError(400, "INVALID_ALLOCATION_UNLOCK", `Recipient ${index + 1} must unlock before the campaign expires.`);
    }
    const secret = keccak256(crypto.getRandomValues(new Uint8Array(32)));
    const allocationId = crypto.randomUUID();
    return {
      allocationId,
      index,
      identity,
      masked: maskedIdentity(recipient.identityType, identity),
      identityType: recipient.identityType,
      identityHash,
      walletAddress: recipient.identityType === "wallet" ? identity : null,
      secret,
      secretHash: keccak256(secret),
      amountAtomic: toAtomic(recipient.amount, token.decimals),
      availableAt: recipient.availableAt ?? null,
    };
  }));
  const totalAmountAtomic = prepared
    .reduce((sum, recipient) => sum + BigInt(recipient.amountAtomic), BigInt(0))
    .toString();
  const tree = buildCampaignTree(prepared.map((recipient) => ({
    allocationId: recipient.allocationId,
    index: recipient.index,
    amountAtomic: recipient.amountAtomic,
  })));
  const labels = Object.fromEntries(prepared.map((recipient) => [recipient.allocationId, recipient.masked]));
  await db.insert(distributions).values({
    id: distributionId,
    projectId: input.projectId,
    creatorUserId: input.userId,
    tokenId: token.id,
    kind: "merkle-campaign",
    status: "awaiting_funding",
    name: input.name.trim(),
    totalAmountAtomic,
    recipientCount: prepared.length,
    merkleRoot: tree.root,
    refundAddress: input.refundAddress.toLowerCase(),
    expiresAt,
    rules: {
      claimMode,
      recipientPaysGas: false,
      activationEvent: input.activationEvent?.slice(0, 100) || null,
      referralReward: input.referralReward?.slice(0, 100) || null,
      claimCondition,
    },
    metadata: {
      creatorDisplayName: input.displayName,
      recipientLabels: labels,
      generatedAt: new Date().toISOString(),
    },
  });
  await db.insert(allocations).values(prepared.map((recipient) => ({
    id: recipient.allocationId,
    distributionId,
    identityType: recipient.identityType,
    identityHash: recipient.identityHash,
    walletAddress: recipient.walletAddress,
    claimSecretHash: recipient.secretHash,
    amountAtomic: recipient.amountAtomic,
    merkleIndex: recipient.index,
    availableAt: recipient.availableAt,
    expiresAt,
  })));
  await db.insert(auditEvents).values({
    actorType: "user",
    actorId: input.userId,
    projectId: input.projectId,
    action: "campaign.created",
    resourceType: "distribution",
    resourceId: distributionId,
    metadata: {
      recipientCount: prepared.length,
      totalAmountAtomic,
      asset: token.symbol,
      merkleRoot: tree.root,
      claimMode,
    },
  });
  const links = await Promise.all(prepared.map(async (recipient) => ({
    allocationId: recipient.allocationId,
    identity: recipient.identity,
    identityType: recipient.identityType,
    amount: formatAtomic(recipient.amountAtomic, token.decimals),
    claimUrl: `${input.origin}/?claim=${encodeURIComponent(await signClaimToken(recipient.allocationId, recipient.secret))}#/claim`,
  })));
  return {
    id: distributionId,
    status: "awaiting_funding",
    name: input.name.trim(),
    asset: {
      address: token.contractAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
    },
    recipientCount: prepared.length,
    totalAmount: formatAtomic(totalAmountAtomic, token.decimals),
    totalAmountAtomic,
    merkleRoot: tree.root,
    claimMode,
    claimCondition,
    expiresAt: expiresAt.toISOString(),
    links,
  };
}

export async function campaignKindForClaim(tokenValue: string) {
  return (await claimRoutingForToken(tokenValue))?.kind ?? null;
}

export async function claimRoutingForToken(tokenValue: string) {
  const allocationId = tokenValue.split(".")[0];
  if (!/^[0-9a-f-]{36}$/i.test(allocationId)) return null;
  const row = await getDb().select({
    kind: distributions.kind,
    distributionId: distributions.id,
  })
    .from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  return row[0] ?? null;
}

export async function listCampaigns(userId: string) {
  const db = getDb();
  const rows = await db.select({
    id: distributions.id,
    name: distributions.name,
    status: distributions.status,
    kind: distributions.kind,
    totalAmountAtomic: distributions.totalAmountAtomic,
    claimedAmountAtomic: distributions.claimedAmountAtomic,
    recipientCount: distributions.recipientCount,
    expiresAt: distributions.expiresAt,
    createdAt: distributions.createdAt,
    fundingTxHash: distributions.fundingTxHash,
    metadata: distributions.metadata,
    rules: distributions.rules,
    symbol: tokens.symbol,
    decimals: tokens.decimals,
    tokenAddress: tokens.contractAddress,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(eq(distributions.creatorUserId, userId), eq(distributions.kind, "merkle-campaign")))
    .orderBy(desc(distributions.createdAt))
    .limit(100);
  const distributionIds = rows.map((row) => row.id);
  const claimCounts = distributionIds.length
    ? await db.select({
      distributionId: allocations.distributionId,
      confirmed: count(sql`CASE WHEN ${allocations.status} = 'confirmed' THEN 1 END`),
    }).from(allocations)
      .where(inArray(allocations.distributionId, distributionIds))
      .groupBy(allocations.distributionId)
    : [];
  const byDistribution = new Map(claimCounts.map((row) => [row.distributionId, Number(row.confirmed)]));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    asset: row.symbol,
    tokenAddress: row.tokenAddress,
    totalAmount: formatAtomic(row.totalAmountAtomic, row.decimals),
    claimedAmount: formatAtomic(row.claimedAmountAtomic, row.decimals),
    recipientCount: row.recipientCount,
    claimedCount: byDistribution.get(row.id) ?? 0,
    claimRate: row.recipientCount
      ? Math.round(((byDistribution.get(row.id) ?? 0) / row.recipientCount) * 10_000) / 100
      : 0,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    fundingTxHash: row.fundingTxHash,
    claimMode: ((row.rules as Record<string, unknown>).claimMode === "identity-bound"
      ? "identity-bound"
      : "allowlist"),
    activationEvent: (row.rules as Record<string, unknown>).activationEvent ?? null,
    claimCondition: (row.rules as Record<string, unknown>).claimCondition ?? null,
    refundTransactionHash: (row.metadata as Record<string, unknown>).refundTransactionHash ?? null,
  }));
}

export async function listRecipients(userId: string, campaignId?: string) {
  const db = getDb();
  const conditions = [
    eq(distributions.creatorUserId, userId),
    eq(distributions.kind, "merkle-campaign"),
  ];
  if (campaignId) conditions.push(eq(distributions.id, campaignId));
  const rows = await db.select({
    allocationId: allocations.id,
    distributionId: distributions.id,
    campaignName: distributions.name,
    identityType: allocations.identityType,
    amountAtomic: allocations.amountAtomic,
    status: allocations.status,
    updatedAt: allocations.updatedAt,
    metadata: distributions.metadata,
    symbol: tokens.symbol,
    decimals: tokens.decimals,
    claimantUserId: claims.claimantUserId,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .leftJoin(claims, eq(claims.allocationId, allocations.id))
    .where(and(...conditions))
    .orderBy(desc(allocations.updatedAt))
    .limit(2_000);
  return rows.map((row) => {
    const labels = (row.metadata as Record<string, unknown>).recipientLabels as Record<string, string> | undefined;
    return {
      id: row.allocationId,
      campaignId: row.distributionId,
      campaignName: row.campaignName,
      identity: labels?.[row.allocationId] ?? `${row.identityType} recipient`,
      identityType: row.identityType,
      amount: formatAtomic(row.amountAtomic, row.decimals),
      asset: row.symbol,
      status: row.status,
      claimed: Boolean(row.claimantUserId),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function campaignAnalytics(userId: string) {
  const campaigns = await listCampaigns(userId);
  const recipients = await listRecipients(userId);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const activationRows = campaignIds.length
    ? await getDb().select({ distributionId: activationEvents.distributionId, total: count() })
      .from(activationEvents)
      .where(inArray(activationEvents.distributionId, campaignIds))
      .groupBy(activationEvents.distributionId)
    : [];
  const [attestationTotals] = campaignIds.length
    ? await getDb().select({
      verified: count(),
      consumed: count(sql`CASE WHEN ${identityAttestations.consumedAt} IS NOT NULL THEN 1 END`),
    }).from(identityAttestations).where(inArray(identityAttestations.distributionId, campaignIds))
    : [{ verified: 0, consumed: 0 }];
  const activations = activationRows.reduce((sum, row) => sum + Number(row.total), 0);
  const confirmed = recipients.filter((recipient) => recipient.status === "confirmed").length;
  const targeted = recipients.length;
  const identityBoundCampaigns = campaigns.filter((campaign) => campaign.claimMode === "identity-bound");
  const identityBoundIds = new Set(identityBoundCampaigns.map((campaign) => campaign.id));
  const identityBoundTargeted = recipients.filter((recipient) => identityBoundIds.has(recipient.campaignId)).length;
  const identityBoundClaims = recipients.filter(
    (recipient) => identityBoundIds.has(recipient.campaignId) && recipient.status === "confirmed",
  ).length;
  return {
    totals: {
      campaigns: campaigns.length,
      liveCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      targeted,
      claimed: confirmed,
      activations,
      claimRate: targeted ? Math.round((confirmed / targeted) * 10_000) / 100 : 0,
      activationRate: confirmed ? Math.round((activations / confirmed) * 10_000) / 100 : 0,
      identityBoundCampaigns: identityBoundCampaigns.length,
      identityBoundTargeted,
      identityBoundClaims,
      identityAttestations: Number(attestationTotals?.verified ?? 0),
      consumedIdentityAttestations: Number(attestationTotals?.consumed ?? 0),
    },
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      targeted: campaign.recipientCount,
      claimed: campaign.claimedCount,
      claimRate: campaign.claimRate,
      activations: Number(activationRows.find((row) => row.distributionId === campaign.id)?.total ?? 0),
    })),
  };
}

export async function campaignAllocations(distributionId: string) {
  return getDb().select({
    allocationId: allocations.id,
    index: allocations.merkleIndex,
    amountAtomic: allocations.amountAtomic,
  }).from(allocations)
    .where(eq(allocations.distributionId, distributionId))
    .orderBy(asc(allocations.merkleIndex));
}
