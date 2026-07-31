# Governed partner-token vaults

Current CoFi partner vaults let Arc projects contribute their own tokens to a transparent reserve and convert those reserves into fully funded walletless campaigns. The module extends the existing arbitrary-ERC20 campaign vault rather than introducing a second claim system.

## Onchain path

1. Governance approves a token, its partner treasury, and a metadata commitment after a public delay.
2. Anyone may deposit the approved token with a public reference hash.
3. A campaign-funding operation is queued with its exact amount, recipient count, expiry, and allocation root.
4. The guardian may cancel during the delay but cannot change the recipient, asset, or amount.
5. After the delay, the governor moves the exact allocation into `CurrentCampaignVault`, which records a fully funded campaign.
6. Unused reserve can return only to the token's registered treasury, only while the partner vault is paused, and only through delayed governance.

## Contracts

- `CurrentPartnerVault`: approved-asset reserve, contribution receipts, campaign funding, and constrained returns.
- `CurrentPartnerGovernor`: delayed operations and guardian cancellation.
- `CurrentCampaignVault`: the existing funded walletless campaign and claim system.
- `CurrentTestnetPartnerToken`: a valueless Arc testnet proof asset; it does not imply a partner endorsement.

## Integration surface

- `GET /api/v1/partners` exposes public contract, reserve, governance, and proof-campaign state.
- `GET /api/v1/developer/partners` exposes the same state to authorized project API keys.
- `current.partners.get()` is available in the TypeScript SDK.
- The Partner vault application view gives projects and grant reviewers a readable live proof backed by Arc contract reads.

## Security properties

- The governor owns the reserve; an everyday operator cannot fund or withdraw directly.
- Queued payloads are hashed, so execution cannot substitute different campaign parameters.
- Fee-on-transfer tokens are rejected because campaign solvency depends on exact deposits.
- Campaigns are fully funded before activation.
- Guardian authority is cancellation and pausing, not asset redirection.
- Raw partner metadata can remain offchain while its commitment is anchored onchain.

The deployment script creates one 100,000 CPT demonstration reserve and funds a 10,000 CPT, 100-recipient proof campaign on Arc testnet. CPT has no monetary value.
