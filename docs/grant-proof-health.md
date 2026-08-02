# Grant proof health

Current CoFi publishes one account-free health record that continuously evaluates whether its major Circle grant claims remain reproducible.

## Public surfaces

- `GET /api/v1/proof-health` returns the canonical, SHA-256-addressed health record.
- `/#/proof-health` presents all six checks, their evidence links, digests, and external boundaries.
- `current.proofs.health()` exposes the same record through the TypeScript SDK.
- The public grant dossier links directly to both the page and API.

## Checks

1. Persisted network metrics use verified Arc testnet records only.
2. Campaign evidence exposes funding, claims, activation, and recovery without recipient identities.
3. The arbitrary ERC-20 rail includes a completed governed recipient settlement.
4. The active release manifest matches the registered contract addresses and runtime bytecode.
5. Builder paths and scoped endpoints remain bound to the public integration manifest.
6. Every internal security control is implemented while independent audit status remains explicit.

## Monitoring

Vercel invokes `/api/v1/internal/proof-monitor` on a protected daily schedule. A degraded record is written to structured logs and can be forwarded to the configured error webhook. The public endpoint remains independently callable by reviewers at any time.

## Honest boundary

Proof health verifies Current CoFi's own testnet technology and published records. It does not self-attest external partners, independent audit completion, token legal approval, or Arc mainnet availability.
