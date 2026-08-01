import assert from "node:assert/strict";
import { assembleNetworkProof, formatUsdcAtomic, networkProofDigest } from "../server/network/proof.js";

const asOf = new Date("2026-08-01T12:00:00.000Z");
const proof = assembleNetworkProof({
  configured: true,
  asOf,
  totals: { projects: 2, campaigns: 4, recipientsTargeted: 100, confirmedClaims: 60, fundedWallets: 55, activatedUsers: 30, activationEvents: 41, usdcClaimedAtomic: "123456789", projectTokenCampaigns: 3 },
  activityRows: {
    campaigns: [{ at: new Date("2026-08-01T01:00:00Z") }],
    claims: [{ at: new Date("2026-08-01T02:00:00Z") }],
    activations: [{ at: new Date("2026-08-01T03:00:00Z") }],
  },
});

assert.equal(proof.rates.claimRate, 60);
assert.equal(proof.rates.activationRate, 50);
assert.deepEqual(proof.activity.at(-1), { date: "2026-08-01", campaigns: 1, claims: 1, activations: 1 });
const { digest, ...body } = proof;
assert.equal(digest, networkProofDigest(body));
assert.equal(formatUsdcAtomic("123456789"), "123.456789");
assert.equal(formatUsdcAtomic("1000000"), "1");
assert.equal(formatUsdcAtomic("0"), "0");
assert.ok(!JSON.stringify(proof).includes("walletAddress"));
assert.ok(!JSON.stringify(proof).includes("identityHash"));
assert.ok(!JSON.stringify(proof).includes("recipientAddress"));

console.log("network proof integration checks passed");
