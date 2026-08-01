import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const service = await readFile(new URL("../server/commerce/checkout.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8");

assert.match(service, /abiFunctionSignature: "transfer\(address,uint256\)"/);
assert.match(service, /payment\.checkoutId !== row\.checkout\.id/);
assert.match(service, /payment\.customerUserId !== input\.userId/);
assert.match(service, /payment\.paymentChallengeId !== input\.challengeId/);
assert.match(service, /wallet\.address\.toLowerCase\(\) !== row\.merchant\.settlementAddress/);
assert.match(service, /row\.payment\.status !== "confirmed"/);
assert.match(service, /row\.payment\.refundChallengeId !== input\.challengeId/);
assert.match(service, /\["confirmed", "refunded"\]\.includes\(row\.payment\.status\)/);
assert.match(schema, /uniqueIndex\("checkout_payments_receipt_unique"\)/);
assert.match(schema, /numeric\("amount_atomic", \{ precision: 78, scale: 0 \}\)/);

console.log("Checkout settlement boundary checks passed.");
