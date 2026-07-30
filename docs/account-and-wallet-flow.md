# Current CoFi account and embedded-wallet flow

## Objective

Turn a person arriving from an offchain claim link into an authenticated Current CoFi account and an Arc smart-contract wallet without requiring a browser extension, seed phrase, gas balance, or pre-existing wallet.

## Production sequence

1. The browser loads public authentication capabilities from `GET /api/v1/auth/config`.
2. Circle issues a device-bound token through `POST /api/v1/auth/device-token`.
3. The browser uses the Circle Web SDK to complete Google authentication, or requests an email OTP through `POST /api/v1/auth/email-token`.
4. The Circle SDK returns a user token, refresh token, and device encryption material.
5. Current CoFi asks Circle to initialize an `SCA` wallet on `ARC-TESTNET` through `POST /api/v1/auth/initialize`.
6. The Circle SDK completes the initialization challenge on the user's device.
7. `POST /api/v1/auth/session` verifies the Circle user and lists their Arc wallets directly with Circle.
8. Current CoFi stores the verified account state in an encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
9. `GET /api/v1/auth/session` restores the public account and wallet state without exposing Circle credentials to application components.
10. `POST /api/v1/auth/refresh` rotates expired Circle credentials while preserving the account.
11. `DELETE /api/v1/auth/session` destroys the local Current CoFi session.

## Security boundary

- Circle API keys remain server-side.
- Raw email addresses and social identities are not written onchain.
- The backend independently verifies the Circle user and wallet before creating a Current CoFi session.
- The browser keeps Circle's device encryption material on the device; it is never stored in the session cookie.
- Session contents use AES-256-GCM authenticated encryption.
- Production refuses to create sessions unless `CURRENT_COFI_INTERNAL_SECRET` is configured.
- OAuth methods remain visibly disabled until their required Circle and provider credentials exist.

## Environment activation

The implementation requires:

- `CIRCLE_API_KEY`
- `CIRCLE_APP_ID`
- `GOOGLE_OAUTH_CLIENT_ID` for Google sign-in
- `CURRENT_COFI_INTERNAL_SECRET`

Email OTP requires the Circle API key and App ID. Google additionally requires a Circle-compatible Google OAuth client. The current deployment deliberately reports unavailable providers until these credentials are installed.

## Next protocol boundary

This milestone creates and restores the recipient's real Arc wallet. It does not transfer campaign funds. Claim authorization, vault contracts, sponsored claim execution, expiry, and refunds belong to the walletless-claim milestone.
