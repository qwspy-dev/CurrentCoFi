import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  CURRENT_COFI_INTERNAL_SECRET: "identity-access-test-secret-with-more-than-thirty-two-characters",
  CLAIM_SIGNING_SECRET: "identity-access-claim-secret-with-more-than-thirty-two-characters",
  CIRCLE_API_KEY: "circle-test-key",
  CIRCLE_APP_ID: "circle-test-app",
  CIRCLE_EMAIL_OTP_ENABLED: "true",
  FACEBOOK_APP_ID: "facebook-app",
  APPLE_FIREBASE_API_KEY: "firebase-key",
  APPLE_FIREBASE_AUTH_DOMAIN: "current.test",
  APPLE_FIREBASE_PROJECT_ID: "current-project",
  APPLE_FIREBASE_APP_ID: "firebase-app",
  X_OAUTH_CLIENT_ID: "x-client",
  X_OAUTH_CLIENT_SECRET: "x-secret",
  DISCORD_OAUTH_CLIENT_ID: "discord-client",
  DISCORD_OAUTH_CLIENT_SECRET: "discord-secret",
  TELEGRAM_BOT_USERNAME: "current_test_bot",
  TELEGRAM_BOT_TOKEN: "123456:test-token",
});

const { getPublicConfig } = await import("../server/config.js");
const { createExternalAuthorization, externalIdentityAvailability } = await import("../server/auth/external-identities.js");
const { openSecret } = await import("../server/security/crypto.js");
const { default: sessionEndpoint } = await import("../api/v1/auth/session.js");

const publicConfig = getPublicConfig();
assert.equal(publicConfig.capabilities.emailLogin, true);
assert.equal(publicConfig.capabilities.appleLogin, true);
assert.equal(publicConfig.capabilities.facebookLogin, true);
assert.equal(publicConfig.capabilities.externalIdentityLinking, true);
assert.deepEqual(externalIdentityAvailability(), { x: true, discord: true, telegram: true });

const signedOutResponse = await sessionEndpoint.fetch(new Request("https://www.currentco.finance/api/v1/auth/session"));
const signedOutPayload = await signedOutResponse.json();
assert.equal(signedOutResponse.status, 200);
assert.deepEqual(signedOutPayload.data, { authenticated: false });

const session = {
  version: 1 as const,
  circleUserId: "circle-user",
  userToken: "user-token",
  refreshToken: "refresh-token",
  deviceId: "device-id",
  provider: "email" as const,
  displayName: "Current member",
  email: "member@example.com",
  wallets: [],
  accountId: "11111111-1111-1111-1111-111111111111",
  issuedAt: Date.now(),
};

for (const provider of ["x", "discord"] as const) {
  const authorizeUrl = new URL(await createExternalAuthorization(
    new Request("https://www.currentco.finance/api/v1/auth/identities"),
    session,
    provider,
  ));
  assert.equal(authorizeUrl.searchParams.get("client_id"), `${provider}-client`);
  assert.equal(authorizeUrl.searchParams.get("redirect_uri"), `https://www.currentco.finance/api/v1/auth/identities/callback?provider=${provider}`);
  assert.equal(authorizeUrl.searchParams.get("response_type"), "code");
  const stateValue = authorizeUrl.searchParams.get("state");
  assert.ok(stateValue);
  assert.ok(!stateValue.includes(session.accountId), "OAuth state must not expose the Current account ID");
  const state = JSON.parse(await openSecret(stateValue));
  assert.equal(state.provider, provider);
  assert.equal(state.userId, session.accountId);
  assert.ok(typeof state.verifier === "string" && state.verifier.length > 40);
  if (provider === "x") {
    assert.equal(authorizeUrl.searchParams.get("code_challenge_method"), "S256");
    assert.ok(authorizeUrl.searchParams.get("code_challenge"));
  }
}

await assert.rejects(
  () => createExternalAuthorization(new Request("https://www.currentco.finance"), session, "telegram"),
  (error: unknown) => (error as { code?: string }).code === "INVALID_IDENTITY_PROVIDER",
);

console.log("Identity access provider and OAuth boundary checks passed.");
