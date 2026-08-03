# Verifiable walletless giveaways

Current CoFi giveaways turn a public community campaign into a fully funded Arc allocation and a reproducible winner draw. A project can use native test USDC or an inspected Arc project token. The winner receives one private Current claim link and can onboard through an embedded Circle wallet without arriving with a wallet or gas.

## Integrity model

1. Current creates a cryptographically random secret and publishes its SHA-256 commitment before the campaign is funded.
2. That commitment is embedded in the winner allocation identity, binding the commitment into the campaign Merkle root.
3. Entrant identities are normalized, encrypted at rest, and uniqueness-constrained per giveaway. Public and project views expose masked labels only.
4. After the deadline or entry cap, Current sorts the public entry digests and hashes the complete entry set.
5. Current reveals the original secret, hashes the secret, giveaway ID, and entry-set digest, and maps the digest to a winner index.
6. The public page exposes the commitment, reveal, entry-set digest, draw digest, and masked winner so the selection can be reproduced independently.

## Product surfaces

- Signed-in project workspace for creation, Circle-wallet prize funding, status, referrals, draw, and winner claim recovery.
- Public mobile-first entry page with no wallet requirement, encrypted identity entry, one-level referral attribution, prize custody status, and public draw proof.
- Scoped developer API and TypeScript SDK for project integrations.
- MCP tools for agent discovery and explicitly approved creation. Funding remains a separate Circle-wallet action.
- Privacy-safe aggregate evidence in `current-evidence-v17` for Circle grant review.

## Boundaries

- A giveaway cannot open before the complete prize is funded.
- It cannot draw while the entry window is open unless the published cap is reached.
- It requires at least two unique entries.
- Public APIs never return raw identities, encryption ciphertext, the private winning claim, or unrevealed randomness.
- Referral attribution does not automatically create a financial entitlement.
- This is testnet software and not a source of certified randomness. Production use should add an independently reviewed randomness strategy if the prize or regulatory context requires it.
