# Automated campaign email delivery

Current CoFi can deliver a private walletless claim to an email recipient without retaining a readable destination in the database. Recipient addresses and claim credentials are encrypted independently with AES-GCM and decrypted only inside the authorized dispatch operation.

## Lifecycle

`ready → sending → accepted → delivered`

Provider callbacks may instead record `delayed`, `bounced`, `complained`, or `suppressed`. These states never imply an Arc claim: claim settlement remains a separate onchain fact. A deterministic delivery idempotency key prevents duplicate provider submissions during retries.

## Production configuration

- `RESEND_API_KEY`: server-only provider credential.
- `CURRENT_DELIVERY_FROM_EMAIL`: verified sender.
- `RESEND_WEBHOOK_SECRET`: signing secret for `/api/v1/webhooks/resend`.

Without a verified sender and provider key, the product reports email delivery as unavailable and keeps manual copy, QR, and social handoff tools working. No delivery is simulated.

## Privacy and evidence

The project dashboard exposes only masked recipients. Provider message identifiers and signed delivery states are durable operational evidence; raw addresses, private URLs, provider keys, and webhook secrets are excluded from public grant evidence.
