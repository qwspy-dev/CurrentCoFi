# Circle reviewer bundle

Current CoFi exposes a reviewer-safe ZIP at `/api/v1/grant-bundle/download` and its latest public manifest at `/api/v1/grant-bundle`.

The archive contains the canonical application, technical dossier, security posture, internal audit handoff, builder integration manifest, MCP manifest, external-gap register, live reviewer links, per-file SHA-256 checksums, and a digest-addressed manifest. It excludes recipient identities, wallet addresses, API credentials, sessions, private founder details, and private pilot contacts.

The bundle is evidence packaging, not an endorsement or external validation. External pilots, an independent audit, legal review, Arc mainnet availability, and the grant application window remain explicitly outside Current CoFi's self-attested boundary.

## Verification

1. Hash each content file exactly as stored and compare it with `checksums.sha256` and `manifest.json`.
2. Verify the application, dossier, security, audit, integration, and MCP digests against their source documents.
3. Follow `reviewer-links.json` to re-check public evidence against the currently deployed product.
4. Treat the manifest inside each ZIP as authoritative for that specific snapshot; the public manifest endpoint always describes its own latest generated snapshot.
