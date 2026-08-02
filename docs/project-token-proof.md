# Public project-token proof

Current CoFi's core claim includes both USDC and arbitrary Arc project tokens. The public project-token proof makes that second path independently reviewable without counting a protocol-owned demonstration as external traction.

## Public surfaces

- `GET /api/v1/project-token-proof` returns a canonical, SHA-256-addressed proof assembled from live Arc testnet contract reads and checked-in deployment anchors.
- `/#/project-token-proof` presents the asset, reserve, delayed governance, funded campaign, completed recipient settlement, contracts, and transactions in an account-free reviewer interface.
- `current.proofs.projectToken()` exposes the same record through the TypeScript SDK.
- The public Circle grant dossier links to the proof and includes a compact capability summary.

## What is proven

1. A standard ERC-20 demonstration token is deployed on Arc testnet.
2. Delayed governance approves its metadata commitment and registered treasury.
3. The partner reserve holds a 100,000 CPT deposit.
4. Governance funds a 10,000 CPT, 100-recipient Merkle campaign in the walletless campaign vault.
5. Governance separately funds an isolated 25 CPT allocation for one recipient.
6. The recipient claims the complete allocation through the same campaign vault, leaving zero CPT remaining and the campaign in its completed state.
7. Public contract state and transaction anchors agree with the presented record.

The completed settlement is anchored by Arc testnet transaction `0xfad01a7d1feeb893480a9b65bc847a72a69b7400b88e6d4d3d18541bd3dd51e0`.

## Honest boundary

CPT has no monetary value and implies no external partner endorsement. The completed claim demonstrates protocol-owned settlement capability; it is not included in Network Proof's persisted user-traction totals and is not presented as an external pilot. That distinction remains explicit in the API, reviewer UI, and grant dossier.
