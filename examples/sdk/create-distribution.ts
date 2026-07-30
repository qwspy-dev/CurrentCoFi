import { Current } from "@currentcofi/sdk";

const current = new Current({
  apiKey: process.env.CURRENT_API_KEY!,
  signingSecret: process.env.CURRENT_SIGNING_SECRET!,
});

const distribution = await current.distributions.create({
  name: "Founding community current",
  recipients: [
    {
      identityType: "email",
      identity: "builder@example.com",
      amount: "25.00",
    },
  ],
  activationEvent: "game.first_match",
});

console.log({
  id: distribution.id,
  status: distribution.status,
  claimLinks: distribution.links.length,
});
