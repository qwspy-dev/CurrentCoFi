import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { integrationManifest } from "../server/developer/integration-readiness.js";
import { mcpManifest } from "../server/developer/mcp-manifest.js";
import { buildGrantApplicationPacket } from "../server/grants/application-packet.js";
import { buildGrantDossier } from "../server/grants/dossier.js";
import { buildReviewerBundle, verifyReviewerBundleManifest } from "../server/grants/reviewer-bundle.js";
import { assembleNetworkProof } from "../server/network/proof.js";
import { getAuditReadiness } from "../server/security/audit-readiness.js";
import { getSecurityPosture } from "../server/security/posture.js";

const generatedAt = "2026-08-10T12:00:00.000Z";
const network = assembleNetworkProof({
  configured: true,
  asOf: new Date(generatedAt),
  totals: { projects: 5, campaigns: 8, recipientsTargeted: 120, confirmedClaims: 42, fundedWallets: 38, activatedUsers: 21, activationEvents: 29, usdcClaimedAtomic: "125000000", projectTokenCampaigns: 3 },
});
const dossier = buildGrantDossier({ generatedAt, network, launch: null, launchError: "Fixture intentionally omits live RPC." });
const application = buildGrantApplicationPacket({ generatedAt, dossier });
const result = buildReviewerBundle({ generatedAt, application, dossier, security: getSecurityPosture(), auditReadiness: getAuditReadiness(), integration: integrationManifest(), mcp: mcpManifest() });

assert.equal(result.manifest.schemaVersion, "current-circle-reviewer-bundle-v1");
assert.equal(result.manifest.files.length, 10);
assert.equal(result.manifest.applicationDigest, application.digest);
assert.equal(result.manifest.dossierDigest, dossier.digest);
assert.equal(verifyReviewerBundleManifest(result.manifest), true);

const archive = unzipSync(result.archive);
for (const required of ["README.md", "application.md", "application.json", "dossier.json", "security.json", "audit-readiness.json", "integration-manifest.json", "mcp-manifest.json", "external-gaps.json", "reviewer-links.json", "checksums.sha256", "manifest.json"]) assert.ok(archive[required], `${required} missing`);
for (const file of result.manifest.files) {
  const content = archive[file.path];
  assert.ok(content, `${file.path} missing from ZIP`);
  assert.equal(createHash("sha256").update(content).digest("hex"), file.sha256);
  assert.equal(content.byteLength, file.bytes);
}
const embeddedManifest = JSON.parse(strFromU8(archive["manifest.json"])) as Record<string, unknown>;
assert.equal(verifyReviewerBundleManifest(embeddedManifest), true);
assert.match(strFromU8(archive["external-gaps.json"]), /independent security review/i);
assert.match(strFromU8(archive["README.md"]), /No recipient identity/i);
assert.doesNotMatch(strFromU8(result.archive), /person@example\.com|current_[a-z0-9]{20,}/i);
assert.equal(verifyReviewerBundleManifest({ ...embeddedManifest, environment: "Arc mainnet" }), false);

const sourceChecks = [
  ["api/v1/grant-bundle.ts", /createGrantReviewerBundle/],
  ["api/v1/grant-bundle/download.ts", /application\/zip/],
  ["api/v1/openapi.ts", /grant-bundle\/download/],
  ["api/v1/meta.ts", /cryptographically-verifiable-reviewer-bundle/],
  ["app/CurrentApp.tsx", /Download reviewer ZIP/],
  ["packages/sdk/src/index.ts", /reviewerBundleDownloadUrl/],
  ["packages/mcp/src/server.ts", /current_get_reviewer_bundle_manifest/],
  ["docs/circle-reviewer-bundle.md", /per-file SHA-256 checksums/i],
] as const;
for (const [path, pattern] of sourceChecks) assert.match(await readFile(path, "utf8"), pattern, `${path} is not wired`);

console.log("Circle reviewer bundle verified: twelve archive files, ten content checksums, canonical manifest digest, privacy boundary, tamper detection, API, UI, SDK, MCP, and documentation wiring.");
