import assert from "node:assert/strict";
import { assembleProjectTokenProof, projectTokenProofDigest } from "../server/partners/project-token-proof.js";

const proof = assembleProjectTokenProof({
  generatedAt: "2026-08-01T22:00:00.000Z",
  snapshot: {
    configured: true,
    network: "ARC-TESTNET",
    explorerUrl: "https://testnet.arcscan.app",
    addresses: { vault: "0xvault", governor: "0xgovernor", testnetPartnerToken: "0xtoken", campaignVault: "0xcampaign" },
    asset: { approved: true, treasury: "0xprivate-treasury", metadataHash: "0xmetadata", symbol: "CPT", decimals: 18, reserveBalance: "90000", totalDeposited: "100000", totalCampaignFunded: "10000" },
    governance: { governorOwnsVault: true, guardian: "0xprivate-guardian", minimumDelaySeconds: 30, totalQueued: 2, totalExecuted: 2, totalCancelled: 0 },
    totals: { approvedAssets: 1, deposits: 1, campaignsFunded: 1 },
    proofCampaign: { id: "private-campaign-id", sender: "0xprivate-sender", token: "0xtoken", totalAmount: "10000", remainingAmount: "10000", expiresAt: 1788122716, recipientCount: 100, merkleRoot: "0xroot", state: 1 },
    proofMode: "Arc testnet demonstration asset with no monetary value",
  },
  anchors: { tokenDeploymentTransactionHash: "0xtokentx", assetApprovalTransactionHash: "0xapproval", reserveDepositTransactionHash: "0xdeposit", campaignFundingTransactionHash: "0xfunding" },
});

assert.equal(proof.readiness.complete, true);
assert.equal(proof.readiness.verifiedStages, 4);
assert.equal(proof.asset?.symbol, "CPT");
assert.equal(proof.campaign?.recipientCount, 100);
assert.equal(proof.campaign?.claimEvidence, "claim-capability-only");
assert.match(proof.boundary, /not external pilot traction/i);
assert.match(proof.valueStatus, /no monetary value/i);
const { digest, ...body } = proof;
assert.equal(digest, projectTokenProofDigest(body));
const serialized = JSON.stringify(proof);
for (const secret of ["private-campaign-id", "0xprivate-treasury", "0xprivate-guardian", "0xprivate-sender", "recipientIdentity", "apiKey"]) {
  assert.equal(serialized.includes(secret), false);
}
console.log("project-token proof integrity, capability boundary, and privacy checks passed");
