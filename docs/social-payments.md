# Social payments milestone

Current CoFi now supports four consumer payment actions on Arc testnet:

- direct USDC sends to an existing Current username;
- shareable payment requests;
- private tip links; and
- split bills with an independently scoped URL and receipt for each share.

## Settlement model

Current never takes custody of social-payment funds. The server persists the payment intent, resolves the recipient's active Arc wallet, and asks the payer's Circle embedded wallet to sign an exact `USDC.transfer(recipient, amount)` call. A share becomes confirmed only after Circle reports the Arc transaction as complete. The resulting transaction hash and unique Current receipt are persisted for verification.

## Safety boundaries

- Direct username sends are bound to the initiating Current account.
- Public URLs contain a random capability token; only its SHA-256 digest is stored.
- A payment challenge is bound to the request, share, payer account, and wallet.
- Atomic database state transitions prevent two wallets from settling one share.
- Raw emails, phone numbers, and social handles are not stored in payment tables.
- Request creators can cancel only open shares; confirmed payments remain immutable.
- Every server-created project request is HMAC signed and permission scoped.

## Builder integration

The server SDK exposes `current.socialPayments.create()` for request, tip, and split-bill creation. Games, communities, launch platforms, and agents can create payment links without implementing wallet onboarding, exact Arc settlement, receipts, or responsive hosted payment pages themselves.

This milestone strengthens the Circle grant thesis by adding a production-style peer-to-peer payment loop in which Arc and USDC are the actual value and settlement rails—not optional checkout methods.
