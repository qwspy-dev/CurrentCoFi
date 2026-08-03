# Current CoFi implementation milestones

Each group ends with automated checks, a Vercel production deployment, browser verification, and a user check-in.

## Public walletless mass drops — complete

- Fully funded first-come USDC and Arc project-token pools
- One public link, hard capacity, expiry, and campaign recovery path
- Encrypted verified-email reservations with one identity per reward
- Atomic slot reservation and duplicate-safe claim-link recovery
- Referral capture, masked project analytics, signed webhooks, SDK, developer API, and MCP tools
- Privacy-safe Circle grant evidence with Merkle and Arc funding anchors

External proof still required: run the first funded public testnet drop with outside participants and retain the confirmed claim and activation evidence.

## Delivery status

- Group 1 — Foundation: complete and deployed.
- Group 2 — Accounts: Google/Circle onboarding, embedded Arc testnet wallet, encrypted recovery session; complete and deployed.
- Group 3 — Claims: persistent signed links, Arc claim vault, gas-sponsored Circle wallet settlement, confirmation, expiration, and refunds; complete and deployed.
- Group 4 — Project distribution: arbitrary Arc ERC-20 support, Merkle allowlists, bulk recipient imports, campaign funding, recovery, and live settlement analytics; complete and deployed.
- Group 5A — Growth attribution: campaign referral codes, claim-source persistence, signed activation ingestion, idempotency, and live attribution analytics; complete and deployed.
- Group 5B — Developer integrations: one-time scoped keys, encrypted signing credentials, policy-bound agent keys, durable signed webhooks, API analytics, and machine-readable agent tools; complete and deployed.
- Group 6 — SDK and embedded components; next.

1. **Foundation** — architecture, schema, API contract, Arc configuration, health and frontend boundary.
2. **Accounts** — social/email authentication, embedded Circle wallet provisioning, recovery, profile.
3. **Claims** — funded USDC links, Arc testnet contracts, sponsored claiming, expiration, refunds.
4. **Project distribution** — arbitrary Arc tokens, bulk recipients, allowlists, identity-bound claims.
5. **Growth system** — referrals, signed activation events, attribution, eligible retention cohorts, explainable referral-risk signals, campaign policies, and review queues are live.
6. **Developer platform** — API keys, SDK, webhooks, components, AI-agent permissions. Keys, webhooks, and agent policies are live; the SDK and embedded components are next.
7. **$CURRENT economy** — locks, fee routing, buyback accounting, transparent public metrics.
8. **Readiness** — external review, pilots, grant evidence, mainnet deployment controls.
9. **Expansion** — merchant checkout, milestone escrow, recurring USDC subscriptions, and cross-chain USDC funding are implemented on Arc testnet.
10. **Recurring operations and grant proof** — deduplicated renewal lifecycle notices, due/past-due webhooks, scheduled reconciliation, and checkout/subscription settlement evidence are implemented.
# Milestone: Proof-gated public activation drops (complete)

- Public USDC and Arc project-token drops now accept a bounded action condition.
- Claims remain locked until a fresh project-signed proof matches the distribution, Arc wallet, and event type.
- Proofs are replay protected and consumed only after confirmed settlement.
- Workspace, REST, SDK, MCP, hosted proof copy, OpenAPI, and privacy-safe grant evidence share the same condition contract.
- Rendered desktop and mobile QA, security checks, package builds, and production-build verification pass.
# Encrypted campaign delivery center — complete (2026-08-03)

- Persisted AES-GCM-encrypted private campaign claim URLs with masked offchain recipient identities.
- Added authorized operator recovery, campaign filtering, secure CSV export, QR generation, and email/X/Telegram/Discord/SMS/game handoff preparation.
- Added auditable handoff state that never conflates operator preparation with third-party delivery confirmation or Arc claim settlement.
- Added workspace API, scoped HMAC developer API, TypeScript SDK, approval-gated MCP tools, OpenAPI metadata, and privacy-safe grant-evidence aggregates.
- Applied additive production database migration `0027_long_malcolm_colcord.sql`.
