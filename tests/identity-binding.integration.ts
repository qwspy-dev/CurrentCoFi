import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  CURRENT_COFI_INTERNAL_SECRET: "test-internal-secret-with-at-least-thirty-two-characters",
  CLAIM_SIGNING_SECRET: "test-claim-secret-with-at-least-thirty-two-characters",
});

const {
  assertSessionMatchesAllocation,
  boundIdentityHash,
  parseCampaignClaimMode,
} = await import("../server/claims/identity-binding.js");

const wallet = "0x1111111111111111111111111111111111111111";
const session = {
  version: 1 as const,
  circleUserId: "circle_user",
  userToken: "token",
  refreshToken: "refresh",
  deviceId: "device",
  provider: "google" as const,
  displayName: "Verified Recipient",
  email: "Member@Example.com",
  wallets: [],
  issuedAt: Date.now(),
};

assert.equal(parseCampaignClaimMode("Identity-bound"), "identity-bound");
assert.equal(parseCampaignClaimMode("allowlist"), "allowlist");
assert.equal(
  await boundIdentityHash("email", " Member@Example.com "),
  await boundIdentityHash("email", "member@example.com"),
  "email commitments must be case-insensitive and whitespace-normalized",
);

const emailProof = await assertSessionMatchesAllocation({
  mode: "identity-bound",
  identityType: "email",
  identityHash: await boundIdentityHash("email", "member@example.com"),
  walletAddress: null,
  session,
  destinationWalletAddress: wallet,
});
assert.deepEqual(emailProof, { required: true, verifiedBy: "email" });

const xIdentityHash = await boundIdentityHash("x", "@current");
await assert.rejects(
  () => assertSessionMatchesAllocation({
    mode: "identity-bound",
    identityType: "email",
    identityHash: "not-the-recipient-commitment",
    walletAddress: null,
    session,
    destinationWalletAddress: wallet,
  }),
);

const walletProof = await assertSessionMatchesAllocation({
  mode: "identity-bound",
  identityType: "wallet",
  identityHash: await boundIdentityHash("wallet", wallet),
  walletAddress: wallet,
  session,
  destinationWalletAddress: wallet,
});
assert.deepEqual(walletProof, { required: true, verifiedBy: "wallet" });

await assert.rejects(
  () => assertSessionMatchesAllocation({
    mode: "identity-bound",
    identityType: "x",
    identityHash: xIdentityHash,
    walletAddress: null,
    session,
    destinationWalletAddress: wallet,
  }),
  (error: unknown) => (error as { code?: string }).code === "IDENTITY_ATTESTATION_REQUIRED",
);

const projectVerifiedProof = await assertSessionMatchesAllocation({
  mode: "identity-bound",
  identityType: "x",
  identityHash: xIdentityHash,
  walletAddress: null,
  session,
  destinationWalletAddress: wallet,
  externalAttestation: {
    id: "11111111-1111-1111-1111-111111111111",
    identityType: "x",
  },
});
assert.deepEqual(projectVerifiedProof, {
  required: true,
  verifiedBy: "project-attestation",
  identityType: "x",
  attestationId: "11111111-1111-1111-1111-111111111111",
});

assert.deepEqual(
  await assertSessionMatchesAllocation({
    mode: "allowlist",
    identityType: "custom",
    identityHash: null,
    walletAddress: null,
    session,
    destinationWalletAddress: wallet,
  }),
  { required: false, verifiedBy: "link-secret" },
);

console.log("Identity-bound claim verification checks passed.");
