import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  openapi: "3.1.0",
  info: {
    title: "Current CoFi API",
    version: "3.15.0-discovery-conversion-attribution",
    description: "Identity-bound walletless USDC and project-token activation infrastructure for Arc.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": { get: { summary: "Service and dependency health" } },
    "/status": { get: { summary: "Public component health, SLO targets, and incident history" } },
    "/security": { get: { summary: "Public security controls, privileged roles, fund flows, and external-review status" } },
    "/security/audit-readiness": { get: { summary: "Verify the reproducible audit scope, source and artifact digests, compiler settings, and external-review boundary" } },
    "/incidents": {
      get: { summary: "List the authenticated operational incident ledger" },
      post: { summary: "Create, update, or resolve an operational incident" },
    },
    "/meta": { get: { summary: "Public chain, capability, and product metadata" } },
    "/discovery": {
      get: { summary: "Discover fully funded opportunities with transparent placement and privacy-safe conversion aggregates" },
      post: { summary: "Record a daily-deduplicated anonymous impression or opportunity open without storing identity or network data" },
    },
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
    "/portfolio": { get: { summary: "Read verified Arc token balances and unified signed-in account activity" } },
    "/portfolio/transfer": { post: { summary: "Prepare or confirm an exact authenticated Arc ERC-20 wallet transfer" } },
    "/tokens/inspect": { post: { summary: "Read Arc ERC-20 metadata, bytecode integrity, proxy, ownership, supply, and monitored control signals" } },
    "/asset-trust": {
      get: { summary: "List approved and current Arc token-control baselines, campaign coverage, drift, and review history" },
      post: { summary: "Recheck a project token or explicitly acknowledge its latest observed control baseline" },
    },
    "/links/resolve": { post: { summary: "Resolve a signed claim token into a safe public preview" } },
    "/campaigns/destination": { post: { summary: "Record an authenticated post-claim return click and open the campaign's safe HTTPS destination" } },
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
    "/deliveries": {
      get: { summary: "Recover authorized encrypted private claim links and their handoff state" },
      post: { summary: "Record an operator-prepared claim-link handoff channel" },
    },
    "/campaigns/analytics": { get: { summary: "Read live campaign targeting, claims, and activation totals" } },
    "/payroll": {
      get: { summary: "Read encrypted-roster community payroll schedules and Arc settlement runs" },
      post: { summary: "Create, pause, resume, or prepare a walletless USDC or project-token payroll run" },
    },
    "/bounties": {
      get: { summary: "Read project-owned, fully funded community bounties and masked submissions" },
      post: { summary: "Create a prize-backed bounty, review submissions, or release the walletless winner claim" },
    },
    "/bounties/public": {
      get: { summary: "Resolve a public bounty and verify its Arc prize funding" },
      post: { summary: "Submit public HTTPS work proof with an encrypted contact identity" },
    },
    "/giveaways": {
      get: { summary: "Read project-owned verifiable giveaways, masked entrants, referral attribution, and draw proof" },
      post: { summary: "Create a prize-backed giveaway, reveal its committed randomness after close, or retrieve the private winner claim" },
    },
    "/giveaways/public": {
      get: { summary: "Read a public giveaway, Arc prize status, commitment, entry totals, and revealed draw proof" },
      post: { summary: "Enter once with an encrypted identity and optional referral attribution" },
    },
    "/drops": {
      get: { summary: "Read project-owned public mass drops, capacity, claims, and referral attribution" },
      post: { summary: "Create a fully funded, capped first-come USDC or project-token drop" },
    },
    "/drops/public": {
      get: { summary: "Verify a public drop pool, reward, remaining capacity, and Merkle commitment" },
      post: { summary: "Reserve one encrypted, identity-bound walletless allocation" },
    },
    "/vesting": {
      get: { summary: "Read project-owned, walletless USDC and project-token vesting batches" },
      post: { summary: "Create identity-bound launch allocations with authorizer-enforced unlock times" },
    },
    "/vesting/public": { get: { summary: "Verify a public allocation proof or open a private recipient vesting schedule" } },
    "/treasury": {
      get: { summary: "Read the signed-in project's non-custodial community treasury, budgets, proposals, and Arc receipts" },
      post: { summary: "Configure a treasury, publish a category budget, propose spending, approve it, or authorize payment with the configured Circle wallet" },
    },
    "/treasury/public": { get: { summary: "Verify public category budgets, masked proposals, balances, and Arc payment receipts" } },
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
    "/developer/claim-conditions": {
      post: { summary: "Submit a replay-safe, wallet-bound pre-claim action proof" },
    },
    "/developer/distributions": {
      post: { summary: "Create a signed walletless USDC or project-token distribution" },
    },
    "/developer/bounties": {
      get: { summary: "Read project bounties and masked submissions with a scoped API key" },
      post: { summary: "Create or award an HMAC-signed, prize-backed community bounty" },
    },
    "/developer/giveaways": {
      get: { summary: "Read project giveaways, masked entries, referrals, and deterministic draw proof with a scoped API key" },
      post: { summary: "Create or draw a giveaway with an HMAC-signed request; prize funding remains a separate Circle-wallet action" },
    },
    "/developer/drops": {
      get: { summary: "Read project public mass drops with a scoped API key" },
      post: { summary: "Create an HMAC-signed capped public drop with an optional wallet-bound action-proof gate; funding remains a separate Circle-wallet action" },
    },
    "/developer/vesting": {
      get: { summary: "Read project launch vesting, masked recipients, funding, unlocks, and claims with a scoped API key" },
      post: { summary: "Create HMAC-signed walletless launch vesting; funding remains a separate Circle-wallet action" },
    },
    "/developer/treasury": {
      get: { summary: "Read a project's community treasury with a scoped API key" },
      post: { summary: "Configure budgets or create an HMAC-signed treasury proposal; payment execution always requires the configured Circle wallet" },
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
    "/developer/deliveries": {
      get: { summary: "Read authorized campaign delivery links with a scoped API key" },
      post: { summary: "Record an HMAC-authorized campaign delivery handoff" },
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
      "allocations", "campaigns", "claims", "campaign-analytics", "encrypted-campaign-deliveries", "private-claim-link-recovery", "masked-recipient-handoffs", "qr-social-delivery-preparation", "social-payments", "username-payments", "payment-requests", "tips", "split-bills", "social-payment-receipts", "public-walletless-mass-drops", "first-come-claim-caps", "encrypted-drop-reservations", "drop-referral-attribution", "community-bounties", "bounty-submissions", "walletless-bounty-awards", "verifiable-giveaways", "encrypted-giveaway-entries", "giveaway-referrals", "commit-reveal-draw-proof", "walletless-winner-claims", "walletless-launch-vesting", "vesting-schedules", "vesting-tranches", "public-launch-allocation-proof", "transparent-community-treasury", "treasury-budgets", "treasury-proposals", "treasury-payment-receipts", "milestone-escrow", "escrow-disputes", "escrow-recovery", "merchant-profiles", "hosted-usdc-checkouts", "checkout-receipts", "merchant-refunds", "subscription-plans", "subscription-enrollments", "subscription-renewals", "subscription-cancellations", "subscription-reminders", "subscription-lifecycle-webhooks", "referrals",
      "activation-ingestion", "api-keys", "webhooks", "agents", "sdk",
      "embedded-components", "current-token", "project-locks", "fee-routing",
      "builder-integration-manifest", "integration-conformance", "portable-integration-certificates", "public-network-proof", "verified-testnet-traction", "public-campaign-proof-explorer", "privacy-safe-campaign-evidence", "account-free-reviewer-demo", "non-mutating-verified-replay", "public-project-token-proof", "arbitrary-erc20-testnet-evidence", "completed-project-token-settlement", "continuous-grant-proof-health", "public-grant-dossier",
      "project-access-tiers", "buyback-governance",
      "identity-bound-email-claims", "identity-bound-wallet-claims",
      "project-identity-attestations", "x-identity-adapters", "game-identity-adapters",
      "preclaim-action-conditions", "wallet-bound-condition-proofs", "condition-proof-replay-protection", "conditional-campaign-webhooks",
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
      "reproducible-audit-manifest", "audit-scope-drift-gate", "contract-source-and-artifact-digests",
    ],
    plannedResourceGroups: [],
  },
}), ["GET"]);
