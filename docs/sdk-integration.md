# Current CoFi integration kit

Current CoFi lets an Arc project create walletless USDC or project-token campaigns without rebuilding recipient authorization, embedded wallet onboarding, gas sponsorship, attribution, or settlement analytics.

## Packages

- `@currentcofi/sdk` is a server-only TypeScript client for distributions, activation events, analytics, and webhook verification.
- `@currentcofi/react` provides a hosted-claim embed and referral-link helper.

Credentials must remain on the server. A browser may render a claim embed from an already-issued claim URL, but it must never receive the project API key or signing secret.

## Create a distribution

```ts
import { Current } from "@currentcofi/sdk";

const current = new Current({
  apiKey: process.env.CURRENT_API_KEY!,
  signingSecret: process.env.CURRENT_SIGNING_SECRET!,
});

const distribution = await current.distributions.create({
  name: "Founding community current",
  recipients: [
    { identityType: "email", identity: "builder@example.com", amount: "25.00" },
  ],
  activationEvent: "game.first_match",
  claimCondition: {
    eventType: "game.completed_3",
    label: "Complete 3 matches",
    description: "Finish three qualifying matches to unlock this reward.",
    proofWindowMinutes: 60,
  },
});
```

Omit `tokenAddress` to distribute Arc testnet USDC. Provide a supported Arc ERC-20 address to distribute a project token. The response includes the campaign status, asset metadata, Merkle root, funding total, expiration, and signed claim links.

## Report activation

```ts
await current.activations.submit({
  externalEventId: "match_8472_first",
  eventType: "game.first_match",
  distributionId: distribution.id,
  walletAddress: "0x…",
  payload: { mode: "ranked" },
});
```

`externalEventId` is idempotent within a project. Current CoFi attributes an accepted event to any matching claim and referral path, then queues signed webhooks.

## Embed the claim

```tsx
import { CurrentClaimEmbed } from "@currentcofi/react";

<CurrentClaimEmbed
  claimUrl={distribution.links[0].claimUrl}
  referralCode="founding-current"
  accent="#22e4d5"
/>
```

The component safely resolves the public claim preview and sends the recipient into the hosted Current CoFi walletless onboarding flow. Projects may use `onOpen` to layer their own analytics before navigation.

## Verify a required action

```ts
await current.conditions.verify({
  externalEventId: "match-series-8472",
  distributionId: distribution.id,
  eventType: "game.completed_3",
  identityType: "email",
  identity: "builder@example.com",
  walletAddress: "0x...",
  evidence: { method: "server-score", reference: "match-series-8472" },
});
```

This server-only call creates a short-lived proof for the exact allocation and recipient wallet. Current refuses settlement until it exists and consumes it after a confirmed claim, preventing replay.

## Verify webhooks

```ts
import { verifyCurrentWebhook } from "@currentcofi/sdk";

const valid = await verifyCurrentWebhook({
  secret: process.env.CURRENT_WEBHOOK_SECRET!,
  timestamp: request.headers.get("x-current-timestamp")!,
  signature: request.headers.get("x-current-signature")!,
  rawBody: await request.text(),
});
```

Reject invalid or stale deliveries before parsing or mutating data. Store event IDs idempotently because a durable delivery may be retried.

## Integration evidence

The full machine-readable surface is available from:

- `/api/v1/openapi`
- `/api/v1/meta`
- `/api/v1/agent/tools`

The developer portal at `/#/developers` contains live quickstarts and an embedded component preview.
