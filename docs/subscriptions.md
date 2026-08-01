# Current CoFi recurring USDC subscriptions

Current CoFi subscriptions let an Arc merchant publish a recurring USDC plan and let a walletless subscriber enroll through a Circle embedded wallet. Every billing cycle is an exact, subscriber-approved transfer directly to the merchant settlement wallet.

## Safety model

The testnet release deliberately does not create an unlimited token allowance, custody subscriber funds, or claim that a user-controlled Circle wallet can be silently charged. Current CoFi schedules the next period and opens a renewal window three days before the due date; the subscriber approves the exact USDC transfer for that cycle. Cancellation is immediate and prevents future renewal preparation.

This model preserves the recurring commercial relationship and its verifiable history without granting a merchant or Current CoFi standing access to a subscriber balance. A separately audited subscription contract or Circle-supported recurring authorization primitive would be required before automatic unattended renewals could be offered safely.

## Product flow

1. An existing Current merchant publishes a weekly, monthly, quarterly, or annual USDC plan.
2. Current creates a shareable `#/subscribe/<slug>` page.
3. A subscriber signs in with Google or email and receives an embedded Arc wallet if needed.
4. The subscriber approves the exact first-period payment; USDC settles directly to the merchant.
5. Current records the period, cycle, receipt, and Arc transaction proof.
6. Three days before the period ends, the renewal action becomes available to the subscriber.
7. The subscriber explicitly renews or cancels from the same wallet.

## Integrations

- Merchant workspace: `GET|POST /api/v1/subscriptions`
- Public plan: `GET /api/v1/subscriptions/public?slug=...`
- Enrollment: `POST /api/v1/subscriptions/start`
- Renewal and cancellation: `POST /api/v1/subscriptions/actions`
- Developer API: `GET|POST /api/v1/developer/subscriptions`
- SDK: `current.subscriptions.list()` and `current.subscriptions.createPlan()`
- Events: `subscription.plan.created`, `subscription.started`, `subscription.renewed`, and `subscription.cancelled`

## Current limitations

The production UI is connected to Arc testnet and test USDC with no monetary value. It is not a card subscription, direct debit mandate, chargeback system, tax product, or mainnet-approved recurring-payment product. Independent review, production compliance work, live Circle configuration, and a safe unattended-renewal mechanism remain explicit launch gates.
