# Current CoFi milestone escrow

Current CoFi escrow is a fully funded, sequential settlement primitive for work between an Arc client and provider. It supports USDC and project ERC-20 tokens, commits the parties and schedule to a terms digest, and releases only the active milestone after the provider submits a proof hash and the client approves it.

## Roles and boundaries

- The client funds every milestone before the agreement becomes active, approves completed work, can dispute submitted work, and can recover an overdue pending milestone after a seven-day grace period.
- The provider submits a delivery proof, can dispute a submitted milestone, and must explicitly accept a client-requested cancellation.
- The arbitrator can resolve only a disputed active milestone and can divide its bounded value between the provider and refund address.
- Current CoFi records agreement and milestone state, prepares wallet challenges, indexes confirmed events, signs webhooks, and never receives unilateral authority to release user funds.

## State progression

`awaiting_funding -> active -> submitted -> released`

A submitted milestone may enter `disputed` before an arbitrator resolves it. An overdue pending milestone can become `refunded`; mutual cancellation refunds every remaining milestone. Completed, cancelled, or refunded value cannot be claimed twice.

## Integration

The signed developer API can prepare and list agreements at `/api/v1/developer/escrow`. Funding and all value-moving actions remain Circle wallet challenges initiated by an authorized party through `/api/v1/escrow/actions`. Events are available as signed `escrow.*` webhooks.

## Grant evidence

Every immutable project evidence report includes a privacy-safe escrow ledger. It publishes agreement and milestone states, asset-denominated secured/released/refunded totals, terms and delivery-proof digests, the configured escrow contract, and funding/submission/settlement transaction anchors. Client, provider, arbitrator, and refund addresses are deliberately excluded. The grant score credits escrow only after both a funded agreement and an Arc-settled milestone exist; source code or configuration alone never counts as usage.

## Production boundary

The current deployment target is Arc testnet, where assets have no monetary value. Independent contract review, production credentials, legal terms, monitoring, and a mainnet go/no-go review remain mandatory before real-value use.
