import assert from "node:assert/strict";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, getAddress, parseEventLogs, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const accounts = Object.entries(provider.getInitialAccounts()).map(([address, value]) => ({ address: getAddress(address), account: privateKeyToAccount(value.secretKey as `0x${string}`) }));
const transport = custom(provider);
const publicClient = createPublicClient({ transport });
const owner = createWalletClient({ account: accounts[0].account, transport });
const customer = createWalletClient({ account: accounts[1].account, transport });
const merchant = accounts[2].address;
const compiled = compileContracts();

async function deployed(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success"); assert.ok(receipt.contractAddress); return receipt.contractAddress;
}
async function confirmed(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, "success"); return receipt;
}

const current = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentToken.abi, bytecode: compiled.currentToken.bytecode, args: [accounts[0].address] }));
const usdc = await deployed(await owner.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode }));
const router = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentCheckoutRouter.abi, bytecode: compiled.currentCheckoutRouter.bytecode, args: [accounts[0].address, usdc] }));
const rate = BigInt(100_000_000_000_000);
const adapter = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentTestnetCheckoutAdapter.abi, bytecode: compiled.currentTestnetCheckoutAdapter.bytecode, args: [router, current, usdc, rate] }));

await confirmed(await owner.writeContract({ chain: null, address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "setAdapter", args: [adapter, true] }));
await confirmed(await owner.writeContract({ chain: null, address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "setRoute", args: [current, adapter, true] }));
await confirmed(await owner.writeContract({ chain: null, address: current, abi: compiled.currentToken.abi, functionName: "transfer", args: [accounts[1].address, parseUnits("1000", 18)] }));
await confirmed(await owner.writeContract({ chain: null, address: usdc, abi: compiled.mockUsdc.abi, functionName: "mint", args: [adapter, parseUnits("100", 6)] }));

const usdcOut = parseUnits("5", 6);
const quoted = await publicClient.readContract({ address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "quote", args: [current, usdcOut, adapter] });
assert.equal(quoted, parseUnits("500", 18));
await confirmed(await customer.writeContract({ chain: null, address: current, abi: compiled.currentToken.abi, functionName: "approve", args: [router, quoted] }));
const receipt = await confirmed(await customer.writeContract({ chain: null, address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "settleExactUSDC", args: [`0x${"11".repeat(32)}`, current, quoted, usdcOut, merchant, BigInt(Math.floor(Date.now() / 1_000) + 600), adapter, "0x"] }));
const [settled] = parseEventLogs({ abi: compiled.currentCheckoutRouter.abi, logs: receipt.logs, eventName: "CheckoutSettled" });
assert.ok(settled);
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [merchant] }), usdcOut);
assert.equal(await publicClient.readContract({ address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "totalSettlements" }), BigInt(1));

await confirmed(await owner.writeContract({ chain: null, address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "setRoute", args: [current, adapter, false] }));
await assert.rejects(() => publicClient.readContract({ address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "quote", args: [current, usdcOut, adapter] }));
await assert.rejects(() => customer.writeContract({ chain: null, address: router, abi: compiled.currentCheckoutRouter.abi, functionName: "settleExactUSDC", args: [`0x${"22".repeat(32)}`, current, quoted, usdcOut, merchant, BigInt(Math.floor(Date.now() / 1_000) + 600), adapter, "0x"] }));

console.log("Exact-input approval, exact-USDC settlement, merchant balance proof, and fail-closed route controls passed.");
provider.disconnect();
