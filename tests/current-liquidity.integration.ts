import assert from "node:assert/strict";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, getAddress, keccak256, parseEventLogs, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const accounts = Object.entries(provider.getInitialAccounts()).map(([address, value]) => ({ address: getAddress(address), account: privateKeyToAccount(value.secretKey as `0x${string}`) }));
const transport = custom(provider);
const publicClient = createPublicClient({ transport });
const owner = createWalletClient({ account: accounts[0].account, transport });
const guardian = createWalletClient({ account: accounts[1].account, transport });
const compiled = compileContracts();
async function deployed(hash: `0x${string}`) { const receipt = await publicClient.waitForTransactionReceipt({ hash }); assert.ok(receipt.contractAddress); return receipt.contractAddress; }
async function confirmed(hash: `0x${string}`) { const receipt = await publicClient.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, "success"); return receipt; }
async function operationId(hash: `0x${string}`) { const receipt = await confirmed(hash); const [event] = parseEventLogs({ abi: compiled.currentLiquidityGovernor.abi, logs: receipt.logs, eventName: "OperationQueued" }); assert.ok(event); return (event as unknown as { args: { operationId: `0x${string}` } }).args.operationId; }
async function advance() { await provider.request({ method: "evm_increaseTime", params: [31] }); await provider.request({ method: "evm_mine", params: [] }); }

const current = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentToken.abi, bytecode: compiled.currentToken.bytecode, args: [accounts[0].address] }));
const usdc = await deployed(await owner.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode }));
const vault = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentLiquidityVault.abi, bytecode: compiled.currentLiquidityVault.bytecode, args: [accounts[0].address, current, usdc] }));
const governor = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentLiquidityGovernor.abi, bytecode: compiled.currentLiquidityGovernor.bytecode, args: [accounts[0].address, accounts[1].address, vault, 30] }));
const adapter = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentTestnetLiquidityAdapter.abi, bytecode: compiled.currentTestnetLiquidityAdapter.bytecode, args: [vault] }));
await confirmed(await owner.writeContract({ chain: null, address: vault, abi: compiled.currentLiquidityVault.abi, functionName: "transferOwnership", args: [governor] }));
const currentAmount = parseUnits("5000", 18); const usdcAmount = parseUnits("50", 6);
await confirmed(await owner.writeContract({ chain: null, address: current, abi: compiled.currentToken.abi, functionName: "transfer", args: [vault, currentAmount] }));
await confirmed(await owner.writeContract({ chain: null, address: usdc, abi: compiled.mockUsdc.abi, functionName: "mint", args: [vault, usdcAmount] }));

const cancelled = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueAdapterUpdate", args: [adapter, true] }));
await confirmed(await guardian.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "cancel", args: [cancelled] }));
await advance();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeAdapterUpdate", args: [cancelled] }));
const adapterOp = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueAdapterUpdate", args: [adapter, true] }));
await advance(); await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeAdapterUpdate", args: [adapterOp] }));
const provideOp = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueProvide", args: [adapter, currentAmount, usdcAmount, usdcAmount, keccak256("0x")] }));
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeProvide", args: [provideOp, "0x"] }));
await advance();
const provideReceipt = await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeProvide", args: [provideOp, "0x"] }));
const [provided] = parseEventLogs({ abi: compiled.currentLiquidityVault.abi, logs: provideReceipt.logs, eventName: "LiquidityProvided" }); assert.ok(provided);
const positionId = (provided as unknown as { args: { positionId: `0x${string}` } }).args.positionId;
assert.equal(await publicClient.readContract({ address: vault, abi: compiled.currentLiquidityVault.abi, functionName: "totalLiquidityShares" }), usdcAmount);
const removeOp = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueRemove", args: [adapter, positionId, usdcAmount / BigInt(2), currentAmount / BigInt(2), usdcAmount / BigInt(2), keccak256("0x")] }));
await advance(); await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeRemove", args: [removeOp, "0x"] }));
assert.equal(await publicClient.readContract({ address: vault, abi: compiled.currentLiquidityVault.abi, functionName: "totalPositionsCreated" }), BigInt(1));
assert.equal(await publicClient.readContract({ address: vault, abi: compiled.currentLiquidityVault.abi, functionName: "totalPositionsRemoved" }), BigInt(1));
assert.equal(await publicClient.readContract({ address: governor, abi: compiled.currentLiquidityGovernor.abi, functionName: "totalCancelled" }), BigInt(1));
console.log("Protocol-owned liquidity vault, delayed execution, guardian cancellation, and paired-reserve accounting passed.");
provider.disconnect();
