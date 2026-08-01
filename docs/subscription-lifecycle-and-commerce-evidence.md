# Subscription lifecycle and commerce evidence

Current CoFi reconciles active subscriptions once per day on production. The scheduled job opens a renewal notice during the three-day approval window and creates a past-due notice after the current period ends. A unique subscription, period, and notice-kind constraint makes the job safe to retry without duplicate reminders.

## Subscriber control

- A notice never moves funds.
- Every renewal remains one exact Circle wallet transfer approved by the subscriber.
- Current CoFi creates no standing ERC-20 allowance and cannot silently debit a wallet.
- Renewal or cancellation resolves the matching open notice.
- Projects can subscribe to `subscription.renewal_due` and `subscription.past_due` webhooks.

## Operational boundary

`GET /api/v1/internal/subscriptions/lifecycle` requires the production scheduled-job bearer secret. Vercel invokes it daily after the service-health monitor. The response reports subscriptions scanned, notices created, due versus overdue totals, and queued webhook delivery outcomes.

## Circle grant evidence

Evidence schema `current-evidence-v14` includes aggregate merchant checkout and recurring USDC proof:

- checkout links, confirmed settlements, refunds, total USDC volume, receipt numbers, and Arc transaction hashes;
- subscription plans, active and cancelled subscriptions, confirmed cycles, total USDC volume, lifecycle counts, receipt numbers, and Arc transaction hashes;
- no customer or subscriber wallet addresses in the public commerce settlement list.

The public evidence page renders these records beside campaign, wallet, identity, activation, integration, security, and protocol evidence. Snapshots remain canonicalized, SHA-256 digested, and immutable after creation.
