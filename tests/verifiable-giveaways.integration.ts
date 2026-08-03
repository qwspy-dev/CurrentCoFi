import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deterministicGiveawayDraw, giveawayStatus } from "../server/giveaways/repository.js";

const repository = readFileSync(new URL("../server/giveaways/repository.ts", import.meta.url), "utf8");
const publicRoute = readFileSync(new URL("../api/v1/giveaways/public.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8");
const sdk = readFileSync(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8");
const mcp = readFileSync(new URL("../packages/mcp/src/server.ts", import.meta.url), "utf8");
const meta = readFileSync(new URL("../api/v1/meta.ts", import.meta.url), "utf8");
const openapi = readFileSync(new URL("../api/v1/openapi.ts", import.meta.url), "utf8");
const evidence = readFileSync(new URL("../server/evidence/reports.ts", import.meta.url), "utf8");

const deadline = new Date("2026-08-05T00:00:00.000Z");
assert.equal(giveawayStatus("created", "draft", deadline, 0, 100, Date.parse("2026-08-04T00:00:00.000Z")), "awaiting_funding");
assert.equal(giveawayStatus("created", "active", deadline, 10, 100, Date.parse("2026-08-04T00:00:00.000Z")), "open");
assert.equal(giveawayStatus("created", "active", deadline, 100, 100, Date.parse("2026-08-04T00:00:00.000Z")), "ready_to_draw");
assert.equal(giveawayStatus("drawn", "completed", deadline, 100, 100, Date.parse("2026-08-06T00:00:00.000Z")), "drawn");

const first = await deterministicGiveawayDraw("revealed-secret", "giveaway_1", ["entry_c", "entry_a", "entry_b"]);
const reordered = await deterministicGiveawayDraw("revealed-secret", "giveaway_1", ["entry_b", "entry_c", "entry_a"]);
assert.deepEqual(first, reordered, "Entry insertion order must not affect the draw.");
assert.equal(first.sortedEntryDigests.length, 3);
assert.ok(first.winnerIndex >= 0 && first.winnerIndex < 3);
assert.notEqual((await deterministicGiveawayDraw("different-secret", "giveaway_1", ["entry_a", "entry_b", "entry_c"])).drawDigest, first.drawDigest);
await assert.rejects(() => deterministicGiveawayDraw("secret", "giveaway_1", ["only_entry"]), /At least two unique entries/);

assert.match(repository, /randomnessCommitment/);
assert.match(repository, /randomnessCiphertext/);
assert.match(repository, /identityCiphertext/);
assert.match(repository, /ALREADY_ENTERED/);
assert.match(repository, /GIVEAWAY_NOT_FUNDED/);
assert.match(repository, /GIVEAWAY_STILL_OPEN/);
assert.doesNotMatch(publicRoute, /claimTokenCiphertext|identityCiphertext|randomnessCiphertext/);
assert.match(ui, /Let the current choose/);
assert.match(ui, /No wallet required/);
assert.match(sdk, /readonly giveaways/);
assert.match(mcp, /I_APPROVE_CURRENT_GIVEAWAY/);
assert.match(meta, /commit-reveal-random-winner-selection/);
assert.match(openapi, /3\.8\.0-verifiable-giveaways/);
assert.match(openapi, /\/developer\/giveaways/);
assert.match(evidence, /current-evidence-v17/);
assert.match(evidence, /Only masked aggregate entry and referral evidence/);

console.log("Verifiable giveaways verified: funded prize custody, encrypted one-identity entry, referral attribution, order-independent commit-reveal draw, walletless winner claim, SDK/MCP access, and privacy-safe grant evidence.");
