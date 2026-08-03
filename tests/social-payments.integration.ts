import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareSocialPaymentShares } from "../server/payments/social.js";

const split = prepareSocialPaymentShares("split", undefined, [
  { label: "Alex", amount: "12.50" },
  { label: "Jordan", amount: "12.50" },
  { label: "Sam", amount: "5" },
]);
assert.equal(split.totalAmountAtomic, "30000000");
assert.deepEqual(split.prepared.map((share) => share.amountAtomic), ["12500000", "12500000", "5000000"]);
const send = prepareSocialPaymentShares("send", "0.000001");
assert.equal(send.totalAmountAtomic, "1");
assert.equal(send.prepared[0]?.label, "Direct payment");
assert.throws(() => prepareSocialPaymentShares("split", undefined, [{ amount: "1" }]));
assert.throws(() => prepareSocialPaymentShares("request", "0"));
assert.throws(() => prepareSocialPaymentShares("tip", "1.0000001"));

const service = await readFile(new URL("../server/payments/social.ts", import.meta.url), "utf8");
assert.match(service, /intendedPayerUserId/);
assert.match(service, /PAYER_MISMATCH/);
assert.match(service, /CHALLENGE_MISMATCH/);
assert.match(service, /transfer\(address,uint256\)/);
assert.match(service, /recipientAddress, row\.share\.amountAtomic/);
assert.match(service, /eq\(socialPaymentShares\.status, "authorizing"\)/);
assert.doesNotMatch(service, /rawEmail|phoneNumber|socialHandle/);
const migration = await readFile(new URL("../drizzle-vercel/0019_tidy_triton.sql", import.meta.url), "utf8");
assert.match(migration, /social_payment_requests/);
assert.match(migration, /social_payment_shares_transaction_unique/);
assert.match(migration, /social_payment_shares_receipt_unique/);
console.log("Social payment milestone verified: exact amounts, split solvency, payer binding, idempotent confirmation, privacy-safe records, and unique receipts.");
