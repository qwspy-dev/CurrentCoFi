import assert from "node:assert/strict";
import { applicationPacketDigest, buildGrantApplicationPacket, grantApplicationMarkdown } from "../server/grants/application-packet.js";
import { buildGrantDossier } from "../server/grants/dossier.js";
import { assembleNetworkProof } from "../server/network/proof.js";

const network = assembleNetworkProof({
  configured: true,
  asOf: new Date("2026-08-01T20:00:00.000Z"),
  totals: { projects: 5, campaigns: 6, recipientsTargeted: 7, confirmedClaims: 2, fundedWallets: 1, activatedUsers: 1, activationEvents: 1, usdcClaimedAtomic: "110000", projectTokenCampaigns: 1 },
});
const dossier = buildGrantDossier({ generatedAt: "2026-08-01T20:00:00.000Z", network, launch: null, launchError: "test fallback" });
const packet = buildGrantApplicationPacket({ generatedAt: "2026-08-01T21:00:00.000Z", dossier });
const { digest, ...body } = packet;

assert.equal(digest, applicationPacketDigest(body));
assert.equal(packet.applicationAnswers.length, 8);
assert.equal(packet.proposedMilestones.length, 4);
assert.equal(packet.applicantInputs.length, 4);
assert.equal(packet.evidenceSnapshot.confirmedClaims, 2);
assert.match(packet.boundary, /does not claim an open application window/i);
assert.ok(packet.applicationAnswers.every((item) => item.wordCount > 25 && item.wordCount < 180));
assert.ok(packet.applicationAnswers.find((item) => item.id === "traction")?.response.includes("not presented as external partner traction"));
assert.ok(packet.applicationAnswers.find((item) => item.id === "use-of-grant")?.response.includes("rather than invented"));
const markdown = grantApplicationMarkdown(packet);
assert.match(markdown, /# Current CoFi/);
assert.match(markdown, /Applicant inputs still required/);
assert.match(markdown, new RegExp(digest));
const serialized = JSON.stringify(packet);
for (const forbidden of ["recipientAddress", "apiKey", "partnerEmail", "founderName", "requestedAmount"]) assert.equal(serialized.includes(forbidden), false);

console.log("grant application packet integrity, evidence boundary, exports, and privacy checks passed");
