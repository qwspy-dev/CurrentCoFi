# Milestone 1: one-person USDC claim

## Definition of done

A completely new recipient can open a private link, authenticate with Google or
email, recover the same embedded Arc wallet on return, and claim test USDC
without holding gas. The sender can see the completed transaction, and expired
funds can be refunded.

## Required states

Distribution:

`draft -> awaiting_funding -> active -> completed | expired -> refunded`

Transaction:

`created -> awaiting_signature -> submitted -> confirming -> completed | failed`

Claim:

`available -> authorizing -> submitted -> completed | expired | cancelled`

## Implementation order

1. Wallet spike: Google/email → Circle user-controlled Arc SCA → recover.
2. Contract: fund, recipient-bound claim, double-claim protection, expiration,
   cancellation, refund, and pause.
3. API persistence: project, distribution, claim, transaction, and audit event.
4. Sender funding flow for test USDC.
5. Recipient claim flow through Circle Web SDK.
6. Gas Station policy restricted to the deployed vault and claim selector.
7. Event indexer plus periodic reconciliation.
8. End-to-end tests and repeated mobile-browser trials.

## Explicitly deferred

Mass distributions, Merkle roots, arbitrary project tokens, referrals,
activation analytics, `$CURRENT`, fee routing, buybacks, merchant checkout,
escrow, subscriptions, x402, MCP, and crosschain funding.

Arbitrary ERC-20 support is already considered in the vault interface, but it
is not exposed as a product feature until the USDC flow is reliable.
