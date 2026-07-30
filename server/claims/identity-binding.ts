import { getAddress, isAddress } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { ApiError } from "../http.js";
import { sha256 } from "../security/crypto.js";

export type IdentityBindingType = "email" | "wallet" | "x" | "game" | "custom" | "secret";
export type CampaignClaimMode = "allowlist" | "identity-bound";

export const LIVE_IDENTITY_BINDING_TYPES = new Set<IdentityBindingType>(["email", "wallet"]);

export function parseCampaignClaimMode(value: unknown): CampaignClaimMode {
  if (value === undefined || value === null || value === "" || value === "Allowlist" || value === "allowlist") {
    return "allowlist";
  }
  if (value === "Identity-bound" || value === "identity-bound") return "identity-bound";
  throw new ApiError(400, "INVALID_CLAIM_MODE", "Claim mode must be allowlist or identity-bound.");
}

export function normalizeBoundIdentity(type: IdentityBindingType, identity: string) {
  const value = identity.trim();
  if (!value || value.length > 320) {
    throw new ApiError(400, "INVALID_RECIPIENT", "Every recipient needs a valid identity.");
  }
  if (type === "email") {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "INVALID_RECIPIENT", `Invalid email recipient: ${value}`);
    }
    return email;
  }
  if (type === "wallet") {
    if (!isAddress(value)) throw new ApiError(400, "INVALID_RECIPIENT", `Invalid wallet recipient: ${value}`);
    return getAddress(value).toLowerCase();
  }
  return value.toLowerCase();
}

export async function boundIdentityHash(type: IdentityBindingType, identity: string) {
  return sha256(`${type}:${normalizeBoundIdentity(type, identity)}`);
}

export async function assertSessionMatchesAllocation(input: {
  mode: CampaignClaimMode;
  identityType: IdentityBindingType;
  identityHash: string | null;
  walletAddress: string | null;
  session: CurrentSession;
  destinationWalletAddress: string;
  externalAttestation?: {
    id: string;
    identityType: "x" | "game" | "custom";
  } | null;
}) {
  if (input.mode !== "identity-bound") return { required: false as const, verifiedBy: "link-secret" as const };
  if (!LIVE_IDENTITY_BINDING_TYPES.has(input.identityType)) {
    if (
      ["x", "game", "custom"].includes(input.identityType) &&
      input.externalAttestation?.identityType === input.identityType
    ) {
      return {
        required: true as const,
        verifiedBy: "project-attestation" as const,
        identityType: input.identityType,
        attestationId: input.externalAttestation.id,
      };
    }
    throw new ApiError(409, "IDENTITY_ATTESTATION_REQUIRED", `Verify your ${input.identityType.toUpperCase()} identity with this project before claiming.`);
  }
  if (!input.identityHash) {
    throw new ApiError(409, "IDENTITY_BINDING_INVALID", "This claim is missing its identity commitment.");
  }

  const suppliedIdentity = input.identityType === "email"
    ? input.session.email
    : input.destinationWalletAddress;
  if (!suppliedIdentity) {
    throw new ApiError(
      403,
      "IDENTITY_SIGN_IN_REQUIRED",
      input.identityType === "email"
        ? "Sign in with the email address this reward was assigned to."
        : "Use the Arc wallet this reward was assigned to.",
    );
  }
  const suppliedHash = await boundIdentityHash(input.identityType, suppliedIdentity);
  if (suppliedHash !== input.identityHash) {
    throw new ApiError(
      403,
      "IDENTITY_MISMATCH",
      input.identityType === "email"
        ? "This reward belongs to a different verified email address."
        : "This reward belongs to a different Arc wallet.",
    );
  }
  if (
    input.identityType === "wallet" &&
    input.walletAddress?.toLowerCase() !== input.destinationWalletAddress.toLowerCase()
  ) {
    throw new ApiError(403, "IDENTITY_MISMATCH", "This reward belongs to a different Arc wallet.");
  }
  return { required: true as const, verifiedBy: input.identityType };
}
