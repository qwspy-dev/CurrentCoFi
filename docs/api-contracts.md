# Current CoFi API contracts

## Base path

`/api/v1`

## Success envelope

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "version": "v1"
  }
}
```

## Error envelope

```json
{
  "ok": false,
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "version": "v1"
  }
}
```

## Rules for financial mutations

- Require authenticated project or user context.
- Require an `Idempotency-Key` header.
- Validate asset amounts as integer atomic-unit strings, never floating-point numbers.
- Return transaction lifecycle state separately from HTTP request state.
- Emit an audit event for authorization, funding, claim, refund, lock, fee, and administrative changes.
- Never report success before the authoritative system confirms the operation.

## Foundation endpoints

- `GET /health`: service, Arc RPC, persistence, and credential readiness.
- `GET /meta`: public network configuration and enabled product modules.
- `GET /openapi`: current machine-readable API surface and planned resource groups.

## Planned route groups

- `/auth`, `/users`, `/wallets`
- `/projects`, `/tokens`
- `/distributions`, `/allocations`, `/claims`
- `/referrals`, `/activations`, `/analytics`
- `/api-keys`, `/webhooks`, `/agents`
- `/current/locks`, `/current/fees`, `/current/buybacks`
