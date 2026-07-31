import assert from "node:assert/strict";
import { deriveOverallStatus, healthScore, type ServiceComponent } from "../server/observability/status.js";
import { isIncidentSeverity, isIncidentStatus } from "../server/observability/incidents.js";

const healthy: ServiceComponent[] = [
  { id: "api", name: "API", status: "operational", latencyMs: 80, message: "Ready" },
  { id: "arc", name: "Arc", status: "operational", latencyMs: 120, message: "Ready" },
];
assert.equal(deriveOverallStatus(healthy, []), "operational");
assert.equal(healthScore(healthy), 100);
assert.equal(deriveOverallStatus([{ ...healthy[0], status: "degraded" }, healthy[1]], []), "degraded");
assert.equal(healthScore([{ ...healthy[0], status: "degraded" }, healthy[1]]), 75);
assert.equal(deriveOverallStatus([{ ...healthy[0], status: "outage" }, healthy[1]], []), "major_outage");
assert.equal(deriveOverallStatus(healthy, [{ severity: "critical" }]), "major_outage");
assert.equal(deriveOverallStatus(healthy, [{ severity: "minor" }]), "degraded");
assert.equal(isIncidentStatus("monitoring"), true);
assert.equal(isIncidentStatus("reopened"), false);
assert.equal(isIncidentSeverity("critical"), true);
assert.equal(isIncidentSeverity("emergency"), false);
console.log("observability and incident-response integration tests passed");
