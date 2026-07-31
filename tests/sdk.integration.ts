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
  if (String(input).endsWith("/developer/funding")) {
    return Response.json({
      ok: true,
      data: {
        catalog: {
          sourceChains: [{ code: "BASE-SEPOLIA", label: "Base Sepolia", domain: 6, usdcAddress: "0xsource" }],
          destination: { code: "ARC-TESTNET", domain: 26, usdcAddress: "0xarc" },
          transport: "CCTP V2 Standard + Forwarding Service",
        },
        intents: [{
          id: "funding_sdk",
          distributionId: "dist_sdk",
          sourceChain: "BASE-SEPOLIA",
          destinationChain: "ARC-TESTNET",
          amountAtomic: "25000000",
          status: "arc_arrived",
          sourceTransactionHash: "0xburn",
          destinationTransactionHash: "0xmint",
          campaignFundingTransactionHash: null,
          stages: [],
          createdAt: "2026-08-14T00:00:00.000Z",
          updatedAt: "2026-08-14T00:05:00.000Z",
        }],
      },
    });
  }
  if (String(input).endsWith("/developer/gateway")) {
    return Response.json({
      ok: true,
      data: {
        catalog: {
          sourceChains: [{ code: "BASE-SEPOLIA", label: "Base Sepolia", domain: 6, usdcAddress: "0xsource" }],
          destination: { code: "ARC-TESTNET", domain: 26, usdcAddress: "0xarc" },
          transport: "Circle Gateway Unified Balance + Direct Mint",
          signerRequirement: "EOA",
          maxFeeAtomic: "2010000",
        },
        intents: [{
          id: "gateway_sdk",
          distributionId: "dist_sdk",
          sourceChain: "BASE-SEPOLIA",
          destinationAddress: "0xarcwallet",
          sourceWalletAddress: "0xeoa",
          amountAtomic: "25000000",
          maxFeeAtomic: "2010000",
          status: "arc_arrived",
          depositTransactionHash: "0xdeposit",
          transferId: "transfer_sdk",
          mintTransactionHash: "0xgatewaymint",
          campaignFundingTransactionHash: null,
          stages: [],
          createdAt: "2026-08-14T00:00:00.000Z",
          updatedAt: "2026-08-14T00:05:00.000Z",
        }],
      },
    });
  }
  if (String(input).endsWith("/developer/liquidity")) {
    return Response.json({ ok: true, data: {
      network: "ARC-TESTNET", explorerUrl: "https://testnet.arcscan.app",
      addresses: { current: "0xcurrent", feeRouter: "0xrouter", liquidityVault: "0xvault", liquidityGovernor: "0xgovernor", liquidityAdapter: "0xadapter" },
      allocationBps: 2000,
      liquidity: { configured: true, governorOwnsVault: true, adapterAllowed: true, minimumDelaySeconds: 30, idleCurrent: "2.5", idleUsdc: "0", currentDeployed: "10", usdcDeployed: "1", liquidityShares: "1", positionsCreated: 1, positionsRemoved: 0, proofMode: "testnet-no-value" },
    } });
  }
  if (String(input).endsWith("/developer/partners")) {
    return Response.json({ ok: true, data: {
      configured: true, network: "ARC-TESTNET", explorerUrl: "https://testnet.arcscan.app",
      addresses: { vault: "0xpartner", governor: "0xgovernor", testnetPartnerToken: "0xtoken", campaignVault: "0xcampaign" },
      asset: { approved: true, treasury: "0xtreasury", metadataHash: "0xmeta", symbol: "CPT", decimals: 18, reserveBalance: "90000", totalDeposited: "100000", totalCampaignFunded: "10000" },
      governance: { governorOwnsVault: true, guardian: "0xguardian", minimumDelaySeconds: 30, totalQueued: 2, totalExecuted: 2, totalCancelled: 0 },
      totals: { approvedAssets: 1, deposits: 1, campaignsFunded: 1 }, proofCampaign: null,
    } });
  }
  if (String(input).endsWith("/developer/venues")) {
    return Response.json({ ok: true, data: {
      configured: true, network: "ARC-TESTNET", explorerUrl: "https://testnet.arcscan.app",
      addresses: { registry: "0xregistry", governor: "0xgovernor", adapter: "0xadapter", current: "0xcurrent", usdc: "0xusdc" },
      venue: { approved: true, venueId: "0xvenue", venueNameHash: "0xname", registeredCodeHash: "0xcode", liveCodeHash: "0xcode", codeHashMatches: true, maxSlippageBps: 300, maxAllocationBps: 2000, activatedAt: 1, updatedAt: 1 },
      governance: { governorOwnsRegistry: true, guardian: "0xguardian", minimumDelaySeconds: 30, totalQueued: 1, totalExecuted: 1, totalCancelled: 0 },
      totals: { approvedVenues: 1, approvals: 1, revocations: 0 }, readiness: { custodyAdapterBoundary: true, exactBytecodeBinding: true, exactPairBinding: true, riskCaps: true, testnetQualificationOnly: true },
    } });
  }
  if (String(input).endsWith("/developer/evidence") && init?.method === "POST") {
    return Response.json({
      ok: true,
      data: {
        id: "evidence_sdk",
        publicSlug: "proof_sdk",
        schemaVersion: "current-evidence-v1",
        digest: "digest_sdk",
        distributionId: "dist_sdk",
        readinessScore: 80,
        snapshot: {},
        createdAt: "2026-08-14T00:00:00.000Z",
      },
    }, { status: 201 });
  }
  if (String(input).endsWith("/developer/evidence")) {
    return Response.json({
      ok: true,
      data: {
        reports: [{
          id: "evidence_sdk",
          publicSlug: "proof_sdk",
          schemaVersion: "current-evidence-v1",
          digest: "digest_sdk",
          distributionId: "dist_sdk",
          readinessScore: 80,
          snapshot: {},
          createdAt: "2026-08-14T00:00:00.000Z",
        }],
      },
    });
  }
  if (String(input).endsWith("/developer/pilots") && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    return Response.json({
      ok: true,
      data: {
        id: "pilot_sdk",
        publicSlug: "pilot_sdk_proof",
        partnerName: body.partnerName ?? "SDK partner",
        partnerWebsite: null,
        useCase: body.useCase ?? "SDK pilot",
        status: "onboarding",
        integrationMode: body.integrationMode ?? "server-sdk",
        requestedIntegrations: body.requestedIntegrations ?? [],
        targets: { recipients: 100, claimRate: 60, activationRate: 30 },
        readinessScore: 29,
        targetMet: false,
        milestones: [],
        campaign: null,
        attestation: null,
        dueAt: null,
        createdAt: "2026-08-14T00:00:00.000Z",
        updatedAt: "2026-08-14T00:00:00.000Z",
      },
    }, { status: 201 });
  }
  if (String(input).endsWith("/developer/pilots")) {
    return Response.json({ ok: true, data: { pilots: [] } });
  }
  if (String(input).endsWith("/developer/agent-actions") && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    return Response.json({ ok: true, data: {
      id: "agent_action_sdk", agentName: "Reward Router", kind: "reward_distribution",
      status: "approval_required", riskLevel: "medium", amountAtomic: "25000000",
      assetAddress: null, recipientCount: 1, campaignName: body.name,
      policyDecision: { outcome: "approval_required", reasons: ["Human approval threshold reached."] },
      settlement: null,
      result: {}, failureCode: null, reviewedAt: null, executedAt: null,
      createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z",
    } }, { status: 201 });
  }
  if (String(input).endsWith("/developer/agent-actions")) {
    return Response.json({ ok: true, data: { totals: { actions: 1, approvalRequired: 1, awaitingSettlement: 0, completed: 0, blocked: 0 }, actions: [] } });
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
const funding = await current.funding.list();
assert.equal(funding.catalog.destination.code, "ARC-TESTNET");
assert.equal(funding.intents[0]?.destinationTransactionHash, "0xmint");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/funding");

const gateway = await current.gateway.list();
assert.equal(gateway.catalog.signerRequirement, "EOA");
assert.equal(gateway.intents[0]?.mintTransactionHash, "0xgatewaymint");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/gateway");

await current.liquidity.get();
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/liquidity");
assert.equal(
  new Headers(requests.at(-1)?.init?.headers).get("authorization"),
  `Bearer ${apiKey}`,
);

await current.partners.get();
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/partners");
assert.equal(new Headers(requests.at(-1)?.init?.headers).get("authorization"), `Bearer ${apiKey}`);

await current.venues.get();
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/venues");
assert.equal(new Headers(requests.at(-1)?.init?.headers).get("authorization"), `Bearer ${apiKey}`);

const evidence = await current.evidence.create({ distributionId: distribution.id });
assert.equal(evidence.publicSlug, "proof_sdk");
const evidenceRequest = requests.at(-1);
assert.ok(evidenceRequest?.url.endsWith("/api/v1/developer/evidence"));
assert.equal(JSON.parse(String(evidenceRequest?.init?.body)).distributionId, "dist_sdk");
const evidenceList = await current.evidence.list();
assert.equal(evidenceList.reports[0]?.digest, "digest_sdk");

const pilot = await current.pilots.create({
  partnerName: "SDK partner",
  useCase: "Walletless rewards for a partner community",
  integrationMode: "server-sdk",
  targetRecipients: 100,
  targetClaimRate: 60,
  targetActivationRate: 30,
  requestedIntegrations: ["circle-wallets", "activation-webhooks"],
});
assert.equal(pilot.publicSlug, "pilot_sdk_proof");
const pilotRequest = requests.at(-1);
assert.ok(pilotRequest?.url.endsWith("/api/v1/developer/pilots"));
assert.equal(JSON.parse(String(pilotRequest?.init?.body)).partnerName, "SDK partner");
const pilotList = await current.pilots.list();
assert.deepEqual(pilotList.pilots, []);

const agentAction = await current.agentActions.proposeDistribution({
  idempotencyKey: "reward-sdk-1",
  name: "SDK agent reward",
  recipients: [{ identityType: "game", identity: "player-42", amount: "25" }],
});
assert.equal(agentAction.status, "approval_required");
assert.ok(requests.at(-1)?.url.endsWith("/api/v1/developer/agent-actions"));
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).idempotencyKey, "reward-sdk-1");
const agentActionList = await current.agentActions.list();
assert.equal(agentActionList.totals.approvalRequired, 1);

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
