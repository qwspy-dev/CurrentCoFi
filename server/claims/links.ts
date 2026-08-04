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
import { parseClaimToken, sha256, signClaimToken } from "../security/crypto.js";
import { formatAtomic, resolveToken, toAtomic } from "../campaigns/repository.js";
import { keccak256 } from "viem";
import { parseClaimCondition } from "../campaigns/conditions.js";

export async function createClaimLink(input: {
  userId: string;
  displayName: string;
  projectId: string;
  amount: string;
  tokenAddress?: string;
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
  const token = await resolveToken(project.id, input.tokenAddress);
  const amountAtomic = toAtomic(input.amount, token.decimals);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1_000);
  const [distribution] = await db.insert(distributions).values({
    projectId: project.id,
    creatorUserId: input.userId,
    tokenId: token.id,
    kind: "private-link",
    status: "awaiting_funding",
    name: input.message ? input.message.slice(0, 100) : `${input.amount} ${token.symbol} private link`,
    totalAmountAtomic: amountAtomic,
    refundAddress: input.refundAddress.toLowerCase(),
    expiresAt,
    rules: { claimMode: "secret", recipientPaysGas: false },
    metadata: {
      message: input.message?.slice(0, 280) ?? "",
      creatorDisplayName: input.displayName,
      assetContract: token.contractAddress,
      assetVerified: token.verified,
    },
  }).returning();
  const secret = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as `0x${string}`;
  const [allocation] = await db.insert(allocations).values({
    distributionId: distribution.id,
    identityType: "secret",
    claimSecretHash: keccak256(secret),
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
    assetDetails: {
      address: token.contractAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      verified: token.verified,
      network: ARC_TESTNET.network,
      warning: token.verified ? null : "Metadata was read onchain and is not an endorsement by Current CoFi.",
    },
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
    identityType: allocations.identityType,
    amountAtomic: allocations.amountAtomic,
    availableAt: allocations.availableAt,
    expiresAt: allocations.expiresAt,
    distributionId: distributions.id,
    distributionStatus: distributions.status,
    rules: distributions.rules,
    message: distributions.metadata,
    projectName: projects.name,
    projectLogo: projects.logoUrl,
    symbol: tokens.symbol,
    decimals: tokens.decimals,
    chainCode: tokens.chainCode,
    tokenMetadata: tokens.metadata,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .innerJoin(projects, eq(projects.id, distributions.projectId))
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  const secretMatches = row?.claimSecretHash && (
    row.claimSecretHash === await sha256(secret) ||
    (/^0x[0-9a-f]{64}$/i.test(secret) && row.claimSecretHash === keccak256(secret as `0x${string}`))
  );
  if (!row || !secretMatches) {
    throw new ApiError(404, "CLAIM_NOT_FOUND", "This claim link is invalid or no longer available.");
  }
  const expired = Boolean(row.expiresAt && row.expiresAt.getTime() <= Date.now());
  const locked = Boolean(row.availableAt && row.availableAt.getTime() > Date.now());
  const metadata = row.message as Record<string, unknown>;
  const rules = row.rules as Record<string, unknown>;
  const identityBound = rules.claimMode === "identity-bound";
  const activationDestination = rules.activationDestination && typeof rules.activationDestination === "object"
    ? rules.activationDestination as Record<string, unknown>
    : null;
  const claimCondition = parseClaimCondition(rules.claimCondition);
  const recipientLabels = metadata.recipientLabels as Record<string, string> | undefined;
  const tokenMetadata = row.tokenMetadata as Record<string, unknown>;
  const trust = tokenMetadata.trust as Record<string, unknown> | undefined;
  return {
    id: row.distributionId,
    allocationId: row.allocationId,
    status: expired ? "expired" : locked ? "locked" : row.allocationStatus,
    fundingStatus: row.distributionStatus,
    claimable: !expired && !locked && row.allocationStatus === "available" && row.distributionStatus === "active",
    amount: formatAtomic(row.amountAtomic, row.decimals),
    asset: row.symbol,
    assetTrust: trust ? {
      posture: typeof trust.posture === "string" ? trust.posture : "standard-observations",
      reviewDigest: typeof trust.reviewDigest === "string" ? trust.reviewDigest : null,
      inspectedAt: typeof trust.inspectedAt === "string" ? trust.inspectedAt : null,
      explorerUrl: typeof trust.explorerUrl === "string" ? trust.explorerUrl : null,
      boundary: typeof trust.boundary === "string"
        ? trust.boundary
        : "Contract observations are not an audit, endorsement, or guarantee.",
    } : null,
    network: row.chainCode,
    project: { name: row.projectName, logoUrl: row.projectLogo },
    message: typeof metadata.message === "string" ? metadata.message : "",
    sender: typeof metadata.creatorDisplayName === "string" ? metadata.creatorDisplayName : row.projectName,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    availableAt: row.availableAt?.toISOString() ?? null,
    identityBinding: {
      required: identityBound,
      type: identityBound ? row.identityType : null,
      recipient: identityBound ? recipientLabels?.[row.allocationId] ?? null : null,
      status: identityBound ? "sign-in-required" : "link-secured",
      supported: ["email", "wallet", "x", "game", "custom"].includes(row.identityType),
      verifier: identityBound && ["x", "game", "custom"].includes(row.identityType)
        ? "project-attestation"
        : identityBound
          ? "current-session"
          : "link-secret",
    },
    claimCondition: claimCondition ? {
      required: true,
      eventType: claimCondition.eventType,
      label: claimCondition.label,
      description: claimCondition.description,
      proofWindowMinutes: claimCondition.proofWindowMinutes,
      status: "verification-required",
    } : { required: false, status: "not-required" },
    activationDestination: activationDestination
      && typeof activationDestination.url === "string"
      && typeof activationDestination.label === "string"
      ? { url: activationDestination.url, label: activationDestination.label }
      : null,
  };
}
