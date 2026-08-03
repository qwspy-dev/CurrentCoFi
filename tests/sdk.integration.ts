import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Current, CurrentError, verifyCurrentWebhook } from "../packages/sdk/src/index.js";

const apiKey = "current_test_sdk";
const signingSecret = "sdk_signing_secret";
const requests: Array<{ url: string; init?: RequestInit }> = [];

const mockFetch: typeof fetch = async (input, init) => {
  requests.push({ url: String(input), init });
  if (String(input).endsWith("/developer/tokens/inspect")) {
    return Response.json({ ok: true, data: { address: "0x2222222222222222222222222222222222222222", symbol: "TIDE", name: "Tide Token", decimals: 18, verified: false, network: "ARC-TESTNET", warning: "Metadata was read onchain." } });
  }
  if (String(input).endsWith("/developer/links")) {
    return Response.json({ ok: true, data: { id: "link_sdk", status: "awaiting_funding", amount: "1.25", asset: "TIDE", assetDetails: { address: "0x2222222222222222222222222222222222222222", symbol: "TIDE", name: "Tide Token", decimals: 18, verified: false, network: "ARC-TESTNET", warning: null }, expiresAt: "2026-08-14T00:00:00.000Z", claimUrl: "https://current.test/?claim=proof#/claim", funding: { required: true, network: "ARC-TESTNET", amountAtomic: "1250000000000000000", assetAddress: "0x2222222222222222222222222222222222222222", state: "awaiting_vault_transaction" } } }, { status: 201 });
  }
  if (String(input).endsWith("/developer/checkout")) {
    const checkout = {
      id: "checkout_sdk", slug: "founding-membership-sdk", title: "Founding membership", description: "Current community access",
      status: "active", amount: "25", amountAtomic: "25000000", currency: "USDC",
      checkoutUrl: "https://current.test/#/checkout/founding-membership-sdk", expiresAt: null, successUrl: null,
      createdAt: "2026-08-14T00:00:00.000Z",
    };
    return Response.json({ ok: true, data: init?.method === "POST" ? checkout : {
      merchant: { id: "merchant_sdk", displayName: "SDK Store", slug: "sdk-store", settlementAddress: "0x1111111111111111111111111111111111111111", status: "active" },
      checkouts: [checkout], payments: [], totals: { checkouts: 1, payments: 0, volume: "0", refunds: 0 },
    } }, { status: init?.method === "POST" ? 201 : 200 });
  }
  if (String(input).endsWith("/developer/social-payments")) {
    return Response.json({ ok: true, data: {
      id: "social_sdk", slug: "tip-sdk", kind: "tip", title: "Project token tip", note: "Thanks",
      status: "active", amount: "1.250000000000000001", paidAmount: "0", currency: "TIDE",
      asset: { address: "0x2222222222222222222222222222222222222222", symbol: "TIDE", name: "Tide Token", decimals: 18, verified: false },
      expiresAt: "2026-08-14T00:00:00.000Z", shares: [{ id: "share_sdk", label: "Open payment", amount: "1.250000000000000001", payUrl: "https://current.test/?payment=proof#/pay/tip-sdk" }],
    } }, { status: 201 });
  }
  if (String(input).endsWith("/developer/subscriptions")) {
    const plan = { id: "plan_sdk", slug: "founding-circle-sdk", title: "Founding circle", description: "Recurring access", status: "active", amount: "15", amountAtomic: "15000000", currency: "USDC", intervalDays: 30, subscribeUrl: "https://current.test/#/subscribe/founding-circle-sdk", createdAt: "2026-08-14T00:00:00.000Z" };
    return Response.json({ ok: true, data: init?.method === "POST" ? plan : { merchant: { id: "merchant_sdk", displayName: "SDK Store", slug: "sdk-store", settlementAddress: "0x1111111111111111111111111111111111111111", status: "active" }, plans: [plan], merchantSubscriptions: [], subscriberSubscriptions: [], totals: { plans: 1, activeSubscriptions: 0, payments: 0, collected: "0", openRenewals: 0, pastDue: 0 } } }, { status: init?.method === "POST" ? 201 : 200 });
  }
  if (String(input).endsWith("/developer/escrow")) {
    const agreement = {
      id: "escrow_sdk", name: "SDK milestone proof", status: "awaiting_funding",
      clientAddress: "0x1111111111111111111111111111111111111111",
      providerAddress: "0x2222222222222222222222222222222222222222",
      arbitratorAddress: "0x3333333333333333333333333333333333333333",
      contractDealId: "0xdeal", contractAddress: "0xescrow", termsHash: "0xterms",
      fundingTransactionHash: null, cancellationRequested: false,
      asset: { address: "0xusdc", symbol: "USDC", decimals: 6 },
      totalAmount: "500", releasedAmount: "0", refundedAmount: "0", nextMilestone: 0,
      milestones: [{ position: 0, title: "Ship integration", amount: "500", dueAt: "2026-09-01T00:00:00.000Z", status: "pending", proofHash: null }],
    };
    return Response.json({ ok: true, data: init?.method === "POST" ? agreement : { configured: true, network: "ARC-TESTNET", agreements: [agreement] } }, { status: init?.method === "POST" ? 201 : 200 });
  }
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
  if (String(input).endsWith("/developer/quality")) {
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    if (body?.action === "evaluate") {
      return Response.json({ ok: true, data: { evaluated: 4, allowed: 3, review: 1, held: 0 } });
    }
    if (body?.action === "update-policy") {
      return Response.json({ ok: true, data: {
        distributionId: "dist_sdk", campaignName: "SDK proof", configured: true,
        action: body.enforcementAction ?? "review", reviewThreshold: body.reviewThreshold ?? 45,
        holdThreshold: 70, burstWindowMinutes: 10, burstReferralCount: 8,
        minimumAccountAgeMinutes: 60, minimumActivationDelaySeconds: 30,
      } });
    }
    return Response.json({
      ok: true,
      data: {
        policies: [{ distributionId: "dist_sdk", enabled: true, action: body?.enforcementAction ?? "review", reviewThreshold: 45, holdThreshold: 70 }],
        reviewQueue: [],
        retention: { day1: 60, day7: 0, day30: 0, returning: 5 },
        cohorts: [{ week: "2026-08-10", claimed: 10, eligibleDay7: 0, retainedDay7: 0, day7Rate: 0 }],
        totals: { evaluated: 0, allowed: 3, review: 1, held: 0 },
      },
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
  if (String(input).endsWith("/developer/launch-readiness")) {
    return Response.json({ ok: true, data: {
      configured: true, network: "ARC-TESTNET", explorerUrl: "https://testnet.arcscan.app", readinessScore: 100,
      addresses: { registry: "0xregistry", governor: "0xgovernor" },
      release: { id: "0xrelease", expectedId: "0xrelease", manifestHash: "0xmanifest", totalReleases: 1, appliedAt: 1, componentCount: 10, active: true },
      governance: { guardian: "0xguardian", minimumDelaySeconds: 30, paused: false, totalQueued: 1, totalExecuted: 1, totalCancelled: 0 },
      components: [], checks: { exactRelease: true },
    } });
  }
  if (String(input).endsWith("/developer/observability")) {
    return Response.json({ ok: true, data: {
      projectId: "project_sdk", service: "Current CoFi", environment: "test", network: "ARC-TESTNET",
      status: "operational", score: 100, generatedAt: "2026-08-14T00:00:00.000Z", responseTimeMs: 92,
      components: [{ id: "arc-rpc", name: "Arc testnet RPC", status: "operational", latencyMs: 92, message: "Connected." }],
      activeIncidents: [], incidentHistory: [],
      objectives: { availability: "99.9%", apiLatencyP95Ms: 800, rpcLatencyP95Ms: 1500, recoveryTimeMinutes: 30, onchainRecoveryPoint: "zero confirmed transactions" },
    } });
  }
  if (String(input).endsWith("/developer/security")) {
    return Response.json({ ok: true, data: {
      projectId: "project_sdk", product: "Current CoFi", network: "Arc testnet",
      assurance: { internalReadinessScore: 100, implementedControls: 10, totalInternalControls: 10, externalAuditStatus: "pending", mainnetApproved: false, statement: "Internal readiness only." },
      controls: [], privilegedRoles: [], fundFlows: [],
      reviewPackage: { scope: "scope", threatModel: "threat", invariants: "invariants", auditorGuide: "guide", disclosure: "security", repository: "repo", commit: null },
      generatedAt: "2026-08-14T00:00:00.000Z",
    } });
  }
  if (String(input).endsWith("/developer/grant") && init?.method === "POST") {
    return Response.json({ ok: true, data: {
      schemaVersion: "current-grant-review-v1", digest: "grant_digest_sdk",
      evidence: { id: "evidence_sdk", publicSlug: "proof_sdk", schemaVersion: "current-evidence-v15", digest: "digest_sdk", integrity: { valid: true, recalculatedDigest: "digest_sdk" }, generatedAt: "2026-08-14T00:00:00.000Z" },
      application: { project: "Current CoFi", website: "https://current.test", oneLiner: "Walletless activation", problem: "Wallet friction", solution: "Embedded claims", whyArc: "Settlement", ecosystemValue: "Reusable infrastructure" },
      officialCriteria: [], architecture: [], proof: { readinessScore: 80 }, shipped: [], proposedMilestones: [], honestGaps: [], reviewerLinks: {}, privacy: "Aggregate only",
    } }, { status: 201 });
  }
  if (String(input).endsWith("/developer/grant")) {
    return Response.json({ ok: true, data: { packages: [{
      id: "evidence_sdk", publicSlug: "proof_sdk", schemaVersion: "current-evidence-v15", digest: "digest_sdk", distributionId: null, readinessScore: 80,
      project: { name: "Current CoFi", slug: "current-cofi" }, totals: { campaigns: 1, recipients: 10, claims: 8, activations: 4 }, createdAt: "2026-08-14T00:00:00.000Z",
    }] } });
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
    if (body.action === "create-invitation") return Response.json({ ok: true, data: {
      id: "invite_sdk", publicSlug: "invite_sdk_public", name: body.name, summary: body.summary,
      status: "active", integrationMode: "server-sdk", requestedIntegrations: body.requestedIntegrations ?? [],
      targetRecipients: body.targetRecipients ?? 100, maxApplications: body.maxApplications ?? 25,
      applicationCount: 0, expiresAt: null, createdAt: "2026-08-14T00:00:00.000Z",
    } }, { status: 201 });
    if (body.action === "review-application") return Response.json({ ok: true, data: {
      id: body.applicationId, publicSlug: "application_sdk", organizationName: "SDK applicant",
      websiteUrl: null, applicantName: "Ari", applicantRole: "Founder", useCase: "Activate game users",
      audienceDescription: "Players in an existing community", expectedRecipients: 500,
      integrationMode: "server-sdk", requestedIntegrations: ["usdc", "activation-webhooks"],
      readiness: { completed: 5, total: 5, score: 100 }, status: body.status,
      reviewNotes: body.reviewNotes ?? null, pilotId: "pilot_sdk", createdAt: "2026-08-14T00:00:00.000Z",
      updatedAt: "2026-08-14T00:00:00.000Z",
    } });
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
    return Response.json({ ok: true, data: { pilots: [], invitations: [], applications: [] } });
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
  if (String(input).endsWith("/integration-manifest")) return Response.json({ ok: true, data: {
    schemaVersion: "current-integration-v1", product: "Current CoFi", network: "Arc testnet",
    message: "Turn offchain audiences into funded wallets and active token users.", publishedAt: "2026-08-01T00:00:00.000Z", digest: "manifest_sdk",
    paths: [], circleStack: ["Arc settlement", "USDC"], endpoints: [], webhookEvents: [], security: [],
  } });
  if (String(input).endsWith("/grant-application")) return Response.json({ ok: true, data: {
    schemaVersion: "current-circle-grant-application-v1", product: "Current CoFi", environment: "Arc testnet", generatedAt: "2026-08-14T00:00:00.000Z",
    status: "submission-ready-pending-applicant-and-external-input", boundary: "Verified submission draft.", digest: "application_digest_sdk", executiveSummary: "Walletless activation infrastructure.", privacy: "Aggregate only.",
    officialGrantSource: { name: "Circle Developer Grants", url: "https://www.circle.com/grant", applicationUrl: "https://www.circle.com/grant/application", researchedAt: "2026-08-01", applicationWindowObserved: "closed-check-back-soon", criteria: [] },
    applicationAnswers: [{ id: "overview", prompt: "What are you building?", response: "Current CoFi", wordCount: 2, evidence: [] }], architecture: [], shipped: [], evidenceSnapshot: {}, proposedMilestones: [], externalGates: [], applicantInputs: [],
    submissionChecklist: { internallyComplete: [], awaitingApplicant: [], awaitingExternal: [] }, reviewerLinks: {},
  } });
  if (String(input).endsWith("/developer/integration-readiness")) return Response.json({ ok: true, data: {
    schemaVersion: "current-readiness-v1", projectId: "project_sdk", score: 65, level: "pilot-ready",
    completed: 6, total: 10, generatedAt: "2026-08-14T00:00:00.000Z", checks: [],
    next: { id: "claim", label: "Confirm a walletless claim", detail: "Settle on Arc", weight: 15, complete: false, count: 0 },
  } });
  if (String(input).endsWith("/developer/integration-certification")) return Response.json({ ok: true, data: {
    token: "certificate_sdk.signature", digest: "digest_certificate_sdk", publicUrl: "https://current.test/?cert=certificate_sdk#/certification",
    certificate: { schemaVersion: "current-integration-certificate-v1", subject: { projectRef: "project_ref", projectName: "SDK Project" }, issuer: { name: "Current CoFi", network: "Arc testnet" }, status: "integration-verified", score: 65, completed: 6, total: 10, manifestDigest: "manifest_sdk", issuedAt: "2026-08-14T00:00:00.000Z", expiresAt: "2026-09-13T00:00:00.000Z", checks: [] },
  } }, { status: 201 });
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

const inspectedToken = await current.links.inspectToken("0x2222222222222222222222222222222222222222");
assert.equal(inspectedToken.symbol, "TIDE");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/tokens/inspect");
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));
const assetLink = await current.links.create({ amount: "1.25", tokenAddress: inspectedToken.address, message: "Welcome aboard" });
assert.equal(assetLink.funding.amountAtomic, "1250000000000000000");
assert.equal(assetLink.asset, "TIDE");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/links");

const escrow = await current.escrow.create({
  name: "SDK milestone proof",
  clientAddress: "0x1111111111111111111111111111111111111111",
  providerAddress: "0x2222222222222222222222222222222222222222",
  arbitratorAddress: "0x3333333333333333333333333333333333333333",
  milestones: [{ title: "Ship integration", amount: "500", dueAt: "2026-09-01T00:00:00.000Z" }],
});
assert.equal(escrow.id, "escrow_sdk");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/escrow");
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));
const escrows = await current.escrow.list();
assert.equal(escrows.agreements[0]?.asset.symbol, "USDC");

const checkout = await current.checkout.create({ title: "Founding membership", description: "Current community access", amount: "25" });
assert.equal(checkout.currency, "USDC");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/checkout");
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));
const commerce = await current.checkout.list();
assert.equal(commerce.totals.checkouts, 1);
assert.equal(commerce.merchant?.settlementAddress, "0x1111111111111111111111111111111111111111");

