# Current CoFi identity and wallet access

Current uses two deliberately separate identity layers.

1. **Wallet authentication:** Circle User-Controlled Wallets verifies Google, email OTP, Apple, or Facebook and creates the user's Arc smart-contract account. These providers can restore the Circle wallet session and approve wallet challenges.
2. **Community identity:** X, Discord, and Telegram are linked to an already authenticated Current account. They can prove campaign eligibility, attribution, or community membership, but they cannot authorize a transfer or recover a wallet.

This boundary keeps social growth integrations from becoming custody or wallet-recovery dependencies.

## Provider readiness

| Provider | Role | Implementation | External configuration |
| --- | --- | --- | --- |
| Google | Circle wallet login | Live | Existing Google OAuth client |
| Email | Circle wallet login | Circle email OTP route, SDK verifier, and recovery flow | `CIRCLE_EMAIL_OTP_ENABLED=true` |
| Apple | Circle wallet login | Circle SDK and Firebase configuration adapter | Apple provider enabled in Firebase plus the six `APPLE_FIREBASE_*` values |
| Facebook | Circle wallet login | Circle SDK configuration and callback adapter | `FACEBOOK_APP_ID` and the matching Circle/Facebook application settings |
| X | Linked community identity | OAuth 2.0 Authorization Code + PKCE, encrypted state, account-conflict protection | `X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET` |
| Discord | Linked community identity | OAuth 2.0 Authorization Code, encrypted state, account-conflict protection | `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET` |
| Telegram | Linked community identity | Telegram HMAC verification, ten-minute replay window, account-conflict protection | `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN` |

## Callback URLs

Use these exact production callbacks when registering providers:

- X: `https://www.currentco.finance/api/v1/auth/identities/callback?provider=x`
- Discord: `https://www.currentco.finance/api/v1/auth/identities/callback?provider=discord`
- Google/Facebook Circle SDK redirect origin: `https://www.currentco.finance`
- Apple Firebase authorized domain: `www.currentco.finance`

Preview deployments need their own registered origins or dedicated preview credentials. Never reuse a production client secret in a local browser bundle.

## Security properties

- Provider subjects are irreversibly hashed before database storage.
- Raw email addresses and social identifiers are never written onchain.
- X uses PKCE and all OAuth state is authenticated and encrypted with a ten-minute expiry.
- A social identity already linked to one Current account cannot be attached to another.
- OAuth callbacks require the same encrypted Current session that started the flow.
- Telegram payloads are verified against the bot token and expire after ten minutes.
- Client secrets and bot tokens are server-only; the public auth configuration exposes only readiness booleans and provider-safe client configuration.
- Linked identities do not receive Circle user tokens, refresh tokens, encryption keys, or wallet challenge authority.
