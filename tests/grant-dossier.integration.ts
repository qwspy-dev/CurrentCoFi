import assert from "node:assert/strict";
import { buildGrantDossier, dossierDigest } from "../server/grants/dossier.js";
import { assembleNetworkProof } from "../server/network/proof.js";

const network = assembleNetworkProof({
  configured: true,
  asOf: new Date("2026-08-01T20:00:00.000Z"),
  totals: { projects: 5, campaigns: 6, recipientsTargeted: 7, confirmedClaims: 2, fundedWallets: 1, activatedUsers: 1, activationEvents: 1, usdcClaimedAtomic: "110000", projectTokenCampaigns: 0 },
});
const dossier = buildGrantDossier({ generatedAt: "2026-08-01T20:00:00.000Z", network, launch: null, launchError: "test fallback" });
const { digest, ...body } = dossier;

assert.equal(digest, dossierDigest(body));
assert.equal(dossier.liveProof.network.totals.campaigns, 6);
assert.equal(dossier.liveProof.release.available, false);
assert.equal(dossier.criteria.length, 4);
assert.equal(dossier.externalGates.length, 4);
assert.match(dossier.boundary, /does not claim/i);
assert.ok(dossier.shipped.some((item) => item.id === "developer-platform"));
const serialized = JSON.stringify(dossier);
assert.ok(!serialized.includes("recipientAddress"));
assert.ok(!serialized.includes("apiKey"));
assert.ok(!serialized.includes("partnerEmail"));

console.log("public grant dossier integrity, claims boundary, and privacy checks passed");
