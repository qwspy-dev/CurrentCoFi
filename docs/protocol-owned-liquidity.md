# Protocol-owned liquidity

Current CoFi routes 20% of every USDC product fee to a dedicated liquidity vault. The fee router also sends 25% of every fee-funded `$CURRENT` purchase to the same vault, creating a paired reserve from actual product activity rather than an offchain accounting promise.

## Control model

- `CurrentLiquidityVault` holds only `$CURRENT` and Arc USDC and exposes its balances publicly.
- `CurrentLiquidityGovernor` owns the vault. Adapter approvals, liquidity provisions, and removals must be queued for at least 30 seconds on Arc testnet before anyone can execute them.
- A separately configured guardian may cancel a queued operation or pause the vault, but cannot move reserve assets.
- Venue integrations use replaceable allowlisted adapters so Current is not permanently coupled to a testnet venue or an unconfirmed Arc mainnet exchange.
- Idle withdrawals require the vault to be paused and remain owner-only, which means they are impossible through the deployed governor's public interface.

## Accounting proof

The vault publishes idle `$CURRENT` and USDC balances, cumulative deployed amounts, returned amounts, current liquidity shares, position counts, and removal counts. The public token dashboard and developer API read those values directly from Arc testnet.

The deployed `CurrentTestnetLiquidityAdapter` is deliberately labeled as a no-value proof adapter. It demonstrates paired-reserve transfer, share accounting, delayed execution, removal, and public verification without claiming production market depth. A mainnet exchange adapter will replace it only after Arc mainnet venues and liquidity conditions are confirmed.

## Developer API

`GET /api/v1/developer/liquidity` requires a project API key with `analytics:read`. The TypeScript SDK exposes the same proof through `current.liquidity.get()`.
