import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  openapi: "3.1.0",
  info: {
    title: "Current CoFi API",
    version: "3.1.0-security-review-readiness",
    description: "Identity-bound walletless USDC and project-token activation infrastructure for Arc.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": { get: { summary: "Service and dependency health" } },
    "/status": { get: { summary: "Public component health, SLO targets, and incident history" } },
    "/security": { get: { summary: "Public security controls, privileged roles, fund flows, and external-review status" } },
    "/incidents": {
      get: { summary: "List the authenticated operational incident ledger" },
      post: { summary: "Create, update, or resolve an operational incident" },
    },
    "/meta": { get: { summary: "Public chain, capability, and product metadata" } },
    "/auth/config": { get: { summary: "Public Circle wallet authentication configuration" } },
    "/auth/device-token": { post: { summary: "Create a Circle device-bound login token" } },
    "/auth/email-token": { post: { summary: "Begin a Circle email OTP login" } },
    "/auth/initialize": { post: { summary: "Create an Arc testnet smart-contract account wallet" } },
    "/auth/session": {
      get: { summary: "Read the encrypted Current CoFi account session" },
      post: { summary: "Verify Circle identity and create the account session" },
      delete: { summary: "Sign out and clear the account session" },
    },
    "/auth/refresh": { post: { summary: "Refresh Circle credentials and the encrypted account session" } },
    "/links": {
      get: { summary: "List claim links owned by the signed-in account" },
      post: { summary: "Create a persistent, signed walletless USDC or Arc project-token claim link" },
    },
    "/tokens/inspect": { post: { summary: "Read and validate ERC-20 metadata directly from an Arc token contract" } },
    "/links/resolve": { post: { summary: "Resolve a signed claim token into a safe public preview" } },
    "/social-payments": {
      get: { summary: "List social payment requests, split progress, and sent-payment receipts" },
      post: { summary: "Create a USDC or Arc project-token username send, payment request, tip link, or split bill" },
    },
    "/social-payments/public": { get: { summary: "Resolve a token-scoped social payment without exposing private identities" } },
    "/social-payments/pay": { post: { summary: "Prepare or confirm an exact non-custodial Arc ERC-20 transfer" } },
    "/social-payments/manage": { post: { summary: "Cancel an owned active social payment request" } },
    "/campaigns": {
      get: { summary: "List owned campaigns with verified settlement analytics" },
      post: { summary: "Create an allowlisted or identity-bound USDC or project-token campaign" },
    },
    "/campaigns/fund": { post: { summary: "Approve and fully fund a campaign vault on Arc" } },
    "/campaigns/manage": { post: { summary: "Cancel a campaign or refund an expired campaign" } },
    "/campaigns/recipients": { get: { summary: "List masked recipient allocations and settlement states" } },
    "/campaigns/analytics": { get: { summary: "Read live campaign targeting, claims, and activation totals" } },
    "/escrow": {
      get: { summary: "List fully funded milestone agreements for the signed-in wallet" },
      post: { summary: "Create a USDC or project-token milestone agreement" },
    },
    "/escrow/actions": { post: { summary: "Approve, fund, submit, release, dispute, resolve, cancel, or recover a milestone agreement" } },
    "/merchant": {
      get: { summary: "Read the signed-in project's merchant profile, checkout links, settlements, refunds, and volume" },
      post: { summary: "Create a merchant settlement profile or publish a fixed-price USDC checkout" },
    },
    "/checkout/public": { get: { summary: "Resolve a public hosted checkout without exposing private merchant data" } },
    "/checkout/pay": { post: { summary: "Prepare or confirm an exact USDC transfer from a Current wallet to the merchant" } },
    "/checkout/refund": { post: { summary: "Prepare or confirm a refund from the merchant settlement wallet" } },
    "/checkout/receipt": { get: { summary: "Verify a confirmed or refunded Arc checkout receipt" } },
    "/subscriptions": {
      get: { summary: "Read merchant plans, subscriber relationships, renewal readiness, and confirmed recurring volume" },
      post: { summary: "Publish or pause a fixed-price recurring USDC plan" },
    },
    "/subscriptions/public": { get: { summary: "Resolve a public walletless USDC subscription plan" } },
    "/subscriptions/start": { post: { summary: "Prepare or confirm the first explicitly approved subscription payment" } },
    "/subscriptions/actions": { post: { summary: "Explicitly approve a due renewal or cancel a subscription" } },
    "/funding": {
      get: { summary: "List CCTP V2 funding routes and their source, Arc, and vault proofs" },
      post: { summary: "Create, authorize, bridge, synchronize, or settle a crosschain USDC funding route" },
    },
    "/gateway": {
      get: { summary: "Read Gateway EOA wallets, unified balances, and durable campaign-funding intents" },
      post: { summary: "Create, deposit, sign, attest, mint, synchronize, or settle a Gateway funding intent" },
    },
    "/evidence": {
      get: { summary: "List immutable grant-evidence reports for the signed-in workspace" },
      post: { summary: "Generate an immutable, shareable grant-evidence snapshot" },
    },
    "/evidence/public": {
      get: { summary: "Verify a public evidence report, canonical digest, campaign anchors, checkout receipts, and subscription cycles" },
    },
    "/pilots": {
      get: { summary: "List external Arc pilot engagements and verified launch readiness" },
      post: { summary: "Create, configure, or link a campaign to a pilot engagement" },
    },
    "/pilots/public": {
      get: { summary: "Open a partner pilot confirmation link without an account" },
      post: { summary: "Create a digest-verified partner pilot attestation" },
    },
    "/referrals": {
      get: { summary: "Read referral codes, claims, and verified activation attribution" },
      post: { summary: "Create an attributable referral code for a campaign" },
    },
    "/developer/keys": {
      get: { summary: "List scoped project and agent API keys" },
      post: { summary: "Create or revoke a scoped API key" },
    },
    "/developer/webhooks": {
      get: { summary: "List signed webhook endpoints and durable delivery attempts" },
      post: { summary: "Create, pause, test, or retry a signed webhook endpoint" },
    },
    "/developer/activations": {
      post: { summary: "Ingest an HMAC-signed post-claim activation event" },
    },
    "/developer/identity-attestations": {
      post: { summary: "Bind a verified X, game, or custom project identity to a recipient Arc wallet" },
    },
    "/developer/distributions": {
      post: { summary: "Create a signed walletless USDC or project-token distribution" },
    },
    "/developer/links": { post: { summary: "Create an HMAC-signed private USDC or project-token claim link" } },
    "/developer/tokens/inspect": { post: { summary: "Inspect Arc ERC-20 metadata with an HMAC-signed request" } },
    "/developer/escrow": {
      get: { summary: "List project milestone agreements with a scoped API key" },
      post: { summary: "Prepare an HMAC-signed milestone agreement for wallet funding" },
    },
    "/developer/checkout": {
      get: { summary: "Read merchant checkout analytics with a scoped API key" },
      post: { summary: "Create a merchant profile or hosted checkout with an HMAC-signed request" },
    },
    "/developer/subscriptions": {
      get: { summary: "Read subscription plans, subscribers, cycles, and recurring volume with a scoped API key" },
      post: { summary: "Publish a recurring USDC plan with an HMAC-signed request" },
    },
    "/developer/social-payments": { post: { summary: "Create an HMAC-signed USDC or project-token request, tip, or split-bill link" } },
    "/developer/agent-actions": {
      get: { summary: "List auditable policy decisions made for a scoped agent" },
      post: { summary: "Propose a policy-bound walletless reward distribution" },
    },
    "/agent-actions": {
      get: { summary: "List the workspace agent action and approval ledger" },
      post: { summary: "Approve or reject a high-value agent action" },
    },
    "/agent-actions/settle": {
      post: { summary: "Approve the campaign token and fund an agent-created campaign vault through an authorized Circle wallet" },
    },
    "/developer/analytics": {
      get: { summary: "Read project analytics with a scoped API key" },
    },
    "/integration-manifest": { get: { summary: "Read the digest-addressed public builder integration contract" } },
    "/network-proof": { get: { summary: "Read privacy-safe, digest-verifiable Arc testnet traction records" } },
    "/campaign-proofs": { get: { summary: "Inspect privacy-safe campaign funding, settlement, activation, and recovery evidence" } },
    "/reviewer-demo": { get: { summary: "Replay the complete walletless activation loop from persisted, privacy-safe testnet evidence" } },
    "/project-token-proof": { get: { summary: "Verify an arbitrary Arc ERC-20 reserve, funded campaign, and completed recipient settlement" } },
    "/proof-health": { get: { summary: "Continuously verify every public grant-evidence surface and its explicit external boundary" } },
    "/grant-dossier": { get: { summary: "Read the canonical account-free Circle grant reviewer dossier" } },
    "/grant-application": { get: { summary: "Read the digest-verified, submission-ready Circle grant application packet" } },
    "/grant-application/markdown": { get: { summary: "Download the reviewer-ready Circle grant application packet as Markdown" } },
    "/integration-readiness": { get: { summary: "Read the signed-in workspace integration conformance score" } },
    "/integration-certification": { post: { summary: "Issue a portable signed integration conformance certificate" } },
    "/integration-certification/public": { get: { summary: "Verify a portable integration certificate without an account" } },
    "/developer/integration-readiness": { get: { summary: "Read project integration conformance with a scoped API key" } },
    "/developer/integration-certification": { post: { summary: "Issue an HMAC-authorized portable integration certificate" } },
    "/developer/funding": {
      get: { summary: "Read project CCTP routes and their source, Arc, and campaign-vault proofs" },
    },
    "/quality": {
      get: { summary: "Read explainable campaign-quality decisions and eligible retention cohorts" },
      post: { summary: "Configure a quality policy or evaluate a campaign" },
    },
    "/developer/quality": {
      get: { summary: "Read campaign quality and retention with a scoped API key" },
      post: { summary: "Configure or execute explainable quality evaluation with an HMAC-signed request" },
    },
    "/developer/gateway": {
      get: { summary: "Read project Gateway deposits, burn intents, Arc mints, and campaign-vault proofs" },
    },
    "/developer/liquidity": {
      get: { summary: "Read protocol-owned $CURRENT/USDC reserves, governed positions, and public proof" },
    },
    "/partners": { get: { summary: "Read governed partner reserves and their funded Arc campaign proof" } },
    "/developer/partners": { get: { summary: "Read partner reserve, governance, and campaign proof with a scoped API key" } },
    "/venues": { get: { summary: "Read qualified liquidity venues, bytecode attestations, pair binding, and risk ceilings" } },
    "/developer/venues": { get: { summary: "Read venue qualification proof with a scoped API key" } },
    "/launch-readiness": { get: { summary: "Verify the active protocol release, exact bytecode, governance, and rollback readiness" } },
    "/developer/launch-readiness": { get: { summary: "Read deployment rehearsal proof with a scoped API key" } },
    "/developer/observability": { get: { summary: "Read component health and incident evidence with a scoped API key" } },
    "/developer/security": { get: { summary: "Read the security posture and review package with a scoped API key" } },
    "/developer/evidence": {
      get: { summary: "List project evidence reports with a scoped API key" },
      post: { summary: "Generate an HMAC-signed grant-evidence snapshot" },
    },
    "/developer/pilots": {
      get: { summary: "List project pilots, intake links, and applications with a scoped API key" },
      post: { summary: "Create pilots or intake links and review applications with an HMAC-signed request" },
    },
    "/pilots/apply": {
      get: { summary: "Read a scoped public pilot intake invitation" },
      post: { summary: "Submit a pilot application or read its private status" },
    },
    "/token/economy": {
      get: { summary: "Read the public $CURRENT economy, access tiers, and governed buyback proof" },
      post: { summary: "Approve, execute, and activate a project lock or route a product fee" },
    },
    "/agent/tools": {
      get: { summary: "Read the machine-readable Current CoFi agent tool manifest" },
    },
    "/mcp-manifest": {
      get: { summary: "Read the digest-addressed installable Current CoFi MCP server contract" },
    },
  },
  "x-current-cofi": {
    liveResourceGroups: [
      "auth", "users", "wallets", "projects", "tokens", "distributions",
      "allocations", "campaigns", "claims", "campaign-analytics", "social-payments", "username-payments", "payment-requests", "tips", "split-bills", "social-payment-receipts", "milestone-escrow", "escrow-disputes", "escrow-recovery", "merchant-profiles", "hosted-usdc-checkouts", "checkout-receipts", "merchant-refunds", "subscription-plans", "subscription-enrollments", "subscription-renewals", "subscription-cancellations", "subscription-reminders", "subscription-lifecycle-webhooks", "referrals",
      "activation-ingestion", "api-keys", "webhooks", "agents", "sdk",
      "embedded-components", "current-token", "project-locks", "fee-routing",
      "builder-integration-manifest", "integration-conformance", "portable-integration-certificates", "public-network-proof", "verified-testnet-traction", "public-campaign-proof-explorer", "privacy-safe-campaign-evidence", "account-free-reviewer-demo", "non-mutating-verified-replay", "public-project-token-proof", "arbitrary-erc20-testnet-evidence", "completed-project-token-settlement", "continuous-grant-proof-health", "public-grant-dossier",
      "project-access-tiers", "buyback-governance",
      "identity-bound-email-claims", "identity-bound-wallet-claims",
      "project-identity-attestations", "x-identity-adapters", "game-identity-adapters",
      "grant-evidence-reports", "public-evidence-verification", "evidence-digests", "commerce-settlement-proof", "subscription-cycle-proof", "protocol-owned-liquidity", "partner-token-vaults", "partner-funded-campaigns", "liquidity-venue-registry", "adapter-bytecode-attestation", "venue-risk-policy",
      "pilot-operations", "partner-attestations", "pilot-readiness", "partner-intake-links", "encrypted-pilot-applications", "pilot-application-review", "automatic-pilot-handoff",
      "campaign-quality-policies", "explainable-referral-risk", "manual-review-queues", "eligible-retention-cohorts",
      "agent-action-ledger", "agent-policy-evaluation", "human-approval-queue",
      "installable-mcp-server", "mcp-read-only-default", "mcp-explicit-write-approval",
      "crosschain-funding-intents", "cctp-v2-forwarding", "crosschain-settlement-proof",
      "agent-settlement-handoffs", "agent-wallet-approval", "agent-vault-funding-proof",
      "release-manifest-registry", "runtime-bytecode-verification", "delayed-release-governance", "rollback-payloads",
      "structured-runtime-logging", "public-status-api", "incident-response-ledger", "service-health-objectives", "scheduled-health-monitoring",
      "public-security-posture", "security-threat-model", "protocol-invariant-catalog", "adversarial-security-tests", "dependency-security-gate", "responsible-vulnerability-disclosure", "external-audit-review-package",
    ],
    plannedResourceGroups: [],
  },
}), ["GET"]);
