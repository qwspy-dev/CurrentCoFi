import assert from "node:assert/strict";
import { pilotReadiness } from "../server/pilots/operations.js";

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

console.log("Pilot lifecycle and grant-readiness scoring passed.");
