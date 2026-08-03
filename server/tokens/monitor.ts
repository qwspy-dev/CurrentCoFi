import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { auditEvents, distributions, tokens } from "../db/schema.js";
import { ApiError } from "../http.js";
import { inspectArcTokenTrust, type ArcTokenTrust } from "./trust.js";

const REVIEW_FRESHNESS_MS = 15 * 60 * 1_000;
const ACTIVE_STATES = ["awaiting_funding", "active", "paused"] as const;

type ReviewPhase = "funding" | "claim" | "manual" | "scheduled";
type TokenRow = typeof tokens.$inferSelect;

function storedTrust(value: unknown): ArcTokenTrust | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const trust = value as Partial<ArcTokenTrust>;
  return typeof trust.codeHash === "string" && typeof trust.inspectedAt === "string" &&
    typeof trust.address === "string" && Array.isArray(trust.observedCapabilities)
    ? trust as ArcTokenTrust
    : null;
}

function comparable(value: ArcTokenTrust) {
  return {
    codeHash: value.codeHash.toLowerCase(),
    owner: value.owner?.toLowerCase() ?? null,
    proxyImplementation: value.proxyImplementation?.toLowerCase() ?? null,
    capabilities: [...value.observedCapabilities].sort(),
  };
}

export function compareTokenControls(baseline: ArcTokenTrust, current: ArcTokenTrust) {
  const approved = comparable(baseline);
  const observed = comparable(current);
  const changedFields: string[] = [];
  if (approved.codeHash !== observed.codeHash) changedFields.push("runtime-bytecode");
  if (approved.owner !== observed.owner) changedFields.push("owner-interface");
  if (approved.proxyImplementation !== observed.proxyImplementation) changedFields.push("proxy-implementation");
  if (approved.capabilities.join(",") !== observed.capabilities.join(",")) changedFields.push("privileged-selectors");
  return changedFields;
}

function summary(token: TokenRow, baseline: ArcTokenTrust, current: ArcTokenTrust, changedFields: string[], source: "cached" | "live") {
  const inspectedAt = new Date(current.inspectedAt);
  const ageMs = Number.isNaN(inspectedAt.getTime()) ? Number.POSITIVE_INFINITY : Date.now() - inspectedAt.getTime();
  return {
    tokenId: token.id,
    address: token.contractAddress,
    symbol: token.symbol,
    name: token.name,
    verified: token.verified,
    status: changedFields.length ? "changed" as const : ageMs > REVIEW_FRESHNESS_MS ? "stale" as const : "stable" as const,
    source,
    changedFields,
    current,
    approved: {
      reviewDigest: baseline.reviewDigest,
      controlDigest: baseline.controlDigest ?? null,
      inspectedAt: baseline.inspectedAt,
      codeHash: baseline.codeHash,
    },
    freshness: {
      inspectedAt: current.inspectedAt,
      validUntil: new Date(inspectedAt.getTime() + REVIEW_FRESHNESS_MS).toISOString(),
      ageSeconds: Math.max(0, Math.floor(ageMs / 1_000)),
    },
  };
}

async function persistReview(input: {
  token: TokenRow;
  current: ArcTokenTrust;
  approved: ArcTokenTrust;
  phase: ReviewPhase;
  projectId: string | null;
  actorId?: string;
  changedFields: string[];
}) {
  const db = getDb();
  const metadata = input.token.metadata as Record<string, unknown>;
  const history = Array.isArray(metadata.trustHistory) ? metadata.trustHistory : [];
  const event = {
    phase: input.phase,
    status: input.changedFields.length ? "changed" : "stable",
    changedFields: input.changedFields,
    approvedReviewDigest: input.approved.reviewDigest,
    currentReviewDigest: input.current.reviewDigest,
    currentControlDigest: input.current.controlDigest,
    inspectedAt: input.current.inspectedAt,
  };
  await db.update(tokens).set({
    metadata: {
      ...metadata,
      trust: input.current,
      approvedTrust: metadata.approvedTrust ?? metadata.trust ?? input.approved,
      trustStatus: event.status,
      trustHistory: [event, ...history].slice(0, 24),
    },
    updatedAt: new Date(),
  }).where(eq(tokens.id, input.token.id));
  await db.insert(auditEvents).values({
    actorType: input.actorId ? "user" : "system",
    actorId: input.actorId,
    projectId: input.projectId,
    action: input.changedFields.length ? "token.trust_changed" : "token.trust_verified",
    resourceType: "token",
    resourceId: input.token.id,
    metadata: event,
  });
}

