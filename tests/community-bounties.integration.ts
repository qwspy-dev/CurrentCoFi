import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ApiError } from "../server/http.js";
import { deriveBountyStatus, maskBountyContact, sanitizeBountyWorkUrl } from "../server/bounties/repository.js";

const now = new Date("2026-08-03T12:00:00.000Z").getTime();
assert.equal(deriveBountyStatus("draft", "awaiting_funding", new Date(now + 86_400_000), now), "awaiting_funding");
assert.equal(deriveBountyStatus("draft", "active", new Date(now + 86_400_000), now), "open");
assert.equal(deriveBountyStatus("draft", "active", new Date(now - 1), now), "review");
assert.equal(deriveBountyStatus("awarded", "active", new Date(now - 1), now), "awarded");
assert.equal(maskBountyContact("email", "builder@example.com"), "b*****@example.com");
assert.equal(maskBountyContact("wallet", "0x1111111111111111111111111111111111111111"), "0x11111…11111");
assert.equal(sanitizeBountyWorkUrl("https://example.com/proof"), "https://example.com/proof");
assert.throws(() => sanitizeBountyWorkUrl("http://example.com/proof"), (error: unknown) => error instanceof ApiError && error.code === "INVALID_WORK_URL");

const [repository, schema, developer, publicApi, evidence, sdk, mcp, meta, openapi] = await Promise.all([
  readFile(new URL("../server/bounties/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/developer/bounties.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/bounties/public.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/evidence/reports.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/mcp/src/server.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8"),
]);

assert.match(repository, /claimTokenCiphertext: await sealSecret/);
assert.match(repository, /contactCiphertext: await sealSecret/);
assert.match(repository, /distribution\.status !== "active"/);
assert.match(repository, /claimUrl:.*openSecret/);
assert.match(repository, /bounty\.created/);
assert.match(repository, /bounty\.submitted/);
assert.match(repository, /bounty\.awarded/);
assert.match(schema, /bounty_submissions_bounty_contact_unique/);
assert.match(developer, /verifySignedDeveloperRequest/);
assert.match(publicApi, /publicBounty/);
assert.match(evidence, /current-evidence-v17/);
assert.match(evidence, /Prize-backed contributor bounties/);
assert.match(sdk, /readonly bounties/);
assert.match(mcp, /current_create_community_bounty/);
assert.match(meta, /fully-funded-community-bounties/);
assert.match(openapi, /3\.8\.0-verifiable-giveaways/);

console.log("community bounty custody, identity privacy, developer integration, award, and grant-evidence controls passed");
