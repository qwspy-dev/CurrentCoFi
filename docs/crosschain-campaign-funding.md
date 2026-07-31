# Crosschain campaign funding

Current CoFi funds Arc campaigns from native testnet USDC on supported EVM testnets without replacing the recipient-facing Arc settlement model.

## Settlement path

1. The operator selects a USDC campaign in `awaiting_funding`.
2. Current requests a fresh CCTP V2 Standard + Forwarding Service quote.
3. The operator authorizes a Circle user-controlled SCA on the source network.
4. The source wallet approves TokenMessengerV2 for the quoted burn total.
5. `depositForBurnWithHook` burns the campaign allocation plus the quoted Circle fees.
6. Circle's Forwarding Service mints the requested allocation to the same operator's Arc wallet.
7. Current verifies `forwardTxHash` through the Circle Iris API.
8. The operator uses the existing Arc approval and CampaignVault funding flow.
9. The route becomes `complete` only after the source burn, Arc mint, and campaign funding transaction hashes exist.

Project tokens are not bridged by this module. They must already exist on Arc before being placed in a Current CoFi campaign.

## Persistent states

`created → wallet_authorizing → wallet_ready → approving → approved → source_authorizing → source_confirmed → arc_arrived → complete`

Each route stores the quote, domains, token addresses, wallet, Circle challenge references, CCTP message hash, source transaction, Arc forward transaction, and campaign funding transaction. Failed or interrupted browser sessions resume from the latest persisted state.

## Supported testnet sources

- Ethereum Sepolia
- Avalanche Fuji
- OP Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Polygon Amoy

All contract addresses, domain IDs, and USDC addresses are explicit configuration data. The destination is Arc Testnet domain 26.

## Integration surface

- Signed-in app: `GET/POST /api/v1/funding`
- Project API: `GET /api/v1/developer/funding`
- SDK: `current.funding.list()`
- Webhooks:
  - `crosschain.funding.created`
  - `crosschain.funding.source-confirmed`
  - `crosschain.funding.arc-arrived`
  - `crosschain.funding.campaign-funded`
- Grant evidence: source, Arc, and vault anchors are included in evidence schema v4.

## Production boundary

The current deployment is testnet-only. Route completion proves testnet transactions and does not imply that Arc mainnet or real-value USDC is available. Mainnet chain codes and addresses must be added only after Circle publishes production support.
