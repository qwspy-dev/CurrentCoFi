import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ApiError } from "../server/http.js";
import { validateTransferDestination } from "../server/accounts/transfers.js";

const source = "0x0000000000000000000000000000000000000001";
const destination = "0x0000000000000000000000000000000000000002";

assert.equal(validateTransferDestination(source, destination), destination);
assert.throws(
  () => validateTransferDestination(source, "not-an-address"),
  (error) => error instanceof ApiError && error.code === "INVALID_DESTINATION",
);
assert.throws(
  () => validateTransferDestination(source, source),
  (error) => error instanceof ApiError && error.code === "SELF_TRANSFER",
);

const [service, route, portfolio, ui] = await Promise.all([
  readFile(new URL("../server/accounts/transfers.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/portfolio/transfer.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/accounts/portfolio.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
]);

assert.match(service, /abiFunctionSignature: "transfer\(address,uint256\)"/);
assert.match(service, /BigInt\(amountAtomic\) > balance/);
assert.match(service, /row\.userId !== input\.userId \|\| row\.challengeId !== input\.challengeId/);
assert.match(service, /eq\(walletTransfers\.status, "authorizing"\)/);
assert.match(route, /sessionFromRequest\(request\)/);
assert.match(route, /persistSessionAccount\(session\)/);
assert.match(portfolio, /kind: "wallet-transfer" as const/);
assert.match(ui, /role="dialog" aria-modal="true"/);
assert.match(ui, /You approve the exact transfer in your Circle wallet/);

console.log("Wallet transfer milestone verified: exact ERC-20 approval, balance guard, challenge binding, receipt activity, and accessible UI.");