const subscriptionPlan = await current.subscriptions.createPlan({ title: "Founding circle", description: "Recurring access", amount: "15", intervalDays: 30 });
assert.equal(subscriptionPlan.intervalDays, 30);
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/subscriptions");
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));
const subscriptions = await current.subscriptions.list();
assert.equal(subscriptions.totals.plans, 1);

const socialPayment = await current.socialPayments.create({ kind: "tip", title: "Project token tip", amount: "1.250000000000000001", tokenAddress: "0x2222222222222222222222222222222222222222" });
assert.equal(socialPayment.asset.decimals, 18);
assert.equal(socialPayment.currency, "TIDE");
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).tokenAddress, "0x2222222222222222222222222222222222222222");
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));

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
const publicApplication = await current.dossier.application();
assert.equal(publicApplication.digest, "application_digest_sdk");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/grant-application");
const quality = await current.quality.get();
assert.equal(quality.retention.day1, 60);
await current.quality.updatePolicy("dist_sdk", { enforcementAction: "hold-referral-reward", reviewThreshold: 40 });
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).enforcementAction, "hold-referral-reward");
const evaluatedQuality = await current.quality.evaluate("dist_sdk");
assert.equal(evaluatedQuality.evaluated, 4);
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).action, "evaluate");
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

const release = await current.releases.get();
assert.equal(release.readinessScore, 100);
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/launch-readiness");

