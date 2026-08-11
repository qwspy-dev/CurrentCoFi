import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { ApiError } from "../http.js";
import {
  constantTimeEqual,
  hmacWithSecret,
  openSecret,
  randomSecret,
  sealSecret,
  sha256,
} from "../security/crypto.js";

export const developerPermissions = [
  "campaigns:read",
  "campaigns:write",
  "claims:write",
  "identities:write",
  "activations:write",
  "analytics:read",
  "evidence:write",
  "pilots:write",
  "agent-actions:read",
  "agent-actions:write",
  "webhooks:write",
] as const;

export type DeveloperPermission = typeof developerPermissions[number];

type KeyPolicy = {
  dailyEventLimit?: number;
  allowedEventTypes?: string[];
  maxRewardAtomic?: string;
  humanApprovalAtomic?: string;
  allowedIdentityTypes?: string[];
  maxCheckoutAtomic?: string;
  humanApprovalCheckoutAtomic?: string;
  allowProgrammableCheckout?: boolean;
  maxAffiliateBasisPoints?: number;
  maxCustomerRewardBasisPoints?: number;
};

function safePermissions(value: string[]) {
  const allowed = new Set<string>(developerPermissions);
  const unique = [...new Set(value)];
  if (!unique.length || unique.some((permission) => !allowed.has(permission))) {
    throw new ApiError(400, "INVALID_PERMISSIONS", "Choose at least one supported API permission.");
  }
  return unique as DeveloperPermission[];
}

function safePolicies(value: KeyPolicy = {}) {
  const boundedInteger = (input: number | undefined, field: string, fallback: number, minimum: number, maximum: number) => {
    const parsed = Number(input ?? fallback);
    if (!Number.isFinite(parsed)) throw new ApiError(400, "INVALID_AGENT_POLICY", `${field} must be a finite number.`);
    return Math.min(Math.max(Math.round(parsed), minimum), maximum);
  };
  const atomicPolicy = (input: string | undefined, field: string) => {
    if (input === undefined || input === "") return undefined;
    if (!/^\d{1,78}$/.test(input) || BigInt(input) <= BigInt(0)) {
      throw new ApiError(400, "INVALID_AGENT_POLICY", `${field} must be a positive atomic-unit integer.`);
    }
    return input;
  };
  const dailyEventLimit = boundedInteger(value.dailyEventLimit, "dailyEventLimit", 1_000, 1, 100_000);
  const allowedEventTypes = [...new Set((value.allowedEventTypes ?? []).map((item) => item.trim()).filter(Boolean))]
    .slice(0, 50);
  const allowedIdentityTypes = [...new Set(
    (value.allowedIdentityTypes ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean),
  )].filter((item) => ["email", "wallet", "x", "game", "custom"].includes(item)).slice(0, 5);
  return {
    dailyEventLimit,
    allowedEventTypes,
    allowedIdentityTypes,
    allowProgrammableCheckout: value.allowProgrammableCheckout === true,
    maxAffiliateBasisPoints: boundedInteger(value.maxAffiliateBasisPoints, "maxAffiliateBasisPoints", 0, 0, 2_500),
    maxCustomerRewardBasisPoints: boundedInteger(value.maxCustomerRewardBasisPoints, "maxCustomerRewardBasisPoints", 0, 0, 2_500),
    ...(atomicPolicy(value.maxRewardAtomic, "maxRewardAtomic")
      ? { maxRewardAtomic: atomicPolicy(value.maxRewardAtomic, "maxRewardAtomic") }
      : {}),
    ...(atomicPolicy(value.humanApprovalAtomic, "humanApprovalAtomic")
      ? { humanApprovalAtomic: atomicPolicy(value.humanApprovalAtomic, "humanApprovalAtomic") }
      : {}),
    ...(atomicPolicy(value.maxCheckoutAtomic, "maxCheckoutAtomic")
      ? { maxCheckoutAtomic: atomicPolicy(value.maxCheckoutAtomic, "maxCheckoutAtomic") }
      : {}),
    ...(atomicPolicy(value.humanApprovalCheckoutAtomic, "humanApprovalCheckoutAtomic")
      ? { humanApprovalCheckoutAtomic: atomicPolicy(value.humanApprovalCheckoutAtomic, "humanApprovalCheckoutAtomic") }
      : {}),
  };
}

