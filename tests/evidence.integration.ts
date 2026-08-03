import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const reports = await readFile(new URL("../server/evidence/reports.ts", import.meta.url), "utf8");
assert.match(reports, /current-evidence-v17/);
assert.match(reports, /Direct merchant USDC settlement/);
assert.match(reports, /Subscriber-controlled recurring USDC/);
assert.match(reports, /checkoutVolume/);
assert.match(reports, /subscriptionVolume/);
assert.match(reports, /Prize-backed contributor bounties/);
assert.match(reports, /bountySubmissions/);
assert.doesNotMatch(reports, /customerAddress: row\.payment\.customerAddress/);
assert.doesNotMatch(reports, /subscriberAddress: row\.subscription\.subscriberAddress/);

console.log("Canonical grant-evidence digest and readiness scoring passed.");
