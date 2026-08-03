import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getAddress, isAddress } from "viem";
import type { AuthenticatedDeveloperKey } from "../developer/keys.js";
import { boundIdentityHash, type IdentityBindingType } from "../claims/identity-binding.js";
import { getDb } from "../db/client.js";
import { allocations, auditEvents, distributions, identityAttestations } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";

export type ClaimCondition = {
  eventType: string;
  label: string;
  description: string;
  proofWindowMinutes: number;
};

type ConditionProofInput = {
  externalEventId?: unknown;
  distributionId?: unknown;
  eventType?: unknown;
  identityType?: unknown;
  identity?: unknown;
  walletAddress?: unknown;
  expiresInMinutes?: unknown;
  evidence?: unknown;
};

const identityTypes = new Set<IdentityBindingType>(["email", "wallet", "x", "game", "custom"]);
const eventPattern = /^[a-z][a-z0-9_.-]{2,99}$/i;

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, "INVALID_CLAIM_CONDITION", `${field} is required and invalid.`);
  }
  return value.trim();
}

function safeEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(["method", "provider", "verifiedAt", "scope", "reference"]);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    allowed.has(key) && typeof item === "string" && item.length <= 160 ? [[key, item]] : []));
}

export function parseClaimCondition(value: unknown): ClaimCondition | null {
  if (!value || value === false) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_CLAIM_CONDITION", "claimCondition must be an object or omitted.");
  }
  const record = value as Record<string, unknown>;
  if (record.enabled === false) return null;
  const eventType = requiredString(record.eventType, "claimCondition.eventType", 100).toLowerCase();
  if (!eventPattern.test(eventType)) {
    throw new ApiError(400, "INVALID_CLAIM_CONDITION", "Claim-condition events need a stable dotted identifier.");
  }
  const label = requiredString(record.label ?? eventType, "claimCondition.label", 80);
  const description = typeof record.description === "string" ? record.description.trim().slice(0, 240) : "Complete the verified project action before claiming.";
  const proofWindowMinutes = Math.round(Number(record.proofWindowMinutes ?? 60));
  if (!Number.isFinite(proofWindowMinutes) || proofWindowMinutes < 5 || proofWindowMinutes > 24 * 60) {
    throw new ApiError(400, "INVALID_CLAIM_CONDITION", "The proof window must be between 5 minutes and 24 hours.");
  }
  return { eventType, label, description, proofWindowMinutes };
}

