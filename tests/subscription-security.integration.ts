import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const service = await readFile(new URL("../server/commerce/subscriptions.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8");

assert.match(service, /abiFunctionSignature: "transfer\(address,uint256\)"/);
assert.doesNotMatch(service, /transferFrom\(address,address,uint256\)/);
assert.match(service, /payment\.subscriptionId !== subscription\.id/);
assert.match(service, /subscription\.subscriberAddress !== wallet\.address\.toLowerCase\(\)/);
assert.match(service, /payment\.challengeId !== input\.challengeId/);
assert.match(service, /Only the subscriber can manage this subscription/);
assert.match(service, /Renewal opens three days before/);
assert.match(service, /status: "cancelled"/);
assert.match(schema, /uniqueIndex\("subscriptions_plan_subscriber_unique"\)/);
assert.match(schema, /uniqueIndex\("subscription_payments_subscription_period_unique"\)/);
assert.match(schema, /uniqueIndex\("subscription_payments_receipt_unique"\)/);

console.log("Subscription ownership, renewal, and no-standing-allowance checks passed.");
