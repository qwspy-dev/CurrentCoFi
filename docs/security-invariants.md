# Current CoFi protocol invariants

These properties must hold in contract tests, integration tests, deployment rehearsal, and an independent review.

1. A claim identifier or campaign allocation settles at most once.
2. A valid claim is bound to its intended vault, chain, distribution, amount, expiry, and destination wallet.
3. Expired or cancelled funds return only to the configured sender or partner treasury.
4. Total confirmed campaign claims never exceed the campaign's funded allocation.
5. Raw email, social, game, ticket, or community identities never enter public chain state.
6. API and agent credentials are stored as one-way hashes; signing secrets are revealed only at creation.
7. Signed mutations reject stale timestamps, invalid HMACs, duplicate idempotency keys, and insufficient scopes.
8. Human-approval thresholds are enforced by the server, not trusted from the requesting agent.
9. Protocol fees remain separated by accounting bucket and cannot silently bypass the published allocation.
10. Liquidity, partner-vault, venue, buyback, and release operations cannot execute before their governance delay.
11. A guardian may cancel or pause but cannot execute a queued operation or withdraw user funds.
12. A qualified adapter becomes invalid when its runtime code hash, asset pair, or risk ceiling no longer matches the registry.
13. An active release is valid only when every registered component address and runtime code hash matches its approved manifest.
14. Public status, evidence, security, and error responses disclose no credential, raw recipient identity, database connection detail, or internal exception.
15. No production deployment is represented as externally audited or mainnet approved until an independent report exists and every required remediation is closed.
16. A conditional allocation cannot settle without an unexpired project-scoped proof bound to the exact allocation, required event, identity commitment, and destination wallet; confirmed settlement consumes that proof.
17. Any change to a scoped contract source, compiler artifact, dependency lockfile, Arc deployment snapshot, or audit scope invalidates the committed audit manifest until explicitly regenerated and reviewed.
