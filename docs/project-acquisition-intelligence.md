# Project acquisition intelligence

Current CoFi gives each signed-in project a private, evidence-separated acquisition funnel for its public drops, bounties, and giveaways.

## Funnel contract

1. **Impressions** are unique per anonymous browser, resource, event type, and UTC day.
2. **Opportunity opens** record intent to inspect a funded public opportunity.
3. **Participation** means a drop reservation, bounty submission, or giveaway entry.
4. **Claims** count only confirmed Arc settlement for the opportunity's funded distribution.
5. **Activations** count signed project events attributed to that distribution.

Every step is stored and reported separately. Current never labels an impression, open, reservation, submission, or entry as a funded wallet, confirmed claim, retained user, or verified activation.

## Product surfaces

- The signed-in Campaign Intelligence workspace renders the five-stage funnel, rate between each stage, a 14-day attention current, and per-opportunity outcomes.
- `GET /api/v1/campaigns` and `GET /api/v1/campaigns/analytics` include the private project acquisition object for the signed-in operator.
- `GET /api/v1/developer/analytics` exposes the same project-scoped object to an API key with `analytics:read`.
- `@currentcofi/sdk` exports the `DiscoveryAcquisition` contract as part of `DeveloperAnalytics`.

## Privacy and grant boundary

The acquisition response contains aggregate project and opportunity counts only. It does not expose visitor digests, IP addresses, user agents, emails, social identities, claim secrets, or recipient-level behavior. The 30-day daily series covers anonymous impressions and opens; confirmed product outcomes remain lifetime totals for the project's indexed opportunities. External traction is claimed only after an outside project and real participants produce verifiable records.
