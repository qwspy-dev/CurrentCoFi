# Consumer asset swaps

Current CoFi's account can convert a supported Arc project token into an exact amount of test USDC through the same governed router used by merchant checkout. The feature deliberately fails closed: it does not display a price or request wallet approval unless the configured router returns an exact-output quote for a qualified token and adapter.

## User flow

1. The account reads the user's verified Arc balances.
2. Only a token matching the configured qualified route receives a **Swap to USDC** action.
3. The user chooses the exact test USDC output and requests a quote.
4. Current reads the router onchain and shows the exact maximum project-token input, output, expiry, and testnet boundary.
5. The Circle wallet approves only that quoted input.
6. A second wallet challenge calls `settleExactUSDC` with the user's own Arc wallet as recipient.
7. The router returns unused input and transfers exact test USDC to the user.
8. Current stores an immutable receipt and adds it to unified account activity.

## Safety properties

- No arbitrary token routes.
- No fabricated project-token valuation.
- Exact token approval rather than unlimited allowance.
- The create request must reproduce the exact input shown in the user's quote or it is rejected for re-review.
- Quote and settlement bound to the configured router, token, and adapter.
- Separate approval and settlement challenges bound to one user and swap record.
- Ten-minute settlement deadline.
- Exact USDC output; unused input is returned by the router.
- Testnet disclosures remain visible in quote and receipt states.
- The production UI remains unavailable until the router and adapter addresses are explicitly configured.

## Activation requirements

The code and database model are complete. Live Arc testnet settlement requires these server-only environment variables:

- `CURRENT_CHECKOUT_ROUTER_ADDRESS`
- `CURRENT_TESTNET_CHECKOUT_ADAPTER_ADDRESS`
- `CURRENT_TOKEN_ADDRESS`

The first two addresses are produced by `pnpm run contracts:deploy:checkout`. The sensitive deployer key is write-only in Vercel and must be supplied locally by an authorized founder for that one deployment. No secret belongs in source control.
