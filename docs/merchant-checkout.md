# Current CoFi merchant checkout

Current CoFi checkout is an Arc-testnet commerce layer for fixed-price USDC payments. A merchant publishes a hosted link, a customer signs into or creates a Current account, and the customer's embedded Circle wallet approves the exact USDC transfer directly to the merchant's configured Arc settlement wallet.

## Settlement boundary

- Customer funds never enter a Current CoFi custody wallet.
- The checkout amount and merchant address are fixed before the Circle challenge is created.
- A payment becomes confirmed only after Circle reports the matching transaction as complete.
- Each confirmed payment receives a unique public receipt number and Arc transaction hash.
- A refund can only be initiated by the Current project whose active Arc wallet exactly matches the merchant settlement wallet.
- Refunds are full-value USDC transfers in this release. Partial refunds are deliberately unsupported.

## Product flows

1. A project creates one merchant profile and selects its Arc settlement wallet.
2. The project publishes a checkout with a title, description, USDC price, optional expiration, and optional success URL.
3. Current CoFi generates a shareable `#/checkout/<slug>` page.
4. A walletless customer signs in with Google or email; Current creates the embedded Arc wallet.
5. The customer approves the exact USDC payment and receives a receipt after confirmation.
6. The merchant workspace shows links, confirmed volume, receipts, and refunds.

## Integrations

- Signed project API: `GET|POST /api/v1/developer/checkout`
- Hosted checkout resolver: `GET /api/v1/checkout/public?slug=...`
- Customer payment: `POST /api/v1/checkout/pay`
- Merchant refund: `POST /api/v1/checkout/refund`
- Public receipt: `GET /api/v1/checkout/receipt?receipt=...`
- Webhook events: `checkout.created`, `checkout.paid`, and `checkout.refunded`
- TypeScript SDK: `current.checkout.list()`, `current.checkout.setup()`, and `current.checkout.create()`

## Current limitations

This milestone is testnet-only and handles test USDC with no monetary value. It is not card processing, a chargeback system, fiat conversion, tax software, or a custody product. Merchant identity verification, production compliance review, external security review, mainnet configuration, and live pricing remain launch gates rather than claims made by the product.
