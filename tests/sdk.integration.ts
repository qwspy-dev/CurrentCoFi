import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Current, CurrentError, verifyCurrentWebhook } from "../packages/sdk/src/index.js";

const apiKey = "current_test_sdk";
const signingSecret = "sdk_signing_secret";
const requests: Array<{ url: string; init?: RequestInit }> = [];

const mockFetch: typeof fetch = async (input, init) => {
  requests.push({ url: String(input), init });
  if (String(input).endsWith("/developer/distributions")) {
    return Response.json({
      ok: true,
      data: {
        id: "dist_sdk",
        status: "awaiting_funding",
        name: "SDK proof",
        asset: { address: "0x01", symbol: "USDC", name: "USD Coin", decimals: 6 },
        recipientCount: 1,
        totalAmount: "25.00",
        totalAmountAtomic: "25000000",
        merkleRoot: "0xroot",
        claimMode: "identity-bound",
        expiresAt: "2026-08-14T00:00:00.000Z",
        links: [],
      },
    }, { status: 201 });
  }
  if (String(input).endsWith("/developer/activations")) {
    return Response.json({ ok: true, data: { duplicate: false, status: "accepted" } });
  }
  if (String(input).endsWith("/developer/identity-attestations")) {
    return Response.json({
      ok: true,
      data: {
        id: "attestation_sdk",
        duplicate: false,
        status: "verified",
        identityType: "x",
        walletAddress: "0x1111111111111111111111111111111111111111",
        expiresAt: "2026-08-14T00:30:00.000Z",
      },
    }, { status: 201 });
  }
  if (String(input).endsWith("/developer/analytics")) {
    return Response.json({
      ok: true,
      data: { totals: { campaigns: 1, recipients: 1, claims: 0, activations: 0 }, campaigns: [] },
    });
  }
  return Response.json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Missing test route." },
    meta: { requestId: "req_test", timestamp: new Date().toISOString(), version: "v1" },
  }, { status: 404 });
};

const current = new Current({
  apiKey,
  signingSecret,
  baseUrl: "https://current.test",
  fetch: mockFetch,
});

const distribution = await current.distributions.create({
  name: "SDK proof",
  recipients: [{ identityType: "email", identity: "builder@example.com", amount: "25.00" }],
  mode: "identity-bound",
});
assert.equal(distribution.id, "dist_sdk");
assert.equal(distribution.claimMode, "identity-bound");
const signedRequest = requests.at(-1);
assert.ok(signedRequest);
assert.equal(signedRequest.url, "https://current.test/api/v1/developer/distributions");
assert.equal(new Headers(signedRequest.init?.headers).get("authorization"), `Bearer ${apiKey}`);
const timestamp = new Headers(signedRequest.init?.headers).get("x-current-timestamp");
const suppliedSignature = new Headers(signedRequest.init?.headers).get("x-current-signature");
assert.ok(timestamp);
assert.ok(suppliedSignature);
assert.equal(JSON.parse(String(signedRequest.init?.body)).mode, "identity-bound");
const expectedSignature = createHmac("sha256", signingSecret)
  .update(`${timestamp}.${signedRequest.init?.body}`)
  .digest("base64url");
assert.equal(suppliedSignature, expectedSignature);

const activation = await current.activations.submit({
  externalEventId: "event_1",
  eventType: "game.first_match",
  distributionId: "11111111-1111-1111-1111-111111111111",
  walletAddress: "0x1111111111111111111111111111111111111111",
});
assert.equal(activation.status, "accepted");
const activationBody = JSON.parse(String(requests.at(-1)?.init?.body)) as Record<string, unknown>;
assert.equal(typeof activationBody.occurredAt, "string");
assert.deepEqual(activationBody.payload, {});

const attestation = await current.identities.attest({
  externalEventId: "x-oauth-session-1",
  distributionId: "11111111-1111-1111-1111-111111111111",
  identityType: "x",
  identity: "@currentbuilder",
  walletAddress: "0x1111111111111111111111111111111111111111",
  provider: "x-oauth",
});
assert.equal(attestation.status, "verified");
const attestationRequest = requests.at(-1);
assert.ok(attestationRequest?.url.endsWith("/api/v1/developer/identity-attestations"));
assert.equal(JSON.parse(String(attestationRequest?.init?.body)).identityType, "x");

const analytics = await current.analytics.get();
assert.equal(analytics.totals.campaigns, 1);
assert.equal(
  new Headers(requests.at(-1)?.init?.headers).get("authorization"),
  `Bearer ${apiKey}`,
);

const webhookBody = JSON.stringify({ type: "claim.completed", data: { id: "claim_1" } });
const webhookTimestamp = Date.now().toString();
const webhookSignature = createHmac("sha256", signingSecret)
  .update(`${webhookTimestamp}.${webhookBody}`)
  .digest("base64url");
assert.equal(await verifyCurrentWebhook({
  secret: signingSecret,
  timestamp: webhookTimestamp,
  signature: webhookSignature,
  rawBody: webhookBody,
}), true);
assert.equal(await verifyCurrentWebhook({
  secret: signingSecret,
  timestamp: webhookTimestamp,
  signature: `${webhookSignature}x`,
  rawBody: webhookBody,
}), false);

const failing = new Current({
  apiKey,
  signingSecret,
  fetch: async () => Response.json({
    ok: false,
    error: { code: "SCOPE_REQUIRED", message: "Permission denied." },
    meta: { requestId: "req_denied", timestamp: new Date().toISOString(), version: "v1" },
  }, { status: 403 }),
});
await assert.rejects(
  () => failing.analytics.get(),
  (error: unknown) => error instanceof CurrentError
    && error.code === "SCOPE_REQUIRED"
    && error.requestId === "req_denied",
);

console.log("Current SDK integration checks passed.");
