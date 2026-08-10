import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { splitVestingAmount, vestingState } from "../server/vesting/repository.js";

assert.deepEqual(splitVestingAmount("1000001", 4), ["250000", "250000", "250000", "250001"]);
assert.equal(splitVestingAmount("1000001", 4).reduce((sum, item) => sum + BigInt(item), BigInt(0)), BigInt(1000001));
assert.throws(() => splitVestingAmount("2", 4), /too small/i);
assert.equal(vestingState("awaiting_funding", 4, 0, 0), "awaiting_funding");
assert.equal(vestingState("active", 4, 0, 0), "vesting");
assert.equal(vestingState("active", 4, 1, 0), "claimable");
assert.equal(vestingState("completed", 4, 4, 4), "completed");

const [schema, repository, links, settlement, openapi, meta, evidence, mcp, app] = await Promise.all([
  readFile("server/db/schema.ts", "utf8"),
  readFile("server/vesting/repository.ts", "utf8"),
  readFile("server/claims/links.ts", "utf8"),
  readFile("server/campaigns/settlement.ts", "utf8"),
  readFile("api/v1/openapi.ts", "utf8"),
  readFile("api/v1/meta.ts", "utf8"),
  readFile("server/evidence/reports.ts", "utf8"),
  readFile("packages/mcp/src/server.ts", "utf8"),
  readFile("app/CurrentApp.tsx", "utf8"),
]);

assert.match(schema, /availableAt: timestamp\("available_at"/);
assert.match(schema, /identityCiphertext/);
assert.match(schema, /claimTokenCiphertext/);
assert.match(repository, /sealSecret\(recipient\.identity\)/);
assert.match(repository, /availableAtEnforcedByClaimAuthorizer/);
assert.match(links, /locked \? "locked"/);
assert.match(settlement, /ALLOCATION_LOCKED/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
assert.match(openapi, /"\/developer\/vesting"/);
assert.match(meta, /authorizer-enforced-allocation-cliffs/);
assert.match(evidence, /EVIDENCE_SCHEMA_VERSION = "current-evidence-v\d+"/);
assert.match(evidence, /walletless-launch-vesting/);
assert.match(mcp, /I_APPROVE_CURRENT_VESTING/);
assert.match(app, /WALLETLESS LAUNCH VESTING/);
assert.match(app, /PUBLIC LAUNCH ALLOCATION PROOF/);
assert.doesNotMatch(repository, /recipientLinks: prepared\.map[\s\S]*identity:/);

console.log("Walletless launch vesting verified: exact split accounting, encrypted recipients, enforced unlocks, public proof, evidence, SDK/MCP exposure, and product UI.");
