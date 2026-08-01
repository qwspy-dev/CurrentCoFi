# External security review package

## Review objective

Validate that Current CoFi can distribute USDC and arbitrary Arc project tokens to walletless recipients without unauthorized movement, identity disclosure, replay, governance bypass, or cross-project privilege escalation.

## Recommended order

1. Confirm the pinned commit, compiler settings, dependency lockfile, Arc testnet deployment manifest, and reproducible runtime bytecode.
2. Review the claim and campaign vaults, authorization domains, Merkle construction, cancellation, expiry, and refund state machines.
3. Review the $CURRENT lock and fee route, then the buyback, liquidity, partner, venue, and release governor boundaries.
4. Review authentication, session encryption, developer key storage, HMAC verification, identity binding, agent policy enforcement, webhooks, idempotency, and audit logging.
5. Run the complete contract, developer, SDK, security, type, lint, and build checks.
6. Deliver findings with severity, affected invariant, exploit preconditions, proof, and remediation recommendation.

## Handoff commands

- `pnpm install --frozen-lockfile`
- `pnpm run contracts:compile`
- `pnpm run contracts:test`
- `pnpm run developer:test`
- `pnpm run sdk:test`
- `pnpm run security:test`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run vercel:build`

## Acceptance gate

Mainnet approval remains false until an independent report is published, all critical/high findings are closed, accepted medium findings have owners and deadlines, the corrected code is re-reviewed, and the active release manifest matches the reviewed runtime bytecode.
