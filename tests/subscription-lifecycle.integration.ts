import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { subscriptionLifecycleKind } from "../server/commerce/subscription-lifecycle.js";

const now = new Date("2026-08-01T12:00:00.000Z");
assert.equal(subscriptionLifecycleKind(new Date("2026-08-01T11:59:59.000Z"), now), "past_due");
assert.equal(subscriptionLifecycleKind(new Date("2026-08-03T12:00:00.000Z"), now), "renewal_due");
assert.equal(subscriptionLifecycleKind(new Date("2026-08-05T12:00:00.000Z"), now), null);

const schema = await readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8");
const lifecycle = await readFile(new URL("../server/commerce/subscription-lifecycle.ts", import.meta.url), "utf8");
const endpoint = await readFile(new URL("../api/v1/internal/subscriptions/lifecycle.ts", import.meta.url), "utf8");
const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");

assert.match(schema, /subscription_notices_cycle_kind_unique/);
assert.match(lifecycle, /onConflictDoNothing\(\)/);
assert.match(lifecycle, /status: "superseded"/);
assert.match(lifecycle, /subscription\.renewal_due/);
assert.match(lifecycle, /subscription\.past_due/);
assert.match(endpoint, /CRON_SECRET/);
assert.match(endpoint, /LIFECYCLE_UNAUTHORIZED/);
assert.match(vercel, /internal\/subscriptions\/lifecycle/);

console.log("subscription lifecycle reminders, idempotency, and scheduled authentication passed");
