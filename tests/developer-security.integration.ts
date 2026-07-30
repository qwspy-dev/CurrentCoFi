import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  CURRENT_COFI_INTERNAL_SECRET: "test-internal-secret-with-at-least-thirty-two-characters",
  CLAIM_SIGNING_SECRET: "test-claim-secret-with-at-least-thirty-two-characters",
});

const {
  constantTimeEqual,
  hmacWithSecret,
  openSecret,
  sealSecret,
} = await import("../server/security/crypto.js");

const original = "whsec_test_secret_that_must_never_be_stored_in_plaintext";
const ciphertext = await sealSecret(original);
assert.notEqual(ciphertext, original, "encrypted credentials must not contain their plaintext value");
assert.equal(await openSecret(ciphertext), original, "encrypted integration credentials must round-trip");

const timestamp = "1785427200000";
const body = JSON.stringify({ type: "activation.completed", data: { campaignId: "campaign_test" } });
const signature = await hmacWithSecret(original, `${timestamp}.${body}`);
assert.equal(constantTimeEqual(signature, await hmacWithSecret(original, `${timestamp}.${body}`)), true);
assert.equal(constantTimeEqual(signature, await hmacWithSecret(original, `${timestamp}.${body}x`)), false);

await assert.rejects(() => openSecret(`${ciphertext}tampered`), /protected integration secret/i);

console.log("Developer credential encryption and HMAC verification passed.");
