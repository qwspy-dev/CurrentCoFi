# Partner pilot activation

Current CoFi's partner intake converts external interest into a scoped, measurable Arc pilot without exposing applicant contact information publicly.

## Lifecycle

1. A project operator creates an intake invitation with a public summary, supported integrations, recipient target, expiration, and application cap.
2. A prospective partner opens the public link and submits its organization, use case, audience, activation goal, and private contact.
3. The server encrypts contact data with AES-GCM, stores only a salted contact hash for duplicate protection, and returns a one-time status secret whose hash is stored.
4. The host project reviews the application in its private dashboard or through an HMAC-signed SDK request.
5. Accepting the application creates a pilot engagement with the requested integrations, audience goal, and readiness evidence already attached.
6. The pilot then links to a funded Arc campaign, settled claims, signed activation events, and a partner attestation.

## Security boundaries

- Invitations are tenant-scoped and cannot expose applications from another project.
- Public invitation reads contain no applicant data.
- Applicant contacts are encrypted at rest and returned only to an authorized project operator or key.
- Application status requires the public application reference and one-time secret; only its hash is retained.
- Application counts and expiration are enforced on the server.
- Duplicate contacts are blocked per invitation without revealing the stored contact.
- The hidden form field rejects basic automated submissions; infrastructure rate limits remain required at the edge.
- Accept and decline actions are audited. Acceptance creates a real pilot record rather than changing public marketing copy.

## Grant evidence

The intake layer is product infrastructure, not traction by itself. Current CoFi should claim an external pilot only after an independent partner submits, is accepted, funds a campaign, produces settled claims and activation events, and signs the public pilot attestation.

## SDK examples

```ts
const invitation = await current.pilots.createInvitation({
  name: "Founding Arc partner cohort",
  summary: "Launch a walletless token activation campaign on Arc.",
  targetRecipients: 500,
  maxApplications: 20,
  requestedIntegrations: ["circle-wallets", "gas-sponsorship", "usdc", "activation-webhooks"],
});

const pipeline = await current.pilots.list();
await current.pilots.reviewApplication(pipeline.applications[0].id, "accepted");
```
