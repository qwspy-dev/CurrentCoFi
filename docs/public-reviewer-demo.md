# Public verified reviewer demo

The account-free reviewer demo at `/#/reviewer-demo` reconstructs Current CoFi's core product loop from persisted Arc testnet evidence. Its source is `GET /api/v1/reviewer-demo`.

The replay is deliberately non-mutating. It never creates a wallet, campaign, claim, activation, or transaction and therefore never inflates public traction. Stages backed by public Arc transaction hashes are labeled `verified-live-anchor`; privacy-safe database outcomes are labeled `verified-aggregate-record`; the final evidence stage is `digest-verified`.

No project name, campaign name, database ID, recipient identity, email, social handle, wallet address, API credential, or private contact is returned. The entire replay has a canonical SHA-256 digest.
