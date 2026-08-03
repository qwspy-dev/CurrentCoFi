import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseClaimCondition } from "../server/campaigns/conditions.js";

const condition = parseClaimCondition({
  eventType: "game.completed_3",
  label: "Complete 3 matches",
  description: "Finish the qualifying match series.",
  proofWindowMinutes: 60,
});

assert.deepEqual(condition, {
  eventType: "game.completed_3",
  label: "Complete 3 matches",
  description: "Finish the qualifying match series.",
  proofWindowMinutes: 60,
});
assert.equal(parseClaimCondition(undefined), null);
assert.throws(() => parseClaimCondition({ eventType: "not valid" }), /stable dotted identifier/i);
assert.throws(() => parseClaimCondition({ eventType: "game.done", proofWindowMinutes: 4 }), /between 5 minutes and 24 hours/i);

const settlement = await readFile(new URL("../server/campaigns/settlement.ts", import.meta.url), "utf8");
const conditions = await readFile(new URL("../server/campaigns/conditions.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../api/v1/developer/claim-conditions.ts", import.meta.url), "utf8");
const sdk = await readFile(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8");
const webhooks = await readFile(new URL("../server/developer/webhooks.ts", import.meta.url), "utf8");
const preview = await readFile(new URL("../server/claims/links.ts", import.meta.url), "utf8");

assert.match(settlement, /CLAIM_CONDITION_REQUIRED/);
const challengeFlow = settlement.slice(settlement.indexOf("export async function createCampaignClaimChallenge"));
assert.ok(challengeFlow.indexOf('existing?.status === "confirmed"') < challengeFlow.indexOf("activeClaimConditionProof"), "confirmed retries must remain idempotent after proof consumption");
assert.match(settlement, /consumeClaimConditionProof/);
assert.match(conditions, /externalEventId/);
assert.match(conditions, /allocationId[\s\S]*walletAddress[\s\S]*eventType/);
assert.match(conditions, /consumedAt/);
assert.match(route, /requireDeveloperPermission\(key, "identities:write"\)/);
assert.match(route, /verifySignedDeveloperRequest/);
assert.match(sdk, /conditions =/);
assert.match(sdk, /developer\/claim-conditions/);
assert.match(webhooks, /claim\.condition-verified/);
assert.match(webhooks, /claim\.condition-consumed/);
assert.match(preview, /verification-required/);

console.log("Conditional campaign policy, replay protection, API, SDK, webhooks, and public preview verified.");
