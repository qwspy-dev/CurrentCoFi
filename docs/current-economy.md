# $CURRENT testnet economy

Current CoFi's token dashboard reads its numbers directly from Arc testnet. It never fills empty protocol history with estimates, market values, or fictional partner activity.

## Contract stack

- `CurrentToken`: fixed one-billion testnet supply with permit and burn support.
- `CurrentLockVault`: noncustodial, time-bound project locks. Only the named beneficiary can withdraw after expiry.
- `CurrentFeeRouter`: receives product fees in test USDC and allocates 35% to the buyback reserve, 25% to gas sponsorship, 20% to protocol liquidity, and 20% to operations.

## Buyback execution

Product fees immediately increase the onchain buyback reserve. Purchases are intentionally batched rather than swapped after every small fee. Only an owner-approved exchange adapter can use the reserve, and every execution enforces a minimum `$CURRENT` output.

Purchased tokens are routed 50% to burn, 25% to a one-year protocol lock, and 25% to the liquidity treasury. No exchange adapter is approved until Arc mainnet venues and liquidity are known.

## User-wallet actions

Project locks and product-fee proofs use the same Circle user-controlled wallet challenge flow as distributions. Users explicitly approve the asset and then explicitly approve the lock or fee route. Current CoFi records the Circle challenge state, reconciles the transaction, and emits `current.locked` or `fee.routed` webhooks after confirmation.

## Testnet boundary

`$CURRENT`, test USDC, contract balances, and all dashboard activity in this milestone have no monetary value. The mainnet supply, allocations, governance, liquidity venue, and exchange adapter remain unissued and require a separate production decision.
