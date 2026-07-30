# Current CoFi backend architecture

## Product boundary

Current CoFi turns an offchain recipient into an authenticated user, provisions an embedded Arc wallet, authorizes a funded claim, sponsors the Arc transaction, and measures whether that user later activates inside the originating project.

The blockchain is the source of truth for funded assets and claim settlement. PostgreSQL is the source of truth for accounts, private identity bindings, project configuration, attribution, API access, webhook delivery, and indexed product analytics.

## Production services

- `api/v1`: versioned Vercel Functions using Web `Request` and `Response`.
- `server/config.ts`: validated environment and public Arc configuration.
- `server/http.ts`: uniform success/error envelopes, request IDs, and response security.
- `server/db`: PostgreSQL schema and lazy Neon-compatible connection.
- Circle Wallets: embedded wallet provisioning and social/email authentication in Group 2.
- Arc contracts: distribution vaults and claim authorization in Group 3.
- Workers/queues: transaction reconciliation, webhooks, campaigns, and buyback accounting in later groups.

## Trust boundaries

- Raw social identifiers and email addresses are never written onchain.
- Identity allocations use hashes; claim contracts receive signed authorizations.
- API keys, webhook secrets, claim secrets, and provider subjects are stored only as hashes.
- User funds, campaign funds, sponsored gas, operations, and token-economy reserves remain separate.
- All financial mutations will require idempotency keys and audit events.
- Production mutation capabilities remain disabled until persistent storage and Circle credentials are configured.

## Data domains

| Domain | Primary records |
| --- | --- |
| Accounts | users, identities, wallets |
| Organizations | projects, project members |
| Assets | tokens |
| Distribution | distributions, allocations, claims |
| Growth | referrals, activation events |
| Developers | API keys, webhook endpoints, deliveries |
| Reliability | idempotency keys, audit events |

## Frontend integration

The frontend imports only `lib/api/client.ts` and shared response types. UI components do not import database, Circle, or contract code. Mock product data can be replaced resource-by-resource without rebuilding the interface.

## Deployment

The cinematic frontend remains a static Vercel output. Root `api/**/*.ts` files deploy as Vercel Functions in the same project and domain. This preserves the existing visual build while introducing a production API incrementally.
