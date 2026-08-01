import assert from "node:assert/strict";
import { integrationManifest } from "../server/developer/integration-readiness.js";
import { assembleCampaignProofExplorer } from "../server/evidence/explorer.js";
import { buildReviewerDemo, reviewerDemoDigest } from "../server/grants/reviewer-demo.js";
import { assembleNetworkProof } from "../server/network/proof.js";

const now = new Date("2026-08-01T20:00:00.000Z");
const explorer = assembleCampaignProofExplorer({ configured:true, generatedAt:now, distributions:[{id:"private-distribution-id",kind:"merkle-campaign",status:"active",totalAmountAtomic:"1000000",claimedAmountAtomic:"100000",recipientCount:2,merkleRoot:"0xmerkle",vaultAddress:"0xprivate-wallet",fundingTxHash:"0xfunding",startsAt:null,expiresAt:null,createdAt:now,rules:{claimMode:"identity-bound"},metadata:{campaignName:"Secret Campaign"},token:{symbol:"USDC",name:"USD Coin",decimals:6,contractAddress:"0xtoken",verified:true}}], allocations:[{distributionId:"private-distribution-id",status:"confirmed"}], claims:[{distributionId:"private-distribution-id",status:"confirmed",transactionHash:"0xsettlement",confirmedAt:now}], activations:[{distributionId:"private-distribution-id",eventType:"played_match",userId:"private-user-id"}], attestations:[], referrals:[], crosschain:[], gateway:[] });
const network = assembleNetworkProof({ configured:true, asOf:now, totals:{projects:1,campaigns:1,recipientsTargeted:2,confirmedClaims:1,fundedWallets:1,activatedUsers:1,activationEvents:1,usdcClaimedAtomic:"100000",projectTokenCampaigns:0} });
const demo = buildReviewerDemo({ generatedAt:now.toISOString(), explorer, network, manifest:integrationManifest() });
assert.equal(demo.readiness.complete,true);
assert.equal(demo.stages.length,5);
assert.equal(demo.stages[0].evidence.transactionHash,"0xfunding");
assert.equal(demo.stages[2].evidence.transactionHash,"0xsettlement");
const {digest,...body}=demo;
assert.equal(digest,reviewerDemoDigest(body));
const serialized=JSON.stringify(demo);
for(const secret of ["private-distribution-id","private-user-id","Secret Campaign","0xprivate-wallet","walletAddress","apiKey"]) assert.equal(serialized.includes(secret),false);
console.log("reviewer demo replay integrity, live-anchor selection, and privacy checks passed");
