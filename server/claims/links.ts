import { and, desc, eq } from "drizzle-orm";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import {
  allocations,
  auditEvents,
  distributions,
  projectMembers,
  projects,
  tokens,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { parseClaimToken, randomSecret, sha256, signClaimToken } from "../security/crypto.js";

const AMOUNT_PATTERN = /^\d{1,18}(?:\.\d{1,6})?$/;

function toAtomic(amount: string, decimals: number) {
  const normalized = amount.trim();
  if (!AMOUNT_PATTERN.test(normalized)) {
    throw new ApiError(400, "INVALID_AMOUNT", "Enter an amount with up to six decimal places.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  if (BigInt(atomic) <= BigInt(0)) throw new ApiError(400, "INVALID_AMOUNT", "The amount must be greater than zero.");
  return atomic;
}

function formatAtomic(atomic: string, decimals: number) {
  const value = atomic.padStart(decimals + 1, "0");
  const whole = value.slice(0, -decimals);
  const fraction = value.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function usdcToken() {
  const db = getDb();
  const [token] = await db.insert(tokens).values({
    chainCode: ARC_TESTNET.network,
    contractAddress: ARC_TESTNET.usdcAddress.toLowerCase(),
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    verified: true,
    metadata: { source: "circle", network: "Arc testnet" },
  }).onConflictDoUpdate({
    target: [tokens.chainCode, tokens.contractAddress],
    set: { verified: true, updatedAt: new Date() },
  }).returning();
  return token;
}

export async function createClaimLink(input: {
  userId: string;
  displayName: string;
  projectId: string;
  amount: string;
  message?: string;
  expiresInHours: number;
  refundAddress: string;
  origin: string;
}) {
  const db = getDb();
  const membership = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, input.userId)),
  });
  if (!membership || !["owner", "admin", "operator"].includes(membership.role)) {
    throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot create links for this project.");
  }
  const project = await db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "The project does not exist.");
  const token = await usdcToken();
  const amountAtomic = toAtomic(input.amount, token.decimals);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1_000);
  const [distribution] = await db.insert(distributions).values({
    projectId: project.id,
    creatorUserId: input.userId,
    tokenId: token.id,
    kind: "private-link",
    status: "awaiting_funding",
    name: input.message ? input.message.slice(0, 100) : `${input.amount} USDC private link`,
    totalAmountAtomic: amountAtomic,
    refundAddress: input.refundAddress.toLowerCase(),
    expiresAt,
    rules: { claimMode: "secret", recipientPaysGas: false },
    metadata: { message: input.message?.slice(0, 280) ?? "", creatorDisplayName: input.displayName },
  }).returning();
  const secret = randomSecret();
  const [allocation] = await db.insert(allocations).values({
    distributionId: distribution.id,
    identityType: "secret",
    claimSecretHash: await sha256(secret),
    amountAtomic,
    expiresAt,
  }).returning();
  await db.insert(auditEvents).values({
    actorType: "user",
    actorId: input.userId,
    projectId: project.id,
    action: "claim_link.created",
    resourceType: "distribution",
    resourceId: distribution.id,
    metadata: { allocationId: allocation.id, amountAtomic, asset: token.symbol },
  });
  const claimToken = await signClaimToken(allocation.id, secret);
  return {
    id: distribution.id,
    status: distribution.status,
    amount: formatAtomic(amountAtomic, token.decimals),
    asset: token.symbol,
    expiresAt: expiresAt.toISOString(),
    claimUrl: `${input.origin}/?claim=${encodeURIComponent(claimToken)}#/claim`,
    funding: {
      required: true,
      network: ARC_TESTNET.network,
      amountAtomic,
      assetAddress: token.contractAddress,
      state: "awaiting_vault_transaction",
    },
  };
}

export async function listClaimLinks(userId: string) {
  const db = getDb();
  const rows = await db.select({
    id: distributions.id,
    status: distributions.status,
    name: distributions.name,
    totalAmountAtomic: distributions.totalAmountAtomic,
    claimedAmountAtomic: distributions.claimedAmountAtomic,
    expiresAt: distributions.expiresAt,
    createdAt: distributions.createdAt,
    symbol: tokens.symbol,
    decimals: tokens.decimals,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(distributions.creatorUserId, userId))
    .orderBy(desc(distributions.createdAt))
    .limit(50);
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    name: row.name,
    amount: formatAtomic(row.totalAmountAtomic, row.decimals),
    claimedAmount: formatAtomic(row.claimedAmountAtomic, row.decimals),
    asset: row.symbol,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function resolveClaimLink(tokenValue: string) {
  const { allocationId, secret } = await parseClaimToken(tokenValue);
  const db = getDb();
  const [row] = await db.select({
    allocationId: allocations.id,
    allocationStatus: allocations.status,
    claimSecretHash: allocations.claimSecretHash,
    amountAtomic: allocations.amountAtomic,
    expiresAt: allocations.expiresAt,
    distributionId: distributions.id,
    distributionStatus: distributions.status,
    message: distributions.metadata,
    projectName: projects.name,
    projectLogo: projects.logoUrl,
    symbol: tokens.symbol,
    decimals: tokens.decimals,
    chainCode: tokens.chainCode,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .innerJoin(projects, eq(projects.id, distributions.projectId))
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  if (!row || !row.claimSecretHash || row.claimSecretHash !== await sha256(secret)) {
    throw new ApiError(404, "CLAIM_NOT_FOUND", "This claim link is invalid or no longer available.");
  }
  const expired = Boolean(row.expiresAt && row.expiresAt.getTime() <= Date.now());
  const metadata = row.message as Record<string, unknown>;
  return {
    id: row.distributionId,
    allocationId: row.allocationId,
    status: expired ? "expired" : row.allocationStatus,
    fundingStatus: row.distributionStatus,
    claimable: !expired && row.allocationStatus === "available" && row.distributionStatus === "active",
    amount: formatAtomic(row.amountAtomic, row.decimals),
    asset: row.symbol,
    network: row.chainCode,
    project: { name: row.projectName, logoUrl: row.projectLogo },
    message: typeof metadata.message === "string" ? metadata.message : "",
    sender: typeof metadata.creatorDisplayName === "string" ? metadata.creatorDisplayName : row.projectName,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}
