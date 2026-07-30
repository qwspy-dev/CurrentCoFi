import { and, eq, gt, isNull } from "drizzle-orm";
import { getAddress, isAddress } from "viem";
import type { AuthenticatedDeveloperKey } from "./keys.js";
import { getDb } from "../db/client.js";
import {
  allocations,
  auditEvents,
  distributions,
  identityAttestations,
} from "../db/schema.js";
import { boundIdentityHash } from "../claims/identity-binding.js";
import { ApiError } from "../http.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "./webhooks.js";

type AttestationInput = {
  externalEventId?: unknown;
  distributionId?: unknown;
  identityType?: unknown;
  identity?: unknown;
  walletAddress?: unknown;
  provider?: unknown;
  expiresInMinutes?: unknown;
  evidence?: unknown;
};

const EXTERNAL_IDENTITY_TYPES = new Set(["x", "game", "custom"]);

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, "INVALID_IDENTITY_ATTESTATION", `${field} is required and invalid.`);
  }
  return value.trim();
}

function safeEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const allowed = ["method", "provider", "verifiedAt", "scope"];
  return Object.fromEntries(allowed.flatMap((key) => {
    const item = record[key];
    return typeof item === "string" && item.length <= 160 ? [[key, item]] : [];
  }));
}

export async function createIdentityAttestation(
  key: AuthenticatedDeveloperKey,
  input: AttestationInput,
) {
  const distributionId = requiredString(input.distributionId, "distributionId", 80);
  const externalEventId = requiredString(input.externalEventId, "externalEventId", 160);
  const identityType = requiredString(input.identityType, "identityType", 20).toLowerCase();
  const identity = requiredString(input.identity, "identity", 320);
  const rawWalletAddress = requiredString(input.walletAddress, "walletAddress", 80);
  if (!EXTERNAL_IDENTITY_TYPES.has(identityType)) {
    throw new ApiError(400, "INVALID_IDENTITY_TYPE", "Verifier attestations support X, game, and custom identities.");
  }
  const policyTypes = Array.isArray(key.policies.allowedIdentityTypes)
    ? key.policies.allowedIdentityTypes.map(String)
    : [];
  if (policyTypes.length && !policyTypes.includes(identityType)) {
    throw new ApiError(403, "IDENTITY_TYPE_BLOCKED", "This key is not permitted to verify that identity type.");
  }
  if (!isAddress(rawWalletAddress)) {
    throw new ApiError(400, "INVALID_WALLET", "walletAddress must be an Arc EVM address.");
  }
  const walletAddress = getAddress(rawWalletAddress).toLowerCase();
  const identityHash = await boundIdentityHash(identityType as "x" | "game" | "custom", identity);
  const [allocation] = await getDb().select({
    id: allocations.id,
    distributionId: distributions.id,
    projectId: distributions.projectId,
    status: allocations.status,
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
  if (!allocation) {
    throw new ApiError(404, "IDENTITY_ALLOCATION_NOT_FOUND", "No matching identity allocation exists in this project campaign.");
  }
  if ((allocation.rules as Record<string, unknown>).claimMode !== "identity-bound") {
    throw new ApiError(409, "CAMPAIGN_NOT_IDENTITY_BOUND", "Verifier attestations require an identity-bound campaign.");
  }
  if (allocation.status !== "available" && allocation.status !== "authorizing") {
    throw new ApiError(409, "IDENTITY_ALLOCATION_UNAVAILABLE", "This identity allocation is no longer claimable.");
  }
  const expiresInMinutes = Math.min(Math.max(Math.round(Number(input.expiresInMinutes ?? 30)), 5), 24 * 60);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1_000);
  const existing = await getDb().query.identityAttestations.findFirst({
    where: and(
      eq(identityAttestations.projectId, key.projectId),
      eq(identityAttestations.externalEventId, externalEventId),
    ),
  });
  if (existing) {
    const sameRequest = existing.allocationId === allocation.id &&
      existing.identityHash === identityHash &&
      existing.walletAddress === walletAddress;
    if (!sameRequest) {
      throw new ApiError(409, "ATTESTATION_IDEMPOTENCY_CONFLICT", "externalEventId was already used for a different verification.");
    }
    return {
      id: existing.id,
      duplicate: true,
      status: existing.consumedAt ? "consumed" : existing.expiresAt <= new Date() ? "expired" : "verified",
      identityType: existing.identityType,
      walletAddress: existing.walletAddress,
      expiresAt: existing.expiresAt.toISOString(),
    };
  }
  const [created] = await getDb().insert(identityAttestations).values({
    projectId: key.projectId,
    distributionId,
    allocationId: allocation.id,
    verifierKeyId: key.id,
    identityType,
    identityHash,
    walletAddress,
    externalEventId,
    expiresAt,
    metadata: {
      provider: typeof input.provider === "string" ? input.provider.slice(0, 80) : "project-verifier",
      evidence: safeEvidence(input.evidence),
    },
  }).onConflictDoNothing({
    target: [identityAttestations.projectId, identityAttestations.externalEventId],
  }).returning({ id: identityAttestations.id, createdAt: identityAttestations.createdAt });
  if (!created) {
    const raced = await getDb().query.identityAttestations.findFirst({
      where: and(
        eq(identityAttestations.projectId, key.projectId),
        eq(identityAttestations.externalEventId, externalEventId),
      ),
    });
    if (
      raced &&
      raced.allocationId === allocation.id &&
      raced.identityHash === identityHash &&
      raced.walletAddress === walletAddress
    ) {
      return {
        id: raced.id,
        duplicate: true,
        status: raced.consumedAt ? "consumed" : raced.expiresAt <= new Date() ? "expired" : "verified",
        identityType: raced.identityType,
        walletAddress: raced.walletAddress,
        expiresAt: raced.expiresAt.toISOString(),
      };
    }
    throw new ApiError(409, "ATTESTATION_IDEMPOTENCY_CONFLICT", "externalEventId was already used for a different verification.");
  }
  await getDb().insert(auditEvents).values({
    actorType: "api_key",
    actorId: key.id,
    projectId: key.projectId,
    action: "identity.attested",
    resourceType: "allocation",
    resourceId: allocation.id,
    metadata: { distributionId, identityType, walletAddress, expiresAt: expiresAt.toISOString() },
  });
  await queueWebhookEvent(key.projectId, "identity.verified", {
    attestationId: created.id,
    distributionId,
    allocationId: allocation.id,
    identityType,
    walletAddress,
    expiresAt: expiresAt.toISOString(),
  });
  await deliverQueuedWebhooks(10);
  return {
    id: created.id,
    duplicate: false,
    status: "verified",
    identityType,
    walletAddress,
    expiresAt: expiresAt.toISOString(),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function activeIdentityAttestation(input: {
  allocationId: string;
  identityType: string;
  walletAddress: string;
}) {
  return getDb().query.identityAttestations.findFirst({
    where: and(
      eq(identityAttestations.allocationId, input.allocationId),
      eq(identityAttestations.identityType, input.identityType),
      eq(identityAttestations.walletAddress, input.walletAddress.toLowerCase()),
      isNull(identityAttestations.consumedAt),
      gt(identityAttestations.expiresAt, new Date()),
    ),
  });
}

export async function consumeIdentityAttestation(attestationId: string) {
  await getDb().update(identityAttestations).set({
    consumedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(identityAttestations.id, attestationId), isNull(identityAttestations.consumedAt)));
}
