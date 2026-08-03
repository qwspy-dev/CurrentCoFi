# Transparent community treasury

Current CoFi's community treasury gives Arc projects a public budget and spending record without taking custody of project funds.

## Flow

1. A project owner connects the Arc testnet Circle wallet that will remain the treasury wallet.
2. An owner or admin publishes a category budget for USDC or an inspected Arc project token.
3. A project member creates a proposal with a purpose, amount, recipient, and optional public HTTPS proof.
4. An owner or admin approves or rejects the proposal. Committed proposals cannot exceed the published category ceiling.
5. An approved payment is prepared through Current's wallet-transfer service, but the funds do not move until the configured Circle wallet signs the challenge.
6. Confirmed Arc transaction hashes appear on both the private workspace and the privacy-safe public treasury page.

## Safety boundary

- Current never receives the treasury wallet's private key or seed phrase.
- Developers and AI agents may read budgets or create proposals, but cannot execute payments.
- Treasury configuration, category budgets, and proposal decisions require an owner or admin.
- The configured Circle wallet must match the wallet authorizing settlement.
- Public pages mask recipient addresses and never expose email identities, social accounts, API credentials, or private contacts.
- Grant evidence excludes recipient addresses and counts a payment only when an Arc transaction hash exists.

## Developer interfaces

- Signed-in API: `GET|POST /api/v1/treasury`
- Public proof: `GET /api/v1/treasury/public?slug=...`
- Scoped developer API: `GET|POST /api/v1/developer/treasury`
- SDK: `current.treasury.get()`, `setup()`, `createBudget()`, and `createProposal()`
- MCP: `current_get_community_treasury` and `current_create_treasury_proposal`
- Webhooks: `treasury.created`, `treasury.budget_created`, `treasury.proposal_created`, `treasury.proposal_approved`, `treasury.proposal_rejected`, and `treasury.payment_executed`

## Honest testnet status

This milestone proves a production-style workflow on Arc testnet. It is not an external audit, a regulatory opinion, an external pilot, or evidence of mainnet readiness. Mainnet use remains gated on official Arc production support and independent contract and product review.
