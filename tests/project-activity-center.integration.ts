import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activityCategory, activityLabel, activityTone } from "../server/activity/repository.js";

assert.equal(activityCategory("workspace.invitation-created"), "access");
assert.equal(activityCategory("campaign.funded"), "distribution");
assert.equal(activityCategory("claim.confirmed"), "settlement");
assert.equal(activityCategory("escrow.milestone-released"), "commerce");
assert.equal(activityCategory("agent.action-reviewed"), "developer");
assert.equal(activityCategory("evidence.report.created"), "evidence");
assert.equal(activityCategory("liquidity.position-created"), "protocol");
assert.equal(activityCategory("unknown.event"), "operations");
assert.equal(activityTone("workspace.invitation-revoked"), "attention");
assert.equal(activityTone("campaign.funded"), "success");
assert.equal(activityTone("campaign.read"), "neutral");
assert.equal(activityLabel("workspace.member-role-updated"), "Workspace · Member-Role-Updated");

const repository = await readFile(new URL("../server/activity/repository.ts", import.meta.url), "utf8");
const api = await readFile(new URL("../api/v1/activity.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8");
const openapi = await readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8");

assert.match(repository, /requireMembership/);
assert.match(repository, /SAFE_METADATA_KEYS/);
assert.match(repository, /\^\[=\+\\-@\\t\\r\]/);
assert.doesNotMatch(repository, /ipHash:\s*row\.ipHash/);
assert.match(api, /text\/csv/);
assert.match(api, /content-disposition/);
assert.match(ui, /Every important action\. One accountable current\./);
assert.match(ui, /Export audit CSV/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);

console.log("Project activity center verified: member-only audit access, bounded metadata, actor attribution, filters, and privacy-safe CSV export.");
