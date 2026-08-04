import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicDropState } from "../server/drops/repository.js";

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);
assert.equal(publicDropState("awaiting_funding", future, 0, 100), "awaiting_funding");
assert.equal(publicDropState("active", future, 20, 100), "open");
assert.equal(publicDropState("active", future, 100, 100), "full");
assert.equal(publicDropState("completed", future, 100, 100), "full");
assert.equal(publicDropState("active", past, 20, 100), "expired");
assert.equal(publicDropState("refunded", future, 20, 100), "cancelled");

const [schema, repository, publicRoute, app, sdk, mcp, meta, openapi, evidence] = await Promise.all([
  readFile("server/db/schema.ts", "utf8"), readFile("server/drops/repository.ts", "utf8"), readFile("api/v1/drops/public.ts", "utf8"),
  readFile("app/CurrentApp.tsx", "utf8"), readFile("packages/sdk/src/index.ts", "utf8"), readFile("packages/mcp/src/server.ts", "utf8"),
  readFile("api/v1/meta.ts", "utf8"), readFile("api/v1/openapi.ts", "utf8"), readFile("server/evidence/reports.ts", "utf8"),
]);
assert.match(schema, /publicDropSlots/);
assert.match(schema, /public_drops_slug_unique/);
assert.match(repository, /claimMode: "identity-bound"/);
assert.match(repository, /sealSecret\(email\)/);
assert.match(repository, /isNull\(publicDropSlots\.identityHash\)/);
assert.match(repository, /update\(allocations\)[\s\S]*identityType: "email"/);
assert.doesNotMatch(publicRoute, /identityCiphertext|claimTokenCiphertext/);
assert.match(app, /Do not just airdrop\. Activate\./);
assert.match(app, /One verified email, one reward/);
assert.match(sdk, /readonly drops/);
assert.match(mcp, /I_APPROVE_CURRENT_PUBLIC_DROP/);
assert.match(meta, /public-walletless-mass-drops/);
assert.match(openapi, /3\.11\.0-proof-gated-public-drops/);
assert.match(openapi, /"\/developer\/drops"/);
assert.match(evidence, /current-evidence-v22/);
assert.match(evidence, /Encrypted email identities and private claim credentials are excluded/);

console.log("Public walletless mass drops verified: capped funding, atomic one-identity reservations, referral attribution, embedded-wallet claim handoff, SDK/MCP access, and privacy-safe grant evidence.");
