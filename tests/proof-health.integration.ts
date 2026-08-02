import assert from "node:assert/strict";
import { assembleProofHealth, proofHealthDigest } from "../server/proofs/health.js";

const proof = assembleProofHealth({
  generatedAt: "2026-08-02T01:00:00.000Z",
  network: { configured: true, digest: "network-digest", totals: { campaigns: 3, confirmedClaims: 2 } } as never,
  campaigns: { configured: true, digest: "campaign-digest", totals: { campaigns: 3 } } as never,
  projectToken: { readiness: { complete: true, verifiedStages: 5, stages: 5 }, settlement: { claimed: true, state: "completed", totalAmount: "25" }, digest: "project-token-digest" } as never,
  release: { configured: true, readinessScore: 100, release: { active: true, manifestHash: "release-manifest" }, components: [{ valid: true, addressMatches: true }, { valid: true, addressMatches: true }] } as never,
  integration: { digest: "integration-digest", endpoints: [{}, {}, {}, {}, {}], paths: [{}, {}, {}, {}] } as never,
  security: { assurance: { internalReadinessScore: 100, implementedControls: 10, totalInternalControls: 10 }, controls: [{ id: "safe" }], reviewPackage: { repository: "public" } } as never,
});

assert.equal(proof.status, "healthy");
assert.equal(proof.score, 100);
assert.equal(proof.verifiedChecks, 6);
assert.equal(proof.totalChecks, 6);
assert.equal(proof.checks.find((check) => check.id === "project-token-settlement")?.status, "verified");
assert.match(proof.boundary, /does not self-attest external pilots/i);
assert.match(proof.checks.find((check) => check.id === "security-boundary")?.externalGate ?? "", /independent/i);
const { digest, ...body } = proof;
assert.equal(digest, proofHealthDigest(body));
const serialized = JSON.stringify(proof);
for (const privateValue of ["recipientIdentity", "walletAddress", "apiKey", "privateProjectId"]) assert.equal(serialized.includes(privateValue), false);

console.log("grant proof-health integrity, external-boundary, and privacy checks passed");
