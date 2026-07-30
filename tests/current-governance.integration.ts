import assert from "node:assert/strict";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  keccak256,
  parseEventLogs,
  parseUnits,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const accounts = Object.entries(provider.getInitialAccounts()).map(([address, value]) => ({
  address: getAddress(address),
  account: privateKeyToAccount(value.secretKey as `0x${string}`),
}));
const transport = custom(provider);
const publicClient = createPublicClient({ transport });
const ownerClient = createWalletClient({ account: accounts[0].account, transport });
const projectClient = createWalletClient({ account: accounts[1].account, transport });
const guardianClient = createWalletClient({ account: accounts[2].account, transport });
const compiled = compileContracts();

async function deployed(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
  assert.ok(receipt.contractAddress);
  return receipt.contractAddress;
}

async function confirmed(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
  return receipt;
}

async function operationId(hash: `0x${string}`) {
  const receipt = await confirmed(hash);
  const [event] = parseEventLogs({
    abi: compiled.currentBuybackGovernor.abi,
    logs: receipt.logs,
    eventName: "OperationQueued",
  });
  assert.ok(event);
  return (event as unknown as { args: { operationId: `0x${string}` } }).args.operationId;
}

const current = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentToken.abi,
  bytecode: compiled.currentToken.bytecode,
  args: [accounts[0].address],
}));
const usdc = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.mockUsdc.abi,
  bytecode: compiled.mockUsdc.bytecode,
}));
const lockVault = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentLockVault.abi,
  bytecode: compiled.currentLockVault.bytecode,
  args: [accounts[0].address, current],
}));
const feeRouter = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentFeeRouter.abi,
  bytecode: compiled.currentFeeRouter.bytecode,
  args: [
    accounts[0].address,
    usdc,
    current,
    lockVault,
    accounts[5].address,
    accounts[6].address,
    accounts[7].address,
    accounts[0].address,
  ],
}));
const accessManager = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentAccessManager.abi,
  bytecode: compiled.currentAccessManager.bytecode,
  args: [lockVault],
}));
const governor = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentBuybackGovernor.abi,
  bytecode: compiled.currentBuybackGovernor.bytecode,
  args: [accounts[0].address, accounts[2].address, feeRouter, 30],
}));
const adapter = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentTestnetExchangeAdapter.abi,
  bytecode: compiled.currentTestnetExchangeAdapter.bytecode,
  args: [feeRouter, BigInt(100_000_000_000_000)],
}));

await confirmed(await ownerClient.writeContract({
  chain: null,
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "transferOwnership",
  args: [governor],
}));
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "owner",
}), getAddress(governor));

const projectId = keccak256(stringToHex("grant-grade-project"));
const lockId = keccak256(stringToHex("grant-grade-project-lock"));
const lockAmount = parseUnits("5000", 18);
await confirmed(await ownerClient.writeContract({
  chain: null,
  address: current,
  abi: compiled.currentToken.abi,
  functionName: "transfer",
  args: [accounts[1].address, lockAmount],
}));
await confirmed(await projectClient.writeContract({
  chain: null,
  address: current,
  abi: compiled.currentToken.abi,
  functionName: "approve",
  args: [lockVault, lockAmount],
}));
const unlockAt = Number((await publicClient.getBlock()).timestamp) + 90 * 86_400;
await confirmed(await projectClient.writeContract({
  chain: null,
  address: lockVault,
  abi: compiled.currentLockVault.abi,
  functionName: "createLock",
  args: [lockId, projectId, accounts[1].address, lockAmount, unlockAt],
}));
await confirmed(await projectClient.writeContract({
  chain: null,
  address: accessManager,
  abi: compiled.currentAccessManager.abi,
  functionName: "syncAccess",
  args: [projectId, lockId],
}));
const projectAccess = await publicClient.readContract({
  address: accessManager,
  abi: compiled.currentAccessManager.abi,
  functionName: "accessOf",
  args: [projectId],
}) as unknown as readonly [number, bigint, `0x${string}`, `0x${string}`];
assert.equal(projectAccess[0], 2);
assert.equal(projectAccess[2], lockId);
assert.equal(getAddress(projectAccess[3]), accounts[1].address);

const feeAmount = parseUnits("100", 6);
await confirmed(await ownerClient.writeContract({
  chain: null,
  address: usdc,
  abi: compiled.mockUsdc.abi,
  functionName: "mint",
  args: [accounts[1].address, feeAmount],
}));
await confirmed(await projectClient.writeContract({
  chain: null,
  address: usdc,
  abi: compiled.mockUsdc.abi,
  functionName: "approve",
  args: [feeRouter, feeAmount],
}));
await confirmed(await projectClient.writeContract({
  chain: null,
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "routeProductFee",
  args: [keccak256(stringToHex("governed-fee-proof")), feeAmount],
}));
await confirmed(await ownerClient.writeContract({
  chain: null,
  address: current,
  abi: compiled.currentToken.abi,
  functionName: "transfer",
  args: [adapter, parseUnits("10000", 18)],
}));

const cancelledOperation = await operationId(await ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "queueBuyback",
  args: [adapter, parseUnits("1", 6), parseUnits("100", 18), keccak256("0x")],
}));
await confirmed(await guardianClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "cancel",
  args: [cancelledOperation],
}));
await provider.request({ method: "evm_increaseTime", params: [31] });
await provider.request({ method: "evm_mine", params: [] });
await assert.rejects(() => ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeBuyback",
  args: [cancelledOperation, "0x"],
}));

const adapterOperation = await operationId(await ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "queueAdapterUpdate",
  args: [adapter, true],
}));
await provider.request({ method: "evm_increaseTime", params: [31] });
await provider.request({ method: "evm_mine", params: [] });
await confirmed(await ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeAdapterUpdate",
  args: [adapterOperation],
}));

const buybackOperation = await operationId(await ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "queueBuyback",
  args: [adapter, parseUnits("20", 6), parseUnits("2000", 18), keccak256("0x")],
}));
await assert.rejects(() => ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeBuyback",
  args: [buybackOperation, "0x"],
}));
await provider.request({ method: "evm_increaseTime", params: [31] });
await provider.request({ method: "evm_mine", params: [] });
await confirmed(await ownerClient.writeContract({
  chain: null,
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeBuyback",
  args: [buybackOperation, "0x"],
}));

assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "totalBuybackUSDC",
}), parseUnits("20", 6));
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "totalCurrentPurchased",
}), parseUnits("2000", 18));
assert.equal(await publicClient.readContract({
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "totalQueued",
}), BigInt(3));
assert.equal(await publicClient.readContract({
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "totalExecuted",
}), BigInt(2));
assert.equal(await publicClient.readContract({
  address: governor,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "totalCancelled",
}), BigInt(1));

console.log("Governed queue, guardian cancellation, delayed buyback, and project access tiers passed.");
provider.disconnect();
