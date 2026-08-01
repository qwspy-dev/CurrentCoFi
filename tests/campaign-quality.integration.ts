import assert from "node:assert/strict";
import { DEFAULT_QUALITY_POLICY, evaluateQualitySignals } from "../server/campaigns/quality.js";

const healthy = evaluateQualitySignals({
  accountAgeMinutes: 7_200,
  activationDelaySeconds: 600,
  referralsInBurstWindow: 2,
  distinctActivationTypes: 3,
  ageSinceClaimHours: 240,
});
assert.deepEqual(healthy, { score: 0, band: "low", decision: "allow", signals: [] });

const suspicious = evaluateQualitySignals({
  accountAgeMinutes: 5,
  activationDelaySeconds: 2,
  referralsInBurstWindow: 12,
  distinctActivationTypes: 1,
  ageSinceClaimHours: 48,
});
assert.equal(suspicious.score, 95);
assert.equal(suspicious.band, "high");
assert.equal(suspicious.decision, "manual-review");
assert.deepEqual(suspicious.signals.map((signal) => signal.id), [
  "fresh-account", "referral-burst", "instant-activation", "single-action-only",
]);

const held = evaluateQualitySignals({
  accountAgeMinutes: 0,
  activationDelaySeconds: 0,
  referralsInBurstWindow: 20,
  distinctActivationTypes: 0,
  ageSinceClaimHours: 200,
  policy: { ...DEFAULT_QUALITY_POLICY, action: "hold-referral-reward" },
});
assert.equal(held.score, 100);
assert.equal(held.decision, "hold-referral-reward");
assert.ok(held.signals.every((signal) => signal.evidence.length > 10));

const monitor = evaluateQualitySignals({
  accountAgeMinutes: 0,
  activationDelaySeconds: 0,
  referralsInBurstWindow: 20,
  distinctActivationTypes: 0,
  ageSinceClaimHours: 200,
  policy: { ...DEFAULT_QUALITY_POLICY, action: "monitor" },
});
assert.equal(monitor.decision, "manual-review", "monitor mode must never hold a referral reward");

console.log("Explainable campaign-quality signals and enforcement boundaries passed.");
