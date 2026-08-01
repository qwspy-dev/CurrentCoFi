import assert from "node:assert/strict";
import { pilotApplicationReadiness, pilotReadiness } from "../server/pilots/operations.js";

const onboarding = pilotReadiness({
  brief: true,
  integrations: true,
  campaign: false,
  funding: false,
  claims: false,
  activations: false,
  attestation: false,
});
assert.equal(onboarding.completed, 2);
assert.equal(onboarding.score, 29);
assert.equal(onboarding.lifecycle, "onboarding");

const live = pilotReadiness({
  brief: true,
  integrations: true,
  campaign: true,
  funding: true,
  claims: false,
  activations: false,
  attestation: false,
});
assert.equal(live.score, 57);
assert.equal(live.lifecycle, "live");

const complete = pilotReadiness({
  brief: true,
  integrations: true,
  campaign: true,
  funding: true,
  claims: true,
  activations: true,
  attestation: true,
});
assert.equal(complete.score, 100);
assert.equal(complete.lifecycle, "complete");

const qualifiedApplication = pilotApplicationReadiness({
  website: true,
  audience: true,
  recipients: 500,
  integrations: 4,
  activationMeasurement: true,
});
assert.deepEqual(qualifiedApplication, { completed: 5, total: 5, score: 100 });

const earlyApplication = pilotApplicationReadiness({
  website: false,
  audience: true,
  recipients: 10,
  integrations: 1,
  activationMeasurement: false,
});
assert.deepEqual(earlyApplication, { completed: 1, total: 5, score: 20 });

console.log("Pilot lifecycle, intake readiness, and grant-readiness scoring passed.");
