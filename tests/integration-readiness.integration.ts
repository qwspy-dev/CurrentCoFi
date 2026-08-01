import assert from "node:assert/strict";
import { integrationManifest } from "../server/developer/integration-readiness.js";

const first = integrationManifest();
const second = integrationManifest();
assert.equal(first.schemaVersion, "current-integration-v1");
assert.equal(first.digest, second.digest);
assert.match(first.digest, /^[a-f0-9]{64}$/);
assert.ok(first.circleStack.includes("Arc settlement"));
assert.ok(first.circleStack.includes("USDC"));
assert.ok(first.endpoints.some(endpoint => endpoint.path === "/api/v1/developer/integration-readiness"));
assert.ok(first.paths.some(path => path.id === "agent-tools"));
assert.ok(first.webhookEvents.includes("activation.completed"));
console.log("Builder integration manifest stability and complete-loop contract passed.");
