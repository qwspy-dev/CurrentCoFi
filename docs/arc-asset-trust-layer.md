# Arc asset trust layer

Current CoFi inspects a project-token contract before it can enter a personal link, social payment, or campaign flow.

## Reproducible observations

- Runtime bytecode presence, size, and hash
- ERC-20 name, symbol, decimals, and reported total supply
- An active `owner()` address when the interface is exposed
- The EIP-1967 implementation storage slot
- Runtime-code appearances of monitored mint, pause, blacklist, and upgrade selectors
- A deterministic review digest attached to the persisted token record

## Product policy

USDC at Arc's configured Circle address is labeled Circle verified. Other readable ERC-20 contracts remain distributable with disclosure. A caution signal asks the project and recipient to review an observable control; it does not claim the function is reachable, malicious, or controlled by a specific party.

Current CoFi never labels a token “safe,” predicts market value, replaces an audit, or guarantees transfer behavior. The review is a contract-observation layer that makes arbitrary-asset distribution more accountable.
