# Current CoFi

Current CoFi lets projects distribute USDC or their own Arc tokens to people
who do not already have wallets. A recipient signs in, receives an embedded
wallet, claims without paying gas, and becomes a measurable onchain user.

The first delivery milestone is intentionally narrow:

> A sender funds one private USDC claim on Arc Testnet, a new recipient signs
> in and receives an embedded wallet, the claim settles without recipient-paid
> gas, and the sender can see the final onchain result.

## Repository

```text
apps/
  api/                 Backend HTTP API
contracts/             Foundry Solidity project
packages/
  chain/               Arc network configuration and RPC client
scripts/               Developer utilities
docs/                  Architecture, Arc setup, and milestone documentation
```

## Prerequisites

- Node.js 22+
- pnpm 11+
- Foundry in WSL for Solidity builds and tests
- Docker Desktop later, when PostgreSQL and the worker are introduced

## Start locally

```powershell
Copy-Item .env.example .env
pnpm install
pnpm typecheck
pnpm test
pnpm arc:check
pnpm dev:api
```

The API listens on `http://localhost:3001` by default:

- `GET /health`
- `GET /v1/network`

Do not add real API keys or private keys to `.env.example`, source files, issue
comments, or shell commands. Use `.env` locally and a secrets manager in hosted
environments.

## Arc environments

Only Arc Testnet is currently available. The code rejects `arc-mainnet`
configuration until Arc publishes official mainnet parameters and contract
addresses. See [docs/ARC_SETUP.md](docs/ARC_SETUP.md).

## Next implementation slice

1. Create a Circle Developer Console test configuration.
2. Prove Google/email onboarding into an Arc Testnet SCA wallet.
3. Deploy and verify `ClaimVault` on Arc Testnet.
4. Add PostgreSQL records for distributions and claims.
5. Implement create/fund/claim/refund API flows.
6. Add Circle Gas Station sponsorship and webhook reconciliation.

The broader token, referral, analytics, merchant, escrow, and agent roadmap
starts only after the one-person USDC claim works repeatedly.
