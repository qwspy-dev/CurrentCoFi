# Current Discovery Network

Current Discovery is the public opportunity layer for Current CoFi. It lets recipients, contributors, and communities find walletless USDC and project-token drops, bounties, and giveaways without searching through private project dashboards or social posts.

## Eligibility

An opportunity is listed only when its underlying Current Campaign Vault is active and fully funded on Arc testnet, its public participation window is open, and capacity remains where capacity applies. Awaiting-funding, expired, completed, cancelled, refunded, full, review-stage, and drawn opportunities are excluded automatically.

## Placement

Listings are ordered by active `$CURRENT` project-access tier and then recency. Current, Surge, and Stream locks can improve placement, but cannot bypass the funding or availability gate. Every card labels its placement tier, and the interface explains that access placement is not an endorsement, investment recommendation, or guarantee of project quality.

## Public API

`GET /api/v1/discovery` requires no API key. It returns normalized opportunity records, funding-proof references, capacity or participation progress, project identity, public URLs, placement disclosures, and aggregate directory totals. Private recipients, email addresses, wallet addresses, submission contacts, claim credentials, and project-only records are never returned.

The TypeScript SDK exposes the same public read through `current.discovery.list()` so wallets, agents, launch platforms, community dashboards, and partner applications can build their own Current-powered discovery experiences.

## Conversion attribution

The discovery client records impressions and opportunity opens with `POST /api/v1/discovery`. A random browser identifier is created locally, transformed into a one-way digest by the API, and deduplicated for each resource, event type, and UTC day. Current never persists the raw browser identifier, IP address, user agent, email, wallet, or social identity for these events.

Public opportunity metrics keep three concepts separate:

- `impressions` and `opens` are anonymous daily discovery interactions;
- `participation` is a resource-specific product action such as a reservation, submission, or giveaway entry;
- confirmed claims, funded wallets, activation events, and retention remain separate campaign evidence and are never inferred from clicks.

SDK integrations can use `current.discovery.record(...)` to preserve the same attribution contract in partner-owned discovery surfaces.

## Trust boundary

Discovery proves only what Current can verify: the opportunity is public, presently open, and backed by an active funded campaign record. Users still need to evaluate the project, asset, terms, and public campaign proof before participating.
