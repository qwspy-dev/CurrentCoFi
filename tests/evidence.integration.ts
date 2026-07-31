import assert from "node:assert/strict";
import {
  evidenceDigest,
  evidenceReadiness,
  stableEvidenceJson,
} from "../server/evidence/reports.js";

const left = {
  project: { name: "Current", id: "project_1" },
  totals: { claims: 8, campaigns: 2 },
  sources: ["Arc", "Circle"],
};
const right = {
  sources: ["Arc", "Circle"],
  totals: { campaigns: 2, claims: 8 },
  project: { id: "project_1", name: "Current" },
};

assert.equal(stableEvidenceJson(left), stableEvidenceJson(right));
assert.equal(await evidenceDigest(left), await evidenceDigest(right));

const readiness = evidenceReadiness([
  { id: "one", label: "One", weight: 10, passed: true, evidence: "Verified" },
  { id: "two", label: "Two", weight: 15, passed: false, evidence: "Pending" },
  { id: "three", label: "Three", weight: 25, passed: true, evidence: "Verified" },
]);
assert.deepEqual(readiness, {
  score: 70,
  earned: 35,
  possible: 50,
  criteria: [
    { id: "one", label: "One", weight: 10, passed: true, evidence: "Verified" },
    { id: "two", label: "Two", weight: 15, passed: false, evidence: "Pending" },
    { id: "three", label: "Three", weight: 25, passed: true, evidence: "Verified" },
  ],
});

console.log("Canonical grant-evidence digest and readiness scoring passed.");
