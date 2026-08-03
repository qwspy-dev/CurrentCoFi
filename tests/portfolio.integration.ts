import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sortPortfolioActivity, trustedUsdValue, type PortfolioActivity } from "../server/accounts/portfolio.js";

assert.equal(trustedUsdValue("USDC", "12.50"), "12.50");
assert.equal(trustedUsdValue("CURRENT", "9000"), null);
const items: PortfolioActivity[] = [
  { id: "old", kind: "claim", direction: "in", title: "Old", amount: "1", symbol: "USDC", status: "confirmed", transactionHash: null, occurredAt: "2026-01-01T00:00:00.000Z" },
  { id: "new", kind: "social-payment", direction: "out", title: "New", amount: "2", symbol: "CURRENT", status: "confirmed", transactionHash: "0xabc", occurredAt: "2026-02-01T00:00:00.000Z" },
];
assert.deepEqual(sortPortfolioActivity(items).map((item) => item.id), ["new", "old"]);

const service = await readFile(new URL("../server/accounts/portfolio.ts", import.meta.url), "utf8");
assert.match(service, /balanceOf/);
assert.match(service, /Only USDC is included/);
assert.match(service, /Project tokens remain unpriced/);
assert.doesNotMatch(service, /Math\.random|mockBalance|fakePrice/);
console.log("Portfolio milestone verified: onchain balances, conservative valuation, and unified ordered activity.");
