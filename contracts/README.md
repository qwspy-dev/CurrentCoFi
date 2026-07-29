# Contracts

Foundry project for Current CoFi's onchain custody and claim logic.

`ClaimVault` is the first vertical slice. It supports:

- exact-balance ERC-20 funding;
- secret-protected claims;
- backend authorization bound to the recipient wallet;
- expiration and permissionless refund execution;
- optional sender cancellation;
- pause, authorizer rotation, and ownership transfer.

The recipient-bound authorization is essential. A secret is revealed in claim
calldata, so a secret-only design can be stolen by a mempool observer. A copied
transaction cannot redirect funds because the backend signature includes the
chain ID, vault address, claim ID, recipient, and deadline.

## Test

Install Foundry and `forge-std`, then run:

```bash
forge install foundry-rs/forge-std --no-commit
forge fmt --check
forge test
```

This contract is an unaudited starting point and must not hold real funds.
