# Current CoFi Builder Integration Lab

The Builder Integration Lab gives Arc teams one guided path from product selection to a verifiable, grant-ready integration. It is deliberately narrower than the full developer portal: a builder chooses a use case and integration mode, ships the complete walletless activation loop, and receives a project-scoped readiness score backed by real system records.

## Public discovery

`GET /api/v1/integration-manifest` publishes a stable, digest-addressed description of the supported integration paths, Circle stack, endpoint contract, webhook events, and security boundaries. It requires no credentials and can be consumed by humans, code generators, or AI agents.

## Project readiness

Signed-in projects use `GET /api/v1/integration-readiness`. Server integrations use `GET /api/v1/developer/integration-readiness` with an API key containing `analytics:read`.

The score only awards credit for recorded proof:

- active and exercised API credentials;
- enabled and delivered signed webhooks;
- a created distribution and confirmed Arc claim;
- an offchain identity attestation;
- a post-claim activation event;
- an optional policy-bound agent action; and
- a frozen, digest-verified evidence report.

No check can be manually marked complete in the interface. The database and Arc-linked workflow remain the source of truth.

## Integration paths

- `@currentcofi/sdk` for trusted servers;
- `@currentcofi/react` for embedded claim experiences;
- REST plus HMAC for other backend stacks; and
- the public agent tool manifest for policy-bound machine actions.

The API key and signing secret must never enter a browser bundle. React embeds receive hosted claim URLs, not developer credentials.
