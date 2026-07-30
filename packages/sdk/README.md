# @currentcofi/sdk

Server SDK for creating walletless Arc distributions, submitting signed activation events, reading campaign analytics, and verifying Current CoFi webhooks.

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
});
```

Keep the API key and signing secret on the server. Never expose either credential in a browser bundle.
