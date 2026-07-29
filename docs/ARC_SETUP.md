# Arc setup for Current CoFi

Verified against official Arc and Circle documentation on July 28, 2026.

## Current network status

Arc is available on public testnet only. There are no official mainnet RPC,
chain ID, explorer, or Arc USDC contract addresses yet. Mainnet configuration
must not be guessed or copied from another chain.

Arc Testnet:

| Setting               | Value                                        |
| --------------------- | -------------------------------------------- |
| Chain ID              | `5042002`                                    |
| RPC                   | `https://rpc.testnet.arc.io`                 |
| WebSocket             | `wss://rpc.testnet.arc.io`                   |
| Explorer              | `https://testnet.arcscan.app`                |
| Gas asset             | USDC, native accounting uses 18 decimals     |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000` |
| USDC ERC-20 decimals  | 6                                            |
| CCTP domain           | `26`                                         |
| Faucet                | `https://faucet.circle.com`                  |

The 18-decimal native gas representation and 6-decimal ERC-20 interface share
one underlying USDC balance. Application transfers and balances should use the
ERC-20 interface and its 6 decimals.

## Accounts to create

1. Create a Circle Developer Console account and a **test** API key.
2. Under Wallets → User Controlled, configure Google and/or email
   authentication.
3. Create an Arc Testnet **SCA** wallet. SCA is required for Circle Gas Station
   sponsorship on EVM chains.
4. Confirm the default testnet Gas Station policy is active.
5. Create a separate Arc Testnet deployer wallet.
6. Fund the deployer with test USDC from the Circle Faucet.

Keep these roles separate:

- **Deployer:** testnet contract deployment only.
- **Claim authorizer:** backend key that signs a recipient-bound claim approval.
- **Recipient wallet:** user-controlled Circle SCA.
- **Future admin:** multisig; do not use a founder's everyday wallet.

## Local connectivity

```powershell
Copy-Item .env.example .env
pnpm arc:check
```

This checks the RPC chain ID, reads the current block and gas price, and confirms
that bytecode exists at the official USDC ERC-20 address. It does not submit a
transaction.

## Foundry on Windows

Arc's deployment guide uses Foundry and requires a Unix-like shell. Use WSL:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
cd "/mnt/c/Users/QWEESPY/Documents/Current CoFI/contracts"
forge install foundry-rs/forge-std --no-commit
forge test
```

To deploy after tests pass:

```bash
export ARC_TESTNET_RPC_URL="https://rpc.testnet.arc.io"
export PRIVATE_KEY="0x..."
export CLAIM_AUTHORIZER_ADDRESS="0x..."

forge script script/DeployClaimVault.s.sol:DeployClaimVault \
  --rpc-url "$ARC_TESTNET_RPC_URL" \
  --broadcast
```

Then verify with ArcScan's Blockscout verifier. Never commit the private key.

## Mainnet readiness

Treat mainnet as a release process, not an environment-variable flip. Start only
after Arc publishes official mainnet documentation:

1. Add official chain/RPC/explorer/USDC values with source links.
2. Create new LIVE Circle credentials and production wallet configuration.
3. Reconfigure restrictive Gas Station policies and billing.
4. Deploy through a multisig-controlled release process.
5. Use a production database, backups, alerts, reconciliation, and incident
   procedures.
6. Complete an independent smart-contract review.
7. Run a capped pilot with explicit value-at-risk limits.

Testnet addresses, test USDC, keys, policies, and deployment records must never
be reused on mainnet.
