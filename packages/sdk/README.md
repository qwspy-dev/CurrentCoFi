# @currentcofi/sdk

Server SDK for creating identity-bound walletless Arc distributions, attesting project identities, submitting signed activation events, freezing grant-evidence reports, reading campaign analytics, and verifying Current CoFi webhooks.

```ts
import { Current } from "@currentcofi/sdk";

const current = new Current({
  apiKey: process.env.CURRENT_API_KEY!,
  signingSecret: process.env.CURRENT_SIGNING_SECRET!,
});

const campaign = await current.distributions.create({
  name: "Founder current",
  recipients: [
    { identityType: "email", identity: "member@example.com", amount: "10" },
  ],
  activationEvent: "game.completed",
  mode: "identity-bound",
});

await current.identities.attest({
  externalEventId: "x-oauth-session-42",
  distributionId: campaign.id,
  identityType: "x",
  identity: "@member",
  walletAddress: "0x1111111111111111111111111111111111111111",
  provider: "x-oauth",
});

const evidence = await current.evidence.create({
  distributionId: campaign.id,
});

console.log(evidence.digest, evidence.publicSlug);

const pilot = await current.pilots.create({
  partnerName: "Tidebreak Games",
  useCase: "Walletless tournament rewards for verified players",
  integrationMode: "server-sdk",
  targetRecipients: 500,
  targetClaimRate: 65,
  targetActivationRate: 35,
  requestedIntegrations: ["circle-wallets", "project-token", "activation-webhooks"],
});

console.log(pilot.publicSlug, pilot.readinessScore);
```

Keep the API key and signing secret on the server. Never expose either credential in a browser bundle.
