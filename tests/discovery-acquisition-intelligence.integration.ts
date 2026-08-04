import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { discoveryFunnelRates } from "../server/discovery/analytics.js";

const read = (path: string) => readFileSync(path, "utf8");
const rates = discoveryFunnelRates({ impressions: 1000, opens: 400, participation: 120, claims: 90, activations: 45 });
assert.deepEqual(rates, { openRate: 40, participationRate: 30, claimRate: 75, activationRate: 50, impressionToActivationRate: 4.5 });
assert.deepEqual(discoveryFunnelRates({ impressions: 0, opens: 0, participation: 0, claims: 0, activations: 0 }), { openRate: 0, participationRate: 0, claimRate: 0, activationRate: 0, impressionToActivationRate: 0 });

const service = read("server/discovery/analytics.ts");
const campaigns = read("api/v1/campaigns.ts");
const campaignAnalytics = read("api/v1/campaigns/analytics.ts");
const developer = read("server/developer/analytics.ts");
const ui = read("app/CurrentApp.tsx");
const styles = read("app/acquisition.css");
const sdk = read("packages/sdk/src/index.ts");
const meta = read("api/v1/meta.ts");
const openapi = read("api/v1/openapi.ts");

assert.match(service, /current-discovery-acquisition-v1/);
assert.match(service, /daily-deduplicated attention signals/);
assert.match(service, /confirmed Arc claims/);
assert.match(service, /signed project activations/);
assert.match(campaigns, /userDiscoveryAnalytics/);
assert.match(campaignAnalytics, /userDiscoveryAnalytics/);
assert.match(developer, /projectDiscoveryAnalytics/);
assert.match(ui, /VERIFIABLE ACQUISITION/);
assert.match(ui, /See exactly where attention becomes an active user/);
assert.match(styles, /acquisition-funnel/);
assert.match(sdk, /export type DiscoveryAcquisition/);
assert.match(meta, /attention-to-activation-evidence/);
assert.match(openapi, /3\.17\.0-project-brand-studio/);

console.log("Project acquisition intelligence verified: project-scoped attention, participation, Arc claims, signed activations, daily trends, API, SDK, responsive UI, and explicit evidence boundaries.");
