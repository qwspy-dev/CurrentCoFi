import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeCampaignDeliveryChannel } from "../server/campaigns/repository.js";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [schema, repository, app, sdk, mcp, meta, openapi, evidence] = await Promise.all([
  read("server/db/schema.ts"), read("server/campaigns/repository.ts"), read("app/CurrentApp.tsx"),
  read("packages/sdk/src/index.ts"), read("packages/mcp/src/server.ts"), read("api/v1/meta.ts"),
  read("api/v1/openapi.ts"), read("server/evidence/reports.ts"),
]);

assert.equal(normalizeCampaignDeliveryChannel(" Telegram "), "telegram");
assert.throws(() => normalizeCampaignDeliveryChannel("carrier-pigeon"), /supported delivery channel/i);
assert.match(schema, /campaignDeliveries = pgTable\("campaign_deliveries"/);
assert.match(schema, /claimUrlCiphertext/);
assert.match(repository, /sealSecret\(link\.claimUrl\)/);
assert.match(repository, /openSecret\(delivery\.claimUrlCiphertext\)/);
assert.match(repository, /operator preparation, not third-party delivery confirmation/i);
assert.match(app, /SECURE DELIVERY CURRENT/);
assert.match(app, /QRCode\.toDataURL/);
assert.match(app, /Secure CSV/);
assert.match(sdk, /readonly deliveries/);
assert.match(mcp, /current_list_campaign_deliveries/);
assert.match(mcp, /I_APPROVE_CURRENT_DELIVERY_HANDOFF/);
assert.match(meta, /encrypted-campaign-delivery-center/);
assert.match(openapi, /3\.12\.0-encrypted-campaign-delivery-center/);
assert.match(openapi, /"\/developer\/deliveries"/);
assert.match(evidence, /current-evidence-v21/);
assert.match(evidence, /campaignDeliveries: deliveryEvidence/);

console.log("Encrypted campaign delivery center integration test passed.");
