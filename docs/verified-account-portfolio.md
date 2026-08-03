# Verified account portfolio

Current CoFi gives every signed-in recipient one account view for Arc assets and Current settlement activity.

## Data boundary

- ERC-20 balances are read directly from Arc testnet at a disclosed block number.
- The token catalog contains USDC plus project tokens already known to Current CoFi.
- USDC is the only asset included in the parity total.
- Project tokens are shown as **unpriced** unless a future, trustworthy market-data source is explicitly integrated.
- Claims, social payments, merchant checkout, and subscription events come from persisted Current settlement records and link to ArcScan whenever a transaction hash exists.
- Demo data is never presented as a verified account balance.

## API

`GET /api/v1/portfolio` requires the encrypted Current account session. The response includes the wallet, Arc block, data provenance, valuation boundary, token balances, and a reverse-chronological activity ledger.

## Integration notes

The account UI treats RPC failures per asset. One unreadable token does not fabricate or hide the rest of the portfolio. Backend integrations can later add trusted pricing without changing the balance or activity contracts.
