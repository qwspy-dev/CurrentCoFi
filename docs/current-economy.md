# $CURRENT testnet economy

Current CoFi's token dashboard reads its numbers directly from Arc testnet. It never fills empty protocol history with estimates, market values, or fictional partner activity.

## Contract stack

- `CurrentToken`: fixed one-billion testnet supply with permit and burn support.
- `CurrentLockVault`: noncustodial, time-bound project locks. Only the named beneficiary can withdraw after expiry.
- `CurrentFeeRouter`: receives product fees in test USDC and allocates 35% to the buyback reserve, 25% to gas sponsorship, 20% to protocol liquidity, and 20% to operations.
- `CurrentAccessManager`: converts a project's active, noncustodial lock into an expiring Stream, Surge, or Current product tier.
- `CurrentBuybackGovernor`: queues adapter updates and buybacks behind a public delay. A separately controlled guardian can cancel pending operations but cannot move protocol funds.
- `CurrentTestnetExchangeAdapter`: testnet-only fixed-rate liquidity used to prove the complete fee-to-purchase path before a mainnet venue exists.
- `CurrentCheckoutRouter`: user-controlled exact-input checkout settlement. Only owner-approved token and adapter pairs can convert into an exact USDC merchant receipt; unused input returns atomically.
- `CurrentTestnetCheckoutAdapter`: isolated fixed-rate `$CURRENT` to test-USDC route used only to prove the checkout path. It is not a market, price feed, or production liquidity claim.

## Buyback execution

Product fees immediately increase the onchain buyback reserve. Purchases are intentionally batched rather than swapped after every small fee. Only a governor-approved exchange adapter can use the reserve, and every execution enforces a minimum `$CURRENT` output.

The governor must publish each adapter change or buyback before its execution delay begins. Anyone can inspect a queued operation and execute it after the delay, while the guardian can cancel it during that window. The governor owns the fee router, so the former direct owner path no longer bypasses the queue.

Purchased tokens are routed 50% to burn, 25% to a one-year protocol lock, and 25% to the liquidity treasury. The approved Arc testnet adapter is explicitly fixed-rate and test-only; a mainnet adapter remains unapproved until real venues and liquidity are known.

## Project access

Projects activate product capacity by synchronizing one of their verified lock positions:

- Stream: 100 CURRENT, up to 1,000 campaign recipients.
- Surge: 5,000 CURRENT, up to 10,000 campaign recipients.
- Current: 25,000 CURRENT, up to 100,000 campaign recipients.

Access expires with the underlying lock. The access manager never takes custody and refuses expired, withdrawn, mismatched, or insufficient positions.

## User-wallet actions

Project locks and product-fee proofs use the same Circle user-controlled wallet challenge flow as distributions. Users explicitly approve the asset and then explicitly approve the lock or fee route. A confirmed lock receives a third wallet challenge that activates its product tier. Current CoFi records every challenge, reconciles the transactions, and emits `current.locked`, `current.access-activated`, or `fee.routed` webhooks after confirmation.

Project-token checkout uses two user-controlled wallet confirmations: an exact token approval to the isolated checkout router, followed by an atomic settlement call. The router refuses unapproved routes, stale deadlines, excessive input, and any adapter execution that fails to increase the merchant's USDC balance by the exact checkout price. Direct USDC checkout remains a one-confirmation wallet-to-merchant transfer.

## Testnet boundary

`$CURRENT`, test USDC, contract balances, and all dashboard activity in this milestone have no monetary value. The mainnet supply, allocations, governance, liquidity venue, and exchange adapter remain unissued and require a separate production decision.
