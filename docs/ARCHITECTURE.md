# Backend architecture

## First vertical slice

```text
sender
  -> API creates an offchain claim ID and cryptographic secret
  -> sender approves and funds ClaimVault with USDC
  -> API stores only the secret hash and encrypted link material
  -> recipient opens link and signs in with Circle
  -> Circle creates/loads an Arc Testnet SCA
  -> API authorizes that wallet for the claim
  -> recipient signs the claim transaction
  -> Circle Gas Station sponsors gas
  -> indexer observes ClaimCompleted and reconciles the database
```

The blockchain is authoritative for asset custody and terminal claim status.
The database is authoritative for private identity mappings, attribution,
encrypted link data, and product UX state.

## Security decisions

- A raw link secret is not sufficient to redirect funds. The backend signature
  binds the claim to the authenticated recipient wallet. This prevents a
  mempool observer from stealing a secret revealed in transaction calldata.
- Raw emails, social handles, and link secrets are never written onchain.
- Claim IDs and secrets are independently random 32-byte values.
- Token amounts are integers in token base units; USDC application amounts use
  6 decimals.
- The contract rejects fee-on-transfer tokens so accounting remains solvent.
- Every write endpoint will require idempotency keys.
- Circle webhooks are inputs, not final truth. The reconciler verifies events
  against the Arc RPC.

## Planned services

- **API:** projects, distributions, claims, authorizations, refunds, webhooks.
- **Worker/indexer:** transaction submission, receipt tracking, event indexing,
  webhook delivery, and reconciliation.
- **PostgreSQL:** product state and immutable audit records.
- **Queue:** durable jobs with retries and idempotency.
- **Contracts:** custody and enforceable claim/refund state.

Do not split the API and worker into separately deployed services until the
first vertical slice needs asynchronous reconciliation. Keep package
boundaries now so the extraction is mechanical later.
