# Post-claim activation destinations

Current campaigns can configure a branded HTTPS destination that appears after a recipient settles a walletless USDC or project-token claim. The recipient must be signed in and must own the confirmed claim before Current returns the destination or records an open.

## Evidence boundary

Current reports three deliberately separate funnel stages:

1. **Confirmed claim** — reconciled from settlement records.
2. **Authenticated return click** — the confirmed recipient opened the configured project destination.
3. **Verified activation** — the project submitted a signed, replay-safe activation event.

An authenticated return click is never described as a verified activation. Current stores the destination origin, allocation, recipient account, first and last open time, and open count; it does not store the full destination path or query string in the click ledger.

## Configuration

The campaign builder, developer SDK, and MCP reward-distribution tool accept:

```json
{
  "activationDestination": {
    "url": "https://project.example/welcome",
    "label": "Enter the project"
  }
}
```

Only HTTPS URLs are accepted. Credentials and URL fragments are rejected. Project-side activation remains the authoritative proof that a recipient completed a valuable action.