async function reviewTokenRecord(token: TokenRow, options: {
  phase: ReviewPhase;
  projectId: string | null;
  actorId?: string;
  force?: boolean;
}) {
  const metadata = token.metadata as Record<string, unknown>;
  const latest = storedTrust(metadata.trust);
  const approved = storedTrust(metadata.approvedTrust) ?? latest;
  const latestAt = latest ? new Date(latest.inspectedAt).getTime() : 0;
  const fresh = latest?.schemaVersion === "1.1" && Number.isFinite(latestAt) && Date.now() - latestAt <= REVIEW_FRESHNESS_MS;
  if (!options.force && latest && approved && fresh) {
    return summary(token, approved, latest, compareTokenControls(approved, latest), "cached");
  }
  const current = await inspectArcTokenTrust(token.contractAddress);
  const baseline = approved ?? current;
  const changedFields = compareTokenControls(baseline, current);
  await persistReview({ token, current, approved: baseline, changedFields, ...options });
  return summary(token, baseline, current, changedFields, "live");
}

async function projectCanAccessToken(projectId: string, tokenId: string) {
  const db = getDb();
  const token = await db.query.tokens.findFirst({ where: eq(tokens.id, tokenId) });
  if (!token) throw new ApiError(404, "TOKEN_NOT_FOUND", "This Arc token record does not exist.");
  if (token.projectId === projectId) return token;
  const linked = await db.query.distributions.findFirst({
    where: and(eq(distributions.projectId, projectId), eq(distributions.tokenId, tokenId)),
  });
  if (!linked) throw new ApiError(403, "TOKEN_ACCESS_DENIED", "This token is not part of the current project.");
  return token;
}

