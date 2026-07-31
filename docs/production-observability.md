# Current CoFi production observability and incident response

## Operational objective

Current CoFi treats wallet creation, distribution funding, claim settlement, crosschain funding, and developer events as one financial delivery path. The observability layer checks every critical boundary and makes the current state independently reviewable.

## Live signals

- Every API request emits structured start, completion, rejection, and failure logs with a request ID, route, method, status, duration, environment, and Vercel request identifier.
- `/api/v1/status` checks Arc RPC network identity, database reachability, the active protocol release and runtime bytecode, embedded wallet configuration, claim settlement, crosschain funding, and developer security.
- Vercel Web Analytics records privacy-preserving traffic signals.
- Vercel Speed Insights records LCP, INP, CLS, FCP, and TTFB from real sessions.
- A scheduled monitor calls the protected health endpoint daily and emits a structured degraded or outage result. The same endpoint can deliver alerts to `ERROR_WEBHOOK_URL` when configured.

## Service objectives

| Objective | Target |
| --- | --- |
| Availability | 99.9% |
| API p95 latency | 800 ms |
| Arc RPC p95 latency | 1,500 ms |
| Recovery time | 30 minutes |
| Onchain recovery point | Zero confirmed transactions lost |

## Incident lifecycle

1. **Investigating** — acknowledge the signal, name the affected components, and assign severity.
2. **Identified** — publish the verified cause and the containment plan.
3. **Monitoring** — deploy the recovery and watch the complete settlement path.
4. **Resolved** — publish the final result. Resolved incidents are immutable and cannot be reopened.

Every transition is appended to the incident ledger. The public status response exposes operationally useful details without leaking recipients, credentials, internal traces, or wallet authorization data.

## Severity policy

- **Minor:** degraded convenience feature with no loss of claim safety.
- **Major:** a primary flow is unavailable or delayed, but user funds remain secure.
- **Critical:** settlement integrity, authorization, or multiple primary flows are affected.

## Recovery playbooks

### Claim settlement failure

Pause affected campaign actions, verify the active release manifest, compare database and Arc events, preserve idempotency keys, and replay only transactions without a confirmed onchain result.

### Arc RPC instability

Stop new settlement submissions, continue serving read-only claim information, confirm chain identity on the backup provider, and resume only after finality and nonce reconciliation.

### Circle wallet outage

Keep funded assets locked in their vaults, prevent repeated wallet-creation requests, preserve claim entitlements, and resume through the same claim identifier after Circle recovers.

### Database degradation

Treat Arc as the financial source of truth, disable database-dependent mutations, restore persistent state, and reconcile every contract event before returning to normal operation.

### Release mismatch

Pause the release governor, cancel any queued payload, compare registered and runtime code hashes, then re-queue the last verified release payload through the public delay.
