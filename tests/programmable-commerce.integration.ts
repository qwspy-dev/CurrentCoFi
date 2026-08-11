import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const [contract, service, schema, merchantApi, developerApi, sdk, ui, css, meta, openapi, docs] = await Promise.all([
  read("../contracts/CurrentCheckoutRouter.sol"),
  read("../server/commerce/checkout.ts"),
  read("../server/db/schema.ts"),
  read("../api/v1/merchant.ts"),
  read("../api/v1/developer/checkout.ts"),
  read("../packages/sdk/src/index.ts"),
  read("../app/CurrentApp.tsx"),
  read("../app/globals.css"),
  read("../api/v1/meta.ts"),
  read("../api/v1/openapi.ts"),
  read("../docs/programmable-commerce.md"),
]);

assert.match(contract, /settleUSDCWithSplits/);
assert.match(contract, /recipients\.length > 10/);
assert.match(contract, /total != 10_000/);
assert.match(contract, /CheckoutSplitSettled/);
assert.match(service, /Affiliate and customer rewards cannot exceed 40%/);
assert.match(service, /needs a valid Arc address/);
assert.match(service, /customer-reward/);
assert.match(service, /settlementPlanForPayment/);
assert.match(service, /persistSettlementReceipts/);
assert.match(service, /PROGRAMMABLE_SETTLEMENT_NOT_CONFIGURED/);
assert.match(service, /route && !settlementPlan\.length/);
assert.match(service, /PROGRAMMABLE_CHECKOUT_USDC_ONLY/);
assert.match(service, /PROGRAMMABLE_REFUND_UNAVAILABLE/);
assert.match(schema, /checkoutSplits/);
assert.match(schema, /checkoutSettlementReceipts/);
assert.match(schema, /checkout_settlement_receipts_payment_position_unique/);
assert.match(merchantApi, /splits/);
assert.match(developerApi, /splits/);
assert.match(sdk, /kind: "affiliate" \| "customer-reward"/);
assert.match(ui, /Publish programmable checkout/);
assert.match(ui, /Customer cashback/);
assert.match(ui, /Settlement ledger/);
assert.match(css, /checkout-split-preview/);
assert.match(meta, /atomic-checkout-split-settlement/);
assert.match(openapi, /affiliate payouts, customer rewards/);
assert.match(docs, /Atomic settlement boundary/);

console.log("Programmable checkout contract, APIs, SDK, UI, receipts, and fail-closed controls passed.");
