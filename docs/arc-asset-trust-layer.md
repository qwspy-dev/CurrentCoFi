# Arc asset trust layer

Current CoFi inspects a project-token contract before it can enter a personal link, social payment, or campaign flow.

The inspection is not treated as a one-time approval. Current stores an approved control baseline and rechecks it before campaign or claim-link funding, before each wallet-bound claim authorization when the latest observation is stale, and during a scheduled daily review.

## Reproducible observations

- Runtime bytecode presence, size, and hash
- ERC-20 name, symbol, decimals, and reported total supply
- An active `owner()` address when the interface is exposed
- The EIP-1967 implementation storage slot
- Runtime-code appearances of monitored mint, pause, blacklist, and upgrade selectors
- A deterministic review digest attached to the persisted token record
- A separate control digest that excludes ordinary total-supply changes

## Drift enforcement

Changes to runtime bytecode, the reported owner, the EIP-1967 implementation, or monitored privileged selectors create a control-drift event. Current blocks new funding, stops issuing claim authorizations, pauses affected active campaigns, records an audit event, and shows the difference in the project control plane.

An authorized project operator can recheck the live contract and explicitly acknowledge the latest baseline. That action is timestamped, attributed, retained in review history, and only resumes campaigns that were paused specifically for token-control drift. Acknowledgement is not an endorsement or safety determination.

## Product policy

USDC at Arc's configured Circle address is labeled Circle verified. Other readable ERC-20 contracts remain distributable with disclosure. A caution signal asks the project and recipient to review an observable control; it does not claim the function is reachable, malicious, or controlled by a specific party.

Current CoFi never labels a token “safe,” predicts market value, replaces an audit, or guarantees transfer behavior. The review is a contract-observation layer that makes arbitrary-asset distribution more accountable.
