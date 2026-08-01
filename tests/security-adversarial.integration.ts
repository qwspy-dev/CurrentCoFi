import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSecurityPosture } from "../server/security/posture.js";
import { deriveOverallStatus } from "../server/observability/status.js";

const posture = getSecurityPosture();
assert.equal(posture.assurance.internalReadinessScore, 100);
assert.equal(posture.assurance.externalAuditStatus, "pending");
assert.equal(posture.assurance.mainnetApproved, false);
assert.equal(posture.controls.filter((control) => control.status === "implemented").length, posture.assurance.totalInternalControls);
assert.ok(posture.privilegedRoles.some((entry) => entry.role === "Independent guardian" && entry.boundary.includes("Cannot execute")));
assert.ok(posture.fundFlows.every((entry) => entry.custody && entry.release));

assert.equal(deriveOverallStatus([
  { id: "one", name: "one", status: "operational", latencyMs: 10, message: "ok" },
], [{ severity: "critical" }]), "major_outage");

const invariants = await readFile("docs/security-invariants.md", "utf8");
for (const requirement of ["settles at most once", "Raw email", "governance delay", "mainnet approved"]) {
  assert.ok(invariants.includes(requirement), `Missing documented invariant: ${requirement}`);
}

const scope = JSON.parse(await readFile("security/audit-scope.json", "utf8"));
assert.equal(scope.mainnetApproved, false);
assert.equal(scope.contracts.length, 15);
assert.ok(scope.priorityProperties.length >= 6);
console.log("Security adversarial integration checks passed.");
