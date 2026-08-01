# Current CoFi security threat model

## Protected assets

Current CoFi protects escrowed USDC and project tokens, user-controlled embedded wallets, claim authorizations, recipient identities, project API credentials, agent policies, campaign evidence, protocol reserves, and governance authority.

## Trust boundaries

1. A public browser crosses into Current CoFi through OAuth/Circle authentication and public claim links.
2. Project servers and agents cross through scoped bearer keys plus HMAC-signed mutation requests.
3. The application crosses into Arc through configured RPC endpoints and Circle-controlled wallet execution.
4. Protocol governors cross into vaults only after a public delay. An independent guardian can cancel or pause but cannot execute.
5. External transport and liquidity adapters remain untrusted until their exact runtime bytecode, asset pair, and risk limits match the onchain registry.

## Priority adversaries

- A link thief attempting to redirect or replay another recipient's claim.
- A recipient attempting to claim twice, exceed a Merkle allocation, or recover funds it does not own.
- A malicious project or API key attempting cross-project access, forged activations, duplicated events, or policy bypass.
- A compromised agent attempting to exceed its asset, amount, identity, daily-volume, or approval boundary.
- A compromised protocol owner attempting instant reserve movement or unreviewed code substitution.
- A compromised guardian attempting to execute rather than cancel an operation.
- A malicious adapter or venue attempting to swap a different pair, exceed slippage/allocation ceilings, or change code after qualification.
- An observer attempting to recover raw recipient identities from chain state, evidence exports, public APIs, errors, or logs.

## Defensive strategy

Funds remain in narrow-purpose vaults. Claims use one-time state, expiry, domain-separated signatures, recipient binding, and Merkle proofs. Identity is verified offchain and represented by project-scoped hashes. Developer mutations use scoped hashed credentials, HMAC signatures, timestamp tolerance, replay protection, and durable audit events. High-value protocol actions are queued through delayed governors with independent cancellation and emergency pause controls. Runtime bytecode and release manifests are verified publicly. Operational failures return generic public messages while detailed exceptions remain in structured private logs.

## Residual risk

Current CoFi depends on Circle, Arc RPC, OAuth providers, CCTP, Gateway, and eventually selected liquidity venues. The codebase has extensive internal checks but has not completed independent external review. Testnet readiness must not be interpreted as mainnet certification.