async function pauseForControlDrift(tokenId: string, distributionId?: string) {
  const db = getDb();
  const rows = await db.query.distributions.findMany({
    where: and(eq(distributions.tokenId, tokenId), eq(distributions.status, "active")),
  });
  for (const row of rows) {
    if (distributionId && row.id !== distributionId) continue;
    const metadata = row.metadata as Record<string, unknown>;
    await db.update(distributions).set({
      status: "paused",
      metadata: { ...metadata, trustPauseReason: "token-control-drift", trustPausedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).where(eq(distributions.id, row.id));
  }
}

export async function assertDistributionTokenTrust(distributionId: string, phase: "funding" | "claim") {
  const [row] = await getDb().select({
    distributionId: distributions.id,
    projectId: distributions.projectId,
    token: tokens,
  }).from(distributions).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(distributions.id, distributionId)).limit(1);
  if (!row) throw new ApiError(404, "DISTRIBUTION_NOT_FOUND", "This distribution was not found.");
  const review = await reviewTokenRecord(row.token, { phase, projectId: row.projectId, force: phase === "funding" });
  if (review.status === "changed") {
    await pauseForControlDrift(row.token.id, distributionId);
    throw new ApiError(409, "TOKEN_CONTROL_DRIFT", "This token's contract controls changed after approval. The project must review and acknowledge the new contract state before value can move.", {
      tokenId: row.token.id,
      symbol: row.token.symbol,
      changedFields: review.changedFields,
      currentReviewDigest: review.current.reviewDigest,
    });
  }
  return review;
}

export async function recheckProjectToken(projectId: string, tokenId: string, actorId: string) {
  const token = await projectCanAccessToken(projectId, tokenId);
  return reviewTokenRecord(token, { phase: "manual", projectId, actorId, force: true });
}

export async function acknowledgeProjectToken(projectId: string, tokenId: string, actorId: string) {
  const token = await projectCanAccessToken(projectId, tokenId);
  const review = await reviewTokenRecord(token, { phase: "manual", projectId, actorId, force: true });
  const db = getDb();
  const refreshed = await db.query.tokens.findFirst({ where: eq(tokens.id, tokenId) });
  if (!refreshed) throw new ApiError(404, "TOKEN_NOT_FOUND", "This token record no longer exists.");
  const metadata = refreshed.metadata as Record<string, unknown>;
  const history = Array.isArray(metadata.trustHistory) ? metadata.trustHistory : [];
  const acknowledgement = {
    phase: "manual",
    status: "acknowledged",
    currentReviewDigest: review.current.reviewDigest,
    currentControlDigest: review.current.controlDigest,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: actorId,
  };
  await db.update(tokens).set({
    metadata: { ...metadata, approvedTrust: review.current, trustStatus: "stable", trustHistory: [acknowledgement, ...history].slice(0, 24) },
    updatedAt: new Date(),
  }).where(eq(tokens.id, tokenId));
  const paused = await db.query.distributions.findMany({
    where: and(eq(distributions.projectId, projectId), eq(distributions.tokenId, tokenId), eq(distributions.status, "paused")),
  });
  let resumedCampaigns = 0;
  for (const distribution of paused) {
    const distributionMetadata = distribution.metadata as Record<string, unknown>;
    if (distributionMetadata.trustPauseReason !== "token-control-drift") continue;
    await db.update(distributions).set({
      status: "active",
      metadata: { ...distributionMetadata, trustPauseReason: null, trustResumedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).where(eq(distributions.id, distribution.id));
    resumedCampaigns += 1;
  }
  await db.insert(auditEvents).values({
    actorType: "user", actorId, projectId, action: "token.trust_acknowledged",
    resourceType: "token", resourceId: tokenId, metadata: { ...acknowledgement, resumedCampaigns },
  });
  return { ...review, status: "stable" as const, changedFields: [], acknowledged: true, resumedCampaigns };
}

export async function tokenTrustWorkspace(projectId: string) {
  const db = getDb();
  const linked = await db.select({ token: tokens, distributionId: distributions.id, distributionStatus: distributions.status })
    .from(distributions).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(distributions.projectId, projectId)).orderBy(desc(distributions.createdAt));
  const owned = await db.query.tokens.findMany({ where: eq(tokens.projectId, projectId), orderBy: [desc(tokens.updatedAt)] });
  const records = new Map<string, { token: TokenRow; campaigns: number; activeCampaigns: number }>();
  for (const token of owned) records.set(token.id, { token, campaigns: 0, activeCampaigns: 0 });
  for (const row of linked) {
    const record = records.get(row.token.id) ?? { token: row.token, campaigns: 0, activeCampaigns: 0 };
    record.campaigns += 1;
    if (["awaiting_funding", "active", "paused"].includes(row.distributionStatus)) record.activeCampaigns += 1;
    records.set(row.token.id, record);
  }
  const assets = [...records.values()].map(({ token, campaigns, activeCampaigns }) => {
    const metadata = token.metadata as Record<string, unknown>;
    const current = storedTrust(metadata.trust);
    const approved = storedTrust(metadata.approvedTrust) ?? current;
    const changedFields = current && approved ? compareTokenControls(approved, current) : [];
    const inspectedAt = current ? new Date(current.inspectedAt).getTime() : 0;
    const stale = !current || current.schemaVersion !== "1.1" || !Number.isFinite(inspectedAt) || Date.now() - inspectedAt > REVIEW_FRESHNESS_MS;
    return {
      tokenId: token.id, address: token.contractAddress, symbol: token.symbol, name: token.name, verified: token.verified,
      status: changedFields.length ? "changed" as const : stale ? "stale" as const : "stable" as const,
      changedFields, campaigns, activeCampaigns,
      current: current ? { posture: current.posture, reviewDigest: current.reviewDigest, controlDigest: current.controlDigest ?? null, inspectedAt: current.inspectedAt, explorerUrl: current.explorerUrl, signals: current.signals } : null,
      approved: approved ? { reviewDigest: approved.reviewDigest, controlDigest: approved.controlDigest ?? null, inspectedAt: approved.inspectedAt } : null,
      history: Array.isArray(metadata.trustHistory) ? metadata.trustHistory.slice(0, 8) : [],
    };
  });
  return {
    schemaVersion: "current-token-monitor-v1",
    network: "ARC-TESTNET",
    policy: { freshnessSeconds: REVIEW_FRESHNESS_MS / 1_000, enforcementPoints: ["funding", "claim-authorization", "scheduled-review"] },
    totals: {
      assets: assets.length,
      stable: assets.filter((asset) => asset.status === "stable").length,
      changed: assets.filter((asset) => asset.status === "changed").length,
      stale: assets.filter((asset) => asset.status === "stale").length,
      protectedCampaigns: assets.reduce((sum, asset) => sum + asset.activeCampaigns, 0),
    },
    assets,
  };
}

export async function monitorDistributionTokens() {
  const rows = await getDb().select({ token: tokens, projectId: distributions.projectId })
    .from(distributions).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(inArray(distributions.status, [...ACTIVE_STATES])).limit(100);
  const unique = new Map(rows.map((row) => [row.token.id, row]));
  const results = [];
  for (const row of [...unique.values()].slice(0, 12)) {
    try {
      const review = await reviewTokenRecord(row.token, { phase: "scheduled", projectId: row.projectId, force: true });
      if (review.status === "changed") await pauseForControlDrift(row.token.id);
      results.push({ tokenId: row.token.id, symbol: row.token.symbol, status: review.status, changedFields: review.changedFields });
    } catch (error) {
      results.push({ tokenId: row.token.id, symbol: row.token.symbol, status: "unavailable", changedFields: [], error: error instanceof Error ? error.message : "Review failed" });
    }
  }
  return { checkedAt: new Date().toISOString(), checked: results.length, changed: results.filter((item) => item.status === "changed").length, results };
}
