# Circle grant review room

Current CoFi's review room converts an immutable evidence report into one reviewer-safe application package. It is designed around Circle's published selection areas: platform alignment, team execution, traction and path to success, and ecosystem impact.

## Public review URL

`https://www.currentco.finance/?grant=<proof_slug>#/grant`

The public page requires no Current CoFi account. The package exposes aggregate product metrics, public Arc anchors, architecture, shipped infrastructure, proposed milestones, and honest gaps. It excludes raw identities, private pilot contacts, login data, secrets, API keys, and recipient-level records.

Launch-vesting evidence includes funded batch, masked recipient, tranche, unlock, and confirmed-claim totals plus the campaign Merkle root and Arc funding receipt. Recipient identities, private schedule access credentials, and tranche claim tokens are never included.

## Integrity model

- The underlying evidence report is canonical JSON with a stored SHA-256 digest.
- The review package rechecks that evidence digest before rendering.
- The complete reviewer package receives its own deterministic SHA-256 digest.
- A new package creates a new immutable evidence snapshot; it never overwrites an older reviewer link.

## API and SDK

- Workspace: `GET|POST /api/v1/grant`
- Public: `GET /api/v1/grant/public?slug=<proof_slug>`
- Developer: `GET|POST /api/v1/developer/grant`
- SDK: `current.grant.list()` and `current.grant.create()`

Developer creation requires `evidence:write`, HMAC request signing, timestamp tolerance, and idempotency. Listing requires `analytics:read`.

## Claims boundary

The review room does not claim production mainnet approval, an independent audit, or external pilot traction unless those items exist in the immutable evidence. Requirements that depend on outside teams, auditors, or Arc mainnet remain explicitly named in the honest-gap register.
