# @currentcofi/sdk

Server SDK for creating identity-bound walletless Arc distributions, proposing policy-bound agent actions, attesting project identities, submitting signed activation events, freezing grant-evidence reports, reading campaign analytics, and verifying Current CoFi webhooks.

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

const action = await current.agentActions.proposeDistribution({
  idempotencyKey: "daily-player-rewards-2026-08-14",
  name: "Daily player rewards",
  recipients: [
    { identityType: "game", identity: "player-42", amount: "25" },
  ],
  activationEvent: "game.first_match",
});

// awaiting_settlement means policy passed and the campaign now needs the
// authorized project wallet to approve its token and fund the Arc vault.
// completed is returned only after that funding transaction is confirmed.
console.log(action.status, action.policyDecision);

// Read durable Gateway Unified Balance funding evidence for the project.
const gateway = await current.gateway.list();
console.log(gateway.catalog.transport, gateway.intents[0]?.mintTransactionHash);
```

Keep the API key and signing secret on the server. Never expose either credential in a browser bundle.
