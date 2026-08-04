import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseActivationDestination } from "../server/campaigns/destinations.js";

assert.deepEqual(parseActivationDestination({
  url: "https://game.example/welcome?campaign=genesis",
  label: "Enter the game",
}), {
  url: "https://game.example/welcome?campaign=genesis",
  label: "Enter the game",
});
assert.equal(parseActivationDestination(undefined), null);
assert.throws(() => parseActivationDestination({ url: "http://unsafe.example", label: "Open" }), /HTTPS/);
assert.throws(() => parseActivationDestination({ url: "https://user:pass@example.com", label: "Open" }), /credentials/);
assert.throws(() => parseActivationDestination({ url: "https://example.com/#secret", label: "Open" }), /fragments/);

const [endpoint, claimView, analytics, evidence, sdk, mcp, openapi, meta] = await Promise.all([
  readFile(new URL("../api/v1/campaigns/destination.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../server/campaigns/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/evidence/reports.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/mcp/src/server.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
]);
assert.match(endpoint, /openActivationDestination/);
assert.match(claimView, /Authenticated return clicks/);
assert.match(claimView, /Post-claim destination/);
assert.match(analytics, /destinationRecipients/);
assert.match(evidence, /current-evidence-v22/);
assert.match(evidence, /A destination open is not a project-verified activation event/);
assert.match(sdk, /activationDestination/);
assert.match(mcp, /activationDestination/);
assert.match(openapi, /3\.15\.0-discovery-conversion-attribution/);
assert.match(meta, /claim-to-activation-funnel/);
console.log("Post-claim activation destinations verified: safe HTTPS configuration, authenticated return evidence, honest activation boundary, UI, SDK, MCP, analytics, and grant proof.");
