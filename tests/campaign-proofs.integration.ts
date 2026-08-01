import assert from "node:assert/strict";
import { assembleCampaignProofExplorer, campaignProofDigest } from "../server/evidence/explorer.js";

const now = new Date("2026-08-01T12:00:00.000Z");
const proof = assembleCampaignProofExplorer({
  configured: true, generatedAt: now,
  distributions: [{ id: "private-db-id", kind: "project-token", status: "active", totalAmountAtomic: "1000000", claimedAmountAtomic: "250000", recipientCount: 2, merkleRoot: "0xmerkle", vaultAddress: "0xvault", fundingTxHash: "0xfunding", startsAt: null, expiresAt: new Date("2026-07-31T00:00:00Z"), createdAt: new Date("2026-07-01T00:00:00Z"), rules: { claimMode: "identity-bound" }, metadata: {}, token: { symbol: "WAVE", name: "Wave", decimals: 6, contractAddress: "0xtoken", verified: true } }],
  allocations: [{ distributionId: "private-db-id", status: "confirmed" }, { distributionId: "private-db-id", status: "available" }],
  claims: [{ distributionId: "private-db-id", status: "confirmed", transactionHash: "0xclaim", confirmedAt: new Date("2026-07-02T00:00:00Z") }],
  activations: [{ distributionId: "private-db-id", eventType: "played_match", userId: "private-user-id" }],
  attestations: [{ distributionId: "private-db-id", identityType: "email", consumedAt: now }],
  referrals: [{ distributionId: "private-db-id", status: "activated" }], crosschain: [], gateway: [],
});
assert.equal(proof.totals.campaigns, 1);
assert.equal(proof.totals.confirmedClaims, 1);
assert.equal(proof.campaigns[0].activation.distinctUsers, 1);
assert.equal(proof.campaigns[0].recovery.refundable, true);
assert.equal(proof.campaigns[0].settlement.claimTransactions[0].hash, "0xclaim");
const { digest, ...body } = proof;
assert.equal(digest, campaignProofDigest(body));
const serialized = JSON.stringify(proof);
for (const secret of ["private-db-id", "private-user-id", "projectName", "identityHash", "walletAddress", "apiKey"]) assert.equal(serialized.includes(secret), false);
console.log("campaign proof explorer integration checks passed");
