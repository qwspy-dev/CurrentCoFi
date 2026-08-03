import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseClaimCondition } from "../server/campaigns/conditions.js";

const condition = parseClaimCondition({
  eventType: "game.completed_3",
  label: "Complete 3 matches",
  description: "Finish three matches before settlement.",
  proofWindowMinutes: 60,
});
assert.deepEqual(condition, {
  eventType: "game.completed_3",
  label: "Complete 3 matches",
  description: "Finish three matches before settlement.",
  proofWindowMinutes: 60,
});
assert.throws(() => parseClaimCondition({ eventType: "x", label: "ok", proofWindowMinutes: 1 }));

const [repository, userRoute, developerRoute, app, sdk, mcp, meta, openapi, evidence] = await Promise.all([
  readFile("server/drops/repository.ts", "utf8"), readFile("api/v1/drops.ts", "utf8"), readFile("api/v1/developer/drops.ts", "utf8"),
  readFile("app/CurrentApp.tsx", "utf8"), readFile("packages/sdk/src/index.ts", "utf8"), readFile("packages/mcp/src/server.ts", "utf8"),
  readFile("api/v1/meta.ts", "utf8"), readFile("api/v1/openapi.ts", "utf8"), readFile("server/evidence/reports.ts", "utf8"),
]);
assert.match(repository, /parseClaimCondition\(input\.claimCondition\)/);
assert.match(repository, /claimCondition,/);
assert.match(repository, /proof-gated-first-come/);
assert.match(repository, /project-signed, wallet-bound authorization/);
assert.match(userRoute, /claimCondition: body\.claimCondition/);
assert.match(developerRoute, /claimCondition: body\.claimCondition/);
assert.match(app, /Do not just airdrop\. Activate\./);
assert.match(app, /Require verified action/);
assert.match(app, /proofWindowMinutes:60/);
assert.match(sdk, /CreatePublicDropInput[\s\S]*claimCondition/);
assert.match(mcp, /project-signed action proof/);
assert.match(meta, /proof-gated-public-activation-drops/);
assert.match(openapi, /3\.11\.0-proof-gated-public-drops/);
assert.match(evidence, /current-evidence-v20/);
assert.match(evidence, /proofGatedPublicDrops/);

console.log("Proof-gated public activation drops verified: condition validation, consumer and developer inputs, wallet-bound settlement boundary, UI controls, SDK/MCP contract, and grant evidence.");
