# Active wallet transfers

Current CoFi recipients can move USDC or any inspected Arc project token directly from the embedded wallet created during onboarding. This closes the product loop from **offchain audience → funded wallet → active token user** without introducing custody or a generic hot-wallet signer.

## User flow

1. The account portfolio reads live ERC-20 balances from Arc testnet.
2. The user selects a detected asset, exact amount, and Arc destination.
3. The backend rejects invalid addresses, self-transfers, unsupported tokens, non-positive precision, and amounts above the live onchain balance.
4. Circle creates an exact `transfer(address,uint256)` challenge for the user-controlled wallet.
5. The user approves that challenge in the Circle SDK.
6. Current verifies the challenge belongs to the signed-in account and persisted transfer before accepting Circle's final transaction state.
7. The receipt and transaction hash join claims, social payments, checkout, and subscriptions in one account activity record.

## Security boundary

- Current never receives or redirects the asset.
- A transfer challenge is bound to one user, one stored transfer, one destination, one asset, and one exact amount.
- The database transition from `authorizing` to `confirmed` is conditional, preventing duplicate confirmation.
- Project tokens remain unpriced unless a trustworthy market source is added later.
- Arc testnet balances have no monetary value.

## API

`POST /api/v1/portfolio/transfer`

Prepare with `tokenAddress`, `destination`, `amount`, and an optional `note`. Confirm with the returned `transferId` and `challengeId` after executing the Circle wallet challenge.
