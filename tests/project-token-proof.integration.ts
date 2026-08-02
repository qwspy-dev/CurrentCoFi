import assert from "node:assert/strict";
import { assembleProjectTokenProof, projectTokenProofDigest } from "../server/partners/project-token-proof.js";

const proof = assembleProjectTokenProof({
  generatedAt: "2026-08-01T22:00:00.000Z",
  snapshot: {
    configured: true,
    network: "ARC-TESTNET",
    explorerUrl: "https://testnet.arcscan.app",
    addresses: { vault: "0xvault", governor: "0xgovernor", testnetPartnerToken: "0xtoken", campaignVault: "0xcampaign" },
    asset: { approved: true, treasury: "0xprivate-treasury", metadataHash: "0xmetadata", symbol: "CPT", decimals: 18, reserveBalance: "89975", totalDeposited: "100000", totalCampaignFunded: "10025" },
    governance: { governorOwnsVault: true, guardian: "0xprivate-guardian", minimumDelaySeconds: 30, totalQueued: 3, totalExecuted: 3, totalCancelled: 0 },
    totals: { approvedAssets: 1, deposits: 1, campaignsFunded: 2 },
    proofCampaign: { id: "private-campaign-id", sender: "0xprivate-sender", token: "0xtoken", totalAmount: "10000", remainingAmount: "10000", expiresAt: 1788122716, recipientCount: 100, merkleRoot: "0xroot", state: 1 },
    settlementProof: { id: "private-settlement-id", token: "0xtoken", totalAmount: "25", remainingAmount: "0", expiresAt: 1788210000, recipientCount: 1, merkleRoot: "0xsettlementroot", state: 2, claimed: true },
    proofMode: "Arc testnet demonstration asset with no monetary value",
  },
  anchors: { tokenDeploymentTransactionHash: "0xtokentx", assetApprovalTransactionHash: "0xapproval", reserveDepositTransactionHash: "0xdeposit", campaignFundingTransactionHash: "0xfunding", settlementQueueTransactionHash: "0xqueue", settlementFundingTransactionHash: "0xsettlementfunding", settlementClaimTransactionHash: "0xclaim" },
});

assert.equal(proof.readiness.complete, true);
assert.equal(proof.readiness.verifiedStages, 5);
assert.equal(proof.asset?.symbol, "CPT");
assert.equal(proof.campaign?.recipientCount, 100);
assert.equal(proof.campaign?.claimEvidence, "funded-capability");
assert.equal(proof.settlement?.claimEvidence, "claimed-and-verified");
assert.equal(proof.settlement?.claimed, true);
assert.equal(proof.settlement?.remainingAmount, "0");
assert.equal(proof.settlement?.claimTransactionHash, "0xclaim");
assert.match(proof.boundary, /not external pilot traction/i);
assert.match(proof.valueStatus, /no monetary value/i);
const { digest, ...body } = proof;
assert.equal(digest, projectTokenProofDigest(body));
const serialized = JSON.stringify(proof);
for (const secret of ["private-campaign-id", "private-settlement-id", "0xprivate-treasury", "0xprivate-guardian", "0xprivate-sender", "recipientIdentity", "apiKey"]) {
  assert.equal(serialized.includes(secret), false);
}
console.log("project-token settlement integrity, capability boundary, and privacy checks passed");
