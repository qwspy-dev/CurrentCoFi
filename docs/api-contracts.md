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
- Require a stable external event identifier or claim identifier for idempotency.
- Validate asset amounts as integer atomic-unit strings, never floating-point numbers.
- Return transaction lifecycle state separately from HTTP request state.
- Emit an audit event for authorization, funding, claim, refund, lock, fee, and administrative changes.
- Never report success before the authoritative system confirms the operation.

## Foundation endpoints

- `GET /health`: service, Arc RPC, persistence, and credential readiness.
- `GET /meta`: public network configuration and enabled product modules.
- `GET /openapi`: current machine-readable API surface and planned resource groups.

## Live product routes

- `/auth`, `/users`, `/wallets`
- `/projects`, `/tokens`
- `/links`, `/campaigns`, `/allocations`, `/claims`
- `/referrals`, `/campaigns/analytics`
- `/developer/keys`, `/developer/activations`, `/developer/analytics`
- `/developer/webhooks`, `/agent/tools`

## Developer authentication

Project and agent requests use a scoped bearer key. Signed mutations also include:

- `x-current-timestamp`: Unix time in milliseconds, no more than five minutes from server time.
- `x-current-signature`: base64url HMAC-SHA256 of `<timestamp>.<raw request body>`.

API keys and signing secrets are returned once. Only a SHA-256 key digest and AES-GCM encrypted signing secret are persisted.

## Activation contract

`POST /developer/activations` accepts:

```json
{
  "externalEventId": "order_123_completed",
  "eventType": "purchase.completed",
  "distributionId": "campaign uuid",
  "walletAddress": "0x recipient wallet",
  "occurredAt": "ISO-8601",
  "payload": {}
}
```

The activation is accepted only when the key owns the campaign and the wallet has a confirmed campaign claim. Reusing `externalEventId` returns the original accepted result without creating a second activation.

## Webhook delivery

Webhook events include campaign creation and funding, confirmed claims, signed activations, referral attribution, campaign cancellation, and refunds. Every delivery includes:

- `x-current-delivery`
- `x-current-event`
- `x-current-timestamp`
- `x-current-signature`

Delivery attempts are persisted, retried with backoff, and visible in the developer dashboard.

## Planned route groups

- `/sdk`, `/components`
- `/current/locks`, `/current/fees`, `/current/buybacks`
