# Public campaign proof explorer

`GET /api/v1/campaign-proofs` publishes an account-free, digest-verifiable view of Current CoFi's persisted Arc testnet campaigns.

The response includes anonymous campaign references, asset metadata, aggregate allocation states, confirmed settlement hashes, activation/referral totals, identity-attestation types, funding anchors, recovery state, and CCTP/Gateway transaction evidence. It intentionally excludes project and campaign names, raw database IDs, recipient identities, wallet addresses, emails, social handles, API credentials, and private pilot data.

Each campaign and the complete response have a SHA-256 digest over recursively key-sorted JSON. Public aliases are one-way hashes of internal campaign IDs and cannot be used to recover those IDs.
