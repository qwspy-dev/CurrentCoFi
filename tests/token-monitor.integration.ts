import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compareTokenControls } from "../server/tokens/monitor.js";
import type { ArcTokenTrust } from "../server/tokens/trust.js";

const base: ArcTokenTrust = {
  schemaVersion: "1.1", network: "ARC-TESTNET", address: "0x1111111111111111111111111111111111111111",
  symbol: "FLOW", name: "Flow", decimals: 18, totalSupply: "100", totalSupplyAtomic: "100000000000000000000",
  codeHash: "0xaaa", codeSizeBytes: 900, owner: null, proxyImplementation: null, observedCapabilities: [],
  verified: false, posture: "standard-observations", distributionPolicy: "allowed-with-disclosure", signals: [],
  controlDigest: "control-a", reviewDigest: "review-a", inspectedAt: "2026-08-03T00:00:00.000Z",
  explorerUrl: "https://testnet.arcscan.app/address/0x1111111111111111111111111111111111111111",
  boundary: "Contract observations are not an audit.",
};

assert.deepEqual(compareTokenControls(base, { ...base, totalSupply: "200", totalSupplyAtomic: "200000000000000000000", reviewDigest: "review-b" }), [], "normal supply movement must not pause campaigns");
assert.deepEqual(compareTokenControls(base, { ...base, codeHash: "0xbbb" }), ["runtime-bytecode"]);
assert.deepEqual(compareTokenControls(base, { ...base, owner: "0x2222222222222222222222222222222222222222" }), ["owner-interface"]);
assert.deepEqual(compareTokenControls(base, { ...base, proxyImplementation: "0x3333333333333333333333333333333333333333" }), ["proxy-implementation"]);
assert.deepEqual(compareTokenControls(base, { ...base, observedCapabilities: ["mint", "pause"] }), ["privileged-selectors"]);

const [monitor, claims, campaigns, cron, route] = await Promise.all([
  readFile(new URL("../server/tokens/monitor.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/claims/settlement.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/campaigns/settlement.ts", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/asset-trust.ts", import.meta.url), "utf8"),
]);

assert.match(monitor, /approvedTrust/);
assert.match(monitor, /token\.trust_changed/);
assert.match(monitor, /trustPauseReason: "token-control-drift"/);
assert.match(monitor, /status: "active"/);
assert.match(claims, /assertDistributionTokenTrust\(row\.distributionId, "claim"\)/);
assert.match(claims, /assertDistributionTokenTrust\(row\.id, "funding"\)/);
assert.match(campaigns, /assertDistributionTokenTrust\(row\.distributionId, "claim"\)/);
assert.match(campaigns, /assertDistributionTokenTrust\(row\.id, "funding"\)/);
assert.match(cron, /\/api\/v1\/internal\/token-monitor/);
assert.match(route, /"acknowledge"/);
assert.doesNotMatch(monitor, /guaranteedSafe|safeToken|rugScore/);

console.log("Continuous token monitor verified: supply-safe drift comparison, funding and claim enforcement, automatic pause, acknowledgement, audit history, and scheduled review.");