export async function listDeveloperKeys(projectId: string) {
  const rows = await getDb().select({
    id: apiKeys.id,
    name: apiKeys.name,
    prefix: apiKeys.prefix,
    kind: apiKeys.kind,
    permissions: apiKeys.permissions,
    policies: apiKeys.policies,
    lastUsedAt: apiKeys.lastUsedAt,
    expiresAt: apiKeys.expiresAt,
    revokedAt: apiKeys.revokedAt,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys).where(eq(apiKeys.projectId, projectId)).orderBy(desc(apiKeys.createdAt));
  return rows.map((row) => ({
    ...row,
    status: row.revokedAt ? "revoked" : row.expiresAt && row.expiresAt <= new Date() ? "expired" : "active",
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createDeveloperKey(input: {
  projectId: string;
  name: string;
  kind?: "project" | "agent";
  permissions?: string[];
  policies?: KeyPolicy;
  expiresInDays?: number;
}) {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new ApiError(400, "INVALID_KEY_NAME", "API key name is required.");
  const kind = input.kind === "agent" ? "agent" : "project";
  const permissions = safePermissions(input.permissions?.length
    ? input.permissions
    : kind === "agent"
      ? ["campaigns:read", "claims:write", "activations:write", "analytics:read", "evidence:write", "pilots:write", "agent-actions:read", "agent-actions:write"]
      : [...developerPermissions]);
  const prefix = `cofi_test_${randomSecret(6)}`;
  const token = `${prefix}.${randomSecret(32)}`;
  const signingSecret = randomSecret(32);
  const expiresInDays = Math.min(Math.max(Math.round(Number(input.expiresInDays ?? 90)), 1), 365);
  const [created] = await getDb().insert(apiKeys).values({
    projectId: input.projectId,
    name,
    prefix,
    secretHash: await sha256(token),
    signingSecretCiphertext: await sealSecret(signingSecret),
    kind,
    permissions,
    policies: safePolicies(input.policies),
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1_000),
  }).returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });
  return {
    id: created.id,
    name,
    kind,
    prefix,
    token,
    signingSecret,
    permissions,
    policies: safePolicies(input.policies),
    createdAt: created.createdAt.toISOString(),
    warning: "The API key and signing secret are shown once. Store both securely.",
  };
}

export async function revokeDeveloperKey(projectId: string, keyId: string) {
  const rows = await getDb().update(apiKeys).set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  if (!rows.length) throw new ApiError(404, "KEY_NOT_FOUND", "This API key is unavailable or already revoked.");
  return { id: rows[0].id, status: "revoked" };
}

export type AuthenticatedDeveloperKey = {
  id: string;
  projectId: string;
  kind: string;
  permissions: string[];
  policies: Record<string, unknown>;
  signingSecret: string;
};

export async function authenticateDeveloperKey(request: Request): Promise<AuthenticatedDeveloperKey> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const separator = token.indexOf(".");
  const prefix = separator > 0 ? token.slice(0, separator) : "";
  if (!prefix || !token) throw new ApiError(401, "API_KEY_REQUIRED", "Provide a Current CoFi API key.");
  const row = await getDb().query.apiKeys.findFirst({
    where: and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)),
  });
  if (
    !row ||
    (row.expiresAt && row.expiresAt <= new Date()) ||
    !constantTimeEqual(row.secretHash, await sha256(token))
  ) {
    throw new ApiError(401, "INVALID_API_KEY", "This API key is invalid, expired, or revoked.");
  }
  await getDb().update(apiKeys).set({ lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(apiKeys.id, row.id));
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    permissions: row.permissions,
    policies: row.policies,
    signingSecret: await openSecret(row.signingSecretCiphertext),
  };
}

export function requireDeveloperPermission(key: AuthenticatedDeveloperKey, permission: DeveloperPermission) {
  if (!key.permissions.includes(permission)) {
    throw new ApiError(403, "MISSING_PERMISSION", `This key does not include ${permission}.`);
  }
}

export async function verifySignedDeveloperRequest(
  request: Request,
  key: AuthenticatedDeveloperKey,
  rawBody: string,
) {
  const timestamp = request.headers.get("x-current-timestamp") ?? "";
  const signature = request.headers.get("x-current-signature") ?? "";
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1_000) {
    throw new ApiError(401, "STALE_SIGNATURE", "Signed requests must use a timestamp within five minutes.");
  }
  const expected = await hmacWithSecret(key.signingSecret, `${timestamp}.${rawBody}`);
  if (!signature || !constantTimeEqual(expected, signature)) {
    throw new ApiError(401, "INVALID_SIGNATURE", "The request signature could not be verified.");
  }
}
