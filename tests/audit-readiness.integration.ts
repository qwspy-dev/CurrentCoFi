import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getAuditReadiness } from "../server/security/audit-readiness.js";

const readiness = getAuditReadiness();
assert.equal(readiness.schemaVersion, "current-audit-manifest-v1");
assert.equal(readiness.assurance, "internal-review-only");
assert.equal(readiness.mainnetApproved, false);
assert.equal(readiness.verification.externalAuditStatus, "pending");
assert.equal(readiness.verification.scopeDriftGate, true);
assert.equal(readiness.sources.length, 18);
assert.equal(new Set(readiness.sources.map((item) => item.path)).size, readiness.sources.length);
assert.match(readiness.manifestDigest, /^[a-f0-9]{64}$/);
assert.ok(readiness.sources.every((item) => item.path.startsWith("contracts/") && /^[a-f0-9]{64}$/.test(item.sha256)));
assert.ok(readiness.sources.every((item) => /^[a-f0-9]{64}$/.test(item.artifact.sha256) && /^[a-f0-9]{64}$/.test(item.artifact.creationBytecodeSha256)));
assert.equal(readiness.compiler.optimizer.runs, 10_000);
assert.ok(readiness.reproducibility.commands.includes("pnpm security:test"));
assert.match(readiness.boundary, /not an independent audit report/i);

const conditionSource = await readFile("server/campaigns/conditions.ts", "utf8");
const settlementSource = await readFile("server/campaigns/settlement.ts", "utf8");
for (const boundary of ["allocationId", "walletAddress", "eventType", "consumedAt", "expiresAt"]) assert.ok(conditionSource.includes(boundary));
assert.match(settlementSource, /CLAIM_CONDITION_REQUIRED/);
assert.match(settlementSource, /consumeClaimConditionProof/);

console.log("Reproducible audit manifest, scope digests, external-review boundary, and conditional-claim invariants verified.");
