# Walletless launch vesting

Current CoFi can commit and fully fund time-based USDC or Arc project-token allocations for people who do not yet have wallets. A project creates one batch, assigns an offchain identity and total amount to each recipient, chooses a cliff and release cadence, then funds every tranche in the existing Arc campaign vault.

## Product flow

1. The project selects USDC or an inspected Arc ERC-20.
2. Recipient identities are normalized, hashed, and encrypted before persistence.
3. Each total allocation is split exactly across 2–24 tranches; integer remainder is added to the final tranche so no atomic units disappear.
4. Every tranche becomes an identity-bound campaign allocation and is committed into the distribution Merkle root.
5. The complete allocation is approved and funded through the authorized Circle wallet.
6. Each recipient receives one private schedule link. It creates no wallet and reveals no claim credential until the recipient opens it.
7. A tranche claim URL appears only after its published unlock time. The settlement authorizer independently rejects early claims with `ALLOCATION_LOCKED` even if a private token is obtained.
8. Claiming uses the standard Current embedded-wallet and gas-sponsored Arc settlement flow.

## Privacy and proof

- Raw recipient identities, schedule access tokens, and tranche claim credentials are encrypted at rest.
- Public proof pages expose masked recipients, asset, total allocation, schedule, Merkle root, and funding transaction only.
- Private recipient pages require a high-entropy access credential and expose claim links only for unlocked, funded, unclaimed tranches.
- Grant evidence schema `current-evidence-v18` exports aggregate vesting counts and public Arc anchors without private identity or claim material.

## Builder access

- Product API: `GET|POST /api/v1/vesting`
- Public proof/private schedule: `GET /api/v1/vesting/public`
- HMAC developer API: `GET|POST /api/v1/developer/vesting`
- TypeScript SDK: `current.vesting.list()` and `current.vesting.create(...)`
- MCP: `current_list_launch_vesting` and `current_create_launch_vesting`
- Lifecycle webhook: `vesting.created`; later tranche claims reuse the canonical `claim.completed` event.

## Honest boundary

Creating a batch does not move funds. Funding requires the authorized Circle wallet to approve and deposit the exact asset into the Arc campaign vault. Testnet assets have no monetary value, and production deployment still requires independent contract review and Arc mainnet availability.
