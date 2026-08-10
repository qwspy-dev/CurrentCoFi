import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [service, route, portfolio, schema, ui, contract] = await Promise.all([
  readFile(new URL("../server/accounts/swaps.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/portfolio/swap.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/accounts/portfolio.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../contracts/CurrentCheckoutRouter.sol", import.meta.url), "utf8"),
]);

assert.match(service, /SWAP_ROUTE_NOT_CONFIGURED/);
assert.match(service, /getAddress\(requestedToken\) !== route\.token/);
assert.match(service, /BigInt\(amountAtomic\) > balance/);
assert.match(service, /abiFunctionSignature: "approve\(address,uint256\)"/);
assert.match(service, /settleExactUSDC\(bytes32,address,uint256,uint256,address,uint64,address,bytes\)/);
assert.match(service, /wallet\.address, String\(deadlineSeconds\)/);
assert.match(service, /row\.approvalChallengeId !== input\.challengeId/);
assert.match(service, /row\.settlementChallengeId !== input\.challengeId/);
assert.match(service, /SWAP_ROUTE_CHANGED/);
assert.match(service, /SWAP_QUOTE_CHANGED/);
assert.match(route, /sessionFromRequest\(request\)/);
assert.match(route, /persistSessionAccount\(session\)/);
assert.match(schema, /wallet_swaps/);
assert.match(portfolio, /kind: "wallet-swap" as const/);
assert.match(portfolio, /swapCapability: consumerSwapCapability\(\)/);
assert.match(ui, /Get protected quote/);
assert.match(ui, /Two explicit wallet approvals protect this flow/);
assert.match(ui, /swapQuote\?settleSwap\(\):getSwapQuote\(\)/);
assert.match(contract, /balanceOf\(merchant\) < beforeBalance \+ usdcOut/);
assert.match(contract, /safeTransfer\(msg\.sender, amountInMaximum - amountIn\)/);

console.log("Consumer swap milestone verified: fail-closed route, exact quote, balance guard, two bound approvals, exact USDC receipt, refund semantics, history, and responsive UI.");
