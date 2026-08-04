# Project Brand Studio

Current CoFi projects can publish one bounded visual identity for walletless hosted experiences. The project profile and theme are persisted in the existing project settings record and inherited by private claim previews, public mass drops, bounties, and giveaways.

## Public contract

- project name, description, logo, and website
- primary, flow-accent, and activation colors
- midnight, tide, or light surface preference
- hosted claim headline and call-to-action label
- permanent “Powered by Current CoFi” and Arc testnet disclosures

The public responses never contain project-member identity, API credentials, raw recipient identity, or arbitrary markup. Colors must use six-digit hexadecimal notation. Logos and websites must use credential-free HTTPS URLs. Custom CSS, scripts, HTML, and removal of Current’s settlement disclosures are not supported.

## API

`GET /api/v1/brand` reads the signed-in project's current identity. `POST /api/v1/brand` validates and publishes a complete or partial brand configuration. Both endpoints require the encrypted Current account session and operate only on the caller's owned project.

Developers can use `GET /api/v1/developer/brand` with `analytics:read` and a signed `POST /api/v1/developer/brand` with `campaigns:write`. The TypeScript SDK exposes the same contract through `current.brand.get()` and `current.brand.publish()`.

## Evidence boundary

Brand inheritance proves that an Arc project can launch a coherent hosted activation experience without rebuilding Current's wallet, claim, and settlement layers. It does not imply an external project partnership, trademark verification, or Current endorsement of a project or token.
