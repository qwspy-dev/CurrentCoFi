# Programmable merchant settlement

Current CoFi checkout can commit a merchant payment, affiliate payout, and customer USDC reward before a hosted payment link is published. The checkout page remains walletless: a customer signs in, receives an embedded Circle wallet, and approves the exact USDC amount. Current CoFi then executes one Arc transaction that distributes the funded amount across the committed destinations.

## Atomic settlement boundary

- The merchant is always destination zero and receives the rounding remainder.
- Affiliate destinations require valid Arc addresses.
- Customer rewards resolve to the paying customer's embedded wallet at payment time.
- All basis points must total exactly 10,000 in the contract call.
- A checkout supports at most eight configured benefits and no more than 40% of the payment may be allocated away from the merchant.
- Split checkouts fail closed until `CURRENT_CHECKOUT_ROUTER_ADDRESS` is deployed and configured.
- Project-token routing is intentionally unavailable for split checkouts; the initial programmable path settles exact USDC only.
- Split payments cannot be refunded by the merchant alone because value has already reached independent destinations. A later destination-aware refund protocol must collect explicit consent; the current version fails closed.

## Durable proof

Every confirmed split creates a parent checkout receipt plus one immutable application receipt per destination. Each destination receipt records its kind, label, Arc address, basis points, exact atomic amount, transaction hash, and settlement time. Merchant analytics separately report split-payment count, affiliate volume, and customer rewards.

## Interfaces

- Merchant UI: programmable checkout builder, settlement preview, capability state, and destination ledger.
- Signed project API: `POST /api/v1/developer/checkout` with a `splits` array.
- First-party API: `POST /api/v1/merchant` with `action: "create-checkout"`.
- TypeScript SDK: `current.checkout.create({ ..., splits })`.
- Contract: `CurrentCheckoutRouter.settleUSDCWithSplits`.

This module turns merchant checkout into a measurable ecosystem-growth primitive: a project can reward the person who drove a customer, reward the customer in USDC, and prove every allocation through the same Arc settlement transaction.
