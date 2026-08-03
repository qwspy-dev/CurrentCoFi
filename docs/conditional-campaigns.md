# Verifiable conditional campaigns

Current CoFi can require a project-verified action before an allocation is authorized for settlement. This turns a walletless drop into a measurable acquisition flow without trusting a browser flag or exposing recipient identities onchain.

## Flow

1. The project creates a campaign with `claimCondition.eventType`, recipient copy, and a short proof window.
2. The recipient opens the walletless link and signs in to create or recover an Arc wallet.
3. The project verifies the real-world or application action in its own system.
4. The project submits an HMAC-signed proof through `POST /api/v1/developer/claim-conditions`.
5. Current binds the proof to the exact project, distribution, allocation, identity commitment, event type, and destination wallet.
6. Claim authorization fails until that proof exists. A confirmed claim consumes it permanently.

## Security boundary

- Raw emails and social identities are never written onchain.
- The project remains responsible for deciding whether its offchain action occurred.
- Current verifies API-key scope, request signature, campaign policy, allocation ownership, wallet binding, proof expiry, and external-event uniqueness.
- Proofs cannot be replayed across allocations, wallets, event types, projects, or confirmed claims.
- A retry of an already confirmed claim is idempotent and returns the prior settlement.

## Example condition

```json
{
  "claimCondition": {
    "eventType": "game.completed_3",
    "label": "Complete 3 matches",
    "description": "Finish three qualifying matches to unlock this reward.",
    "proofWindowMinutes": 60
  }
}
```

This is intentionally separate from post-claim activation analytics: a condition controls whether value may settle, while activation measures what users do after receiving value.
