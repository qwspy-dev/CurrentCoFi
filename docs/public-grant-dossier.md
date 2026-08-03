# Public grant dossier

Current CoFi exposes one account-free Circle reviewer entry point:

- Product: `https://www.currentco.finance/#/grant-dossier`
- Machine-readable API: `GET https://www.currentco.finance/api/v1/grant-dossier`
- SDK: `current.dossier.get()`

The dossier combines the product thesis, Arc and Circle architecture, shipped infrastructure, aggregate network proof, release verification, security posture, selection-criteria mapping, proposed grant milestones, and an honest external-gap register. The response is canonicalized and receives a SHA-256 digest.

The shipped scope now includes walletless launch vesting: projects can commit and fund USDC or project-token allocations with encrypted offchain identities, public schedules, Merkle-committed tranches, authorizer-enforced cliffs, gas-sponsored claims, and developer/agent access. Aggregate proof is exported through `current-evidence-v18` without private recipient credentials.

## Claims boundary

The dossier distinguishes three kinds of evidence:

1. Live aggregate database records such as campaigns, confirmed claims, funded wallets, and activated users.
2. Publicly inspectable technical evidence such as manifests, APIs, source code, testnet release controls, and security documentation.
3. External gates that Current CoFi cannot self-attest: named pilots, independent audit completion, Arc mainnet availability, and token legal review.

It never exposes recipient identities, individual wallet addresses, API keys, private pilot contacts, or account records. Project-specific immutable evidence packages remain available separately through their signed public grant-review links.