const operational = await current.observability.get();
assert.equal(operational.status, "operational");
assert.equal(operational.score, 100);
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/observability");

const security = await current.security.get();
assert.equal(security.assurance.externalAuditStatus, "pending");
assert.equal(security.assurance.mainnetApproved, false);
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/security");

const evidence = await current.evidence.create({ distributionId: distribution.id });
assert.equal(evidence.publicSlug, "proof_sdk");
const evidenceRequest = requests.at(-1);
assert.ok(evidenceRequest?.url.endsWith("/api/v1/developer/evidence"));
assert.equal(JSON.parse(String(evidenceRequest?.init?.body)).distributionId, "dist_sdk");
const evidenceList = await current.evidence.list();
assert.equal(evidenceList.reports[0]?.digest, "digest_sdk");

const grant = await current.grant.create();
assert.equal(grant.evidence.publicSlug, "proof_sdk");
assert.equal(requests.at(-1)?.url, "https://current.test/api/v1/developer/grant");
const grantList = await current.grant.list();
assert.equal(grantList.packages[0]?.readinessScore, 80);

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
const invitation = await current.pilots.createInvitation({
  name: "SDK founding cohort", summary: "Launch a measurable walletless campaign.",
  targetRecipients: 500, maxApplications: 20, requestedIntegrations: ["usdc", "activation-webhooks"],
});
assert.equal(invitation.publicSlug, "invite_sdk_public");
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).action, "create-invitation");
const reviewedApplication = await current.pilots.reviewApplication("application_sdk", "accepted", "Strong activation plan");
assert.equal(reviewedApplication.status, "accepted");
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)).action, "review-application");

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

const integrationManifest = await current.integrations.manifest();
assert.equal(integrationManifest.digest, "manifest_sdk");
assert.equal(new Headers(requests.at(-1)?.init?.headers).get("authorization"), null);
const integrationReadiness = await current.integrations.readiness();
assert.equal(integrationReadiness.score, 65);
assert.equal(new Headers(requests.at(-1)?.init?.headers).get("authorization"), `Bearer ${apiKey}`);
const integrationCertificate = await current.integrations.certify();
assert.equal(integrationCertificate.certificate.status, "integration-verified");
assert.equal(JSON.parse(String(requests.at(-1)?.init?.body)) instanceof Object, true);
assert.ok(new Headers(requests.at(-1)?.init?.headers).get("x-current-signature"));

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