export async function createClaimConditionProof(key: AuthenticatedDeveloperKey, input: ConditionProofInput) {
  const distributionId = requiredString(input.distributionId, "distributionId", 80);
  const externalEventId = requiredString(input.externalEventId, "externalEventId", 160);
  const eventType = requiredString(input.eventType, "eventType", 100).toLowerCase();
  const identityType = requiredString(input.identityType, "identityType", 20).toLowerCase() as IdentityBindingType;
  const identity = requiredString(input.identity, "identity", 320);
  const rawWalletAddress = requiredString(input.walletAddress, "walletAddress", 80);
  if (!eventPattern.test(eventType)) throw new ApiError(400, "INVALID_EVENT_TYPE", "eventType must use a stable dotted identifier.");
  if (!identityTypes.has(identityType)) throw new ApiError(400, "INVALID_IDENTITY_TYPE", "Use email, wallet, X, game, or custom identity proof.");
  if (!isAddress(rawWalletAddress)) throw new ApiError(400, "INVALID_WALLET", "walletAddress must be an Arc EVM address.");
  const walletAddress = getAddress(rawWalletAddress).toLowerCase();
  const allowedTypes = Array.isArray(key.policies.allowedIdentityTypes) ? key.policies.allowedIdentityTypes.map(String) : [];
  if (allowedTypes.length && !allowedTypes.includes(identityType)) throw new ApiError(403, "IDENTITY_TYPE_BLOCKED", "This key cannot verify that identity type.");
  const allowedEvents = Array.isArray(key.policies.allowedEventTypes) ? key.policies.allowedEventTypes.map(String) : [];
  if (allowedEvents.length && !allowedEvents.includes(eventType)) throw new ApiError(403, "EVENT_TYPE_BLOCKED", "This key cannot verify that condition event.");

  const identityHash = await boundIdentityHash(identityType, identity);
  const [row] = await getDb().select({
    allocationId: allocations.id,
    allocationStatus: allocations.status,
    projectId: distributions.projectId,
    rules: distributions.rules,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .where(and(
      eq(distributions.id, distributionId),
      eq(distributions.projectId, key.projectId),
      eq(allocations.identityType, identityType),
      eq(allocations.identityHash, identityHash),
    ))
    .limit(1);
  if (!row) throw new ApiError(404, "CONDITION_ALLOCATION_NOT_FOUND", "No matching campaign recipient exists for this proof.");
  const condition = parseClaimCondition((row.rules as Record<string, unknown>).claimCondition);
  if (!condition) throw new ApiError(409, "CLAIM_CONDITION_NOT_CONFIGURED", "This campaign does not require a pre-claim condition.");
  if (condition.eventType !== eventType) throw new ApiError(409, "CLAIM_CONDITION_MISMATCH", `This campaign requires ${condition.eventType}.`);
  if (!["available", "authorizing"].includes(row.allocationStatus)) throw new ApiError(409, "CONDITION_ALLOCATION_UNAVAILABLE", "This recipient allocation is no longer claimable.");

  const existing = await getDb().query.identityAttestations.findFirst({
    where: and(eq(identityAttestations.projectId, key.projectId), eq(identityAttestations.externalEventId, externalEventId)),
  });
  if (existing) {
    const metadata = existing.metadata as Record<string, unknown>;
    if (existing.allocationId !== row.allocationId || existing.walletAddress !== walletAddress || metadata.eventType !== eventType || metadata.kind !== "claim-condition") {
      throw new ApiError(409, "CONDITION_IDEMPOTENCY_CONFLICT", "externalEventId was already used for another proof.");
    }
    return {
      id: existing.id,
      duplicate: true,
      status: existing.consumedAt ? "consumed" : existing.expiresAt <= new Date() ? "expired" : "verified",
      distributionId,
      allocationId: row.allocationId,
      eventType,
      walletAddress,
      expiresAt: existing.expiresAt.toISOString(),
    };
  }

  const requestedMinutes = Math.round(Number(input.expiresInMinutes ?? condition.proofWindowMinutes));
  const expiresInMinutes = Math.min(Math.max(Number.isFinite(requestedMinutes) ? requestedMinutes : condition.proofWindowMinutes, 5), condition.proofWindowMinutes);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);
  const created = (await getDb().insert(identityAttestations).values({
    projectId: key.projectId,
    distributionId,
    allocationId: row.allocationId,
    verifierKeyId: key.id,
    identityType,
    identityHash,
    walletAddress,
    externalEventId,
    expiresAt,
    metadata: { kind: "claim-condition", eventType, label: condition.label, evidence: safeEvidence(input.evidence) },
  }).onConflictDoNothing({ target: [identityAttestations.projectId, identityAttestations.externalEventId] })
    .returning({ id: identityAttestations.id, createdAt: identityAttestations.createdAt }))[0];
  if (!created) throw new ApiError(409, "CONDITION_IDEMPOTENCY_CONFLICT", "The condition proof could not be created idempotently.");
  await getDb().insert(auditEvents).values({
    actorType: "api_key", actorId: key.id, projectId: key.projectId,
    action: "claim.condition-verified", resourceType: "allocation", resourceId: row.allocationId,
    metadata: { distributionId, eventType, walletAddress, expiresAt: expiresAt.toISOString() },
  });
  await queueWebhookEvent(key.projectId, "claim.condition-verified", {
    proofId: created.id, distributionId, allocationId: row.allocationId, eventType, walletAddress, expiresAt: expiresAt.toISOString(),
  });
  await deliverQueuedWebhooks(10);
  return {
    id: created.id,
    duplicate: false,
    status: "verified" as const,
    distributionId,
    allocationId: row.allocationId,
    eventType,
    walletAddress,
    expiresAt: expiresAt.toISOString(),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function activeClaimConditionProof(input: { allocationId: string; walletAddress: string; eventType: string }) {
  const rows = await getDb().select().from(identityAttestations).where(and(
    eq(identityAttestations.allocationId, input.allocationId),
    eq(identityAttestations.walletAddress, input.walletAddress.toLowerCase()),
    isNull(identityAttestations.consumedAt),
    gt(identityAttestations.expiresAt, new Date()),
  )).orderBy(desc(identityAttestations.createdAt)).limit(20);
  return rows.find((row) => {
    const metadata = row.metadata as Record<string, unknown>;
    return metadata.kind === "claim-condition" && metadata.eventType === input.eventType;
  }) ?? null;
}

export async function consumeClaimConditionProof(id: string) {
  await getDb().update(identityAttestations).set({ consumedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(identityAttestations.id, id), isNull(identityAttestations.consumedAt)));
}
