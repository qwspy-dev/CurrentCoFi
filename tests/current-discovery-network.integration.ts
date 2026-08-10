import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeDiscoveryTier, rankDiscoveryItems, validateDiscoveryInteraction, type DiscoveryItem } from "../server/discovery/network.js";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [schema, route, app, styles, sdk, meta, openapi, docs] = await Promise.all([
  read("server/discovery/network.ts"), read("api/v1/discovery.ts"), read("app/CurrentApp.tsx"), read("app/discovery.css"),
  read("packages/sdk/src/index.ts"), read("api/v1/meta.ts"), read("api/v1/openapi.ts"), read("docs/current-discovery-network.md"),
]);

assert.equal(normalizeDiscoveryTier("current", Date.now() + 10_000), "current");
assert.equal(normalizeDiscoveryTier("current", Date.now() - 1), "standard");
assert.equal(normalizeDiscoveryTier("unknown", null), "standard");
assert.deepEqual(validateDiscoveryInteraction({ resourceType: "drop", resourceId: "11111111-1111-4111-8111-111111111111", visitorId: "1234567890abcdef", eventType: "impression" }), { resourceType: "drop", resourceId: "11111111-1111-4111-8111-111111111111", visitorId: "1234567890abcdef", eventType: "impression" });
assert.throws(() => validateDiscoveryInteraction({ resourceType: "drop", resourceId: "bad", visitorId: "raw@example.com", eventType: "open" }), /valid discovery resource/i);
const item = (id: string, tier: DiscoveryItem["placement"]["tier"], rank: number, createdAt: string): DiscoveryItem => ({ id, kind: "drop", title: id, description: id, category: "drop", project: { id, name: id, logoUrl: null, websiteUrl: null }, reward: { amount: "1", symbol: "USDC", name: "USD Coin" }, progress: { label: "claims", current: 0, maximum: 10 }, closesAt: null, publicUrl: "https://example.com", funding: { fullyFunded: true, transactionHash: null, merkleRoot: null, network: "ARC-TESTNET" }, placement: { tier, label: tier, rank, reason: "test" }, metrics: { impressions: 0, opens: 0, openRate: 0, participation: 0, participationLabel: "reservations", boundary: "test" }, createdAt });
assert.deepEqual(rankDiscoveryItems([item("new", "standard", 0, "2026-08-02T00:00:00Z"), item("tiered", "stream", 1, "2026-08-01T00:00:00Z")]).map(value => value.id), ["tiered", "new"]);

assert.match(schema, /Only open opportunities backed by an active, fully funded Arc campaign/);
assert.match(schema, /\$CURRENT access can affect placement, never eligibility proof or endorsement/);
assert.match(route, /currentDiscoveryNetwork/);
assert.match(app, /function DiscoveryNetwork/);
assert.match(app, /Find the next/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(styles, /@media\(max-width:720px\)/);
assert.match(sdk, /readonly discovery/);
assert.match(meta, /public-current-discovery-network/);
assert.match(schema, /discoveryInteractions/);
assert.match(schema, /anonymous-browser-resource-event-utc-day/);
assert.match(route, /recordDiscoveryInteraction/);
assert.match(app, /DISCOVERY OPENS/);
assert.match(sdk, /record:[\s\S]*resourceType/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
assert.match(openapi, /"\/discovery"/);
assert.match(docs, /not an endorsement/i);
console.log("Current Discovery Network verified: funded-only eligibility, privacy-safe conversion attribution, transparent access placement, public API, responsive UI, SDK surface, and honest participation boundary.");
