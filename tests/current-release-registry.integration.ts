import assert from "node:assert/strict";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, getAddress, keccak256, parseEventLogs, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const accounts = Object.entries(provider.getInitialAccounts()).map(([address, value]) => ({ address: getAddress(address), account: privateKeyToAccount(value.secretKey as `0x${string}`) }));
const transport = custom(provider); const publicClient = createPublicClient({ transport });
const owner = createWalletClient({ account: accounts[0].account, transport }); const guardian = createWalletClient({ account: accounts[1].account, transport });
const compiled = compileContracts();
async function deployed(hash: `0x${string}`) { const receipt = await publicClient.waitForTransactionReceipt({ hash }); assert.ok(receipt.contractAddress); return receipt.contractAddress; }
async function confirmed(hash: `0x${string}`) { const receipt = await publicClient.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, "success"); return receipt; }
async function advance() { await provider.request({ method: "evm_increaseTime", params: [31] }); await provider.request({ method: "evm_mine", params: [] }); }

const token = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentToken.abi, bytecode: compiled.currentToken.bytecode, args: [accounts[0].address] }));
const usdc = await deployed(await owner.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode }));
const registry = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentReleaseRegistry.abi, bytecode: compiled.currentReleaseRegistry.bytecode, args: [accounts[0].address] }));
const governor = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentReleaseGovernor.abi, bytecode: compiled.currentReleaseGovernor.bytecode, args: [accounts[0].address, accounts[1].address, registry, 30] }));
await confirmed(await owner.writeContract({ chain: null, address: registry, abi: compiled.currentReleaseRegistry.abi, functionName: "transferOwnership", args: [governor] }));
const tokenCode = await publicClient.getCode({ address: token }); const usdcCode = await publicClient.getCode({ address: usdc }); assert.ok(tokenCode && usdcCode);
const components = [
  { componentId: keccak256(stringToHex("current-token")), implementation: token, codeHash: keccak256(tokenCode), versionHash: keccak256(stringToHex("current-token:v1")) },
  { componentId: keccak256(stringToHex("settlement-usdc")), implementation: usdc, codeHash: keccak256(usdcCode), versionHash: keccak256(stringToHex("settlement-usdc:v1")) },
];
const releaseId = keccak256(stringToHex("current-test-release-v1"));
async function queue() { const receipt = await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "queueRelease", args: [releaseId, components] })); const [event] = parseEventLogs({ abi: compiled.currentReleaseGovernor.abi, logs: receipt.logs, eventName: "ReleaseOperationQueued" }); assert.ok(event); return (event as unknown as { args: { operationId: `0x${string}` } }).args.operationId; }

const cancelled = await queue(); await confirmed(await guardian.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "cancel", args: [cancelled] })); await advance();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "executeRelease", args: [cancelled, releaseId, components] }));
const operation = await queue();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "executeRelease", args: [operation, releaseId, components] }));
await advance();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "executeRelease", args: [operation, releaseId, [{ ...components[0], versionHash: keccak256(stringToHex("tampered")) }, components[1]]] }));
await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "executeRelease", args: [operation, releaseId, components] }));
assert.equal(await publicClient.readContract({ address: registry, abi: compiled.currentReleaseRegistry.abi, functionName: "currentReleaseId" }), releaseId);
assert.equal(await publicClient.readContract({ address: registry, abi: compiled.currentReleaseRegistry.abi, functionName: "validateComponent", args: [components[0].componentId] }), true);
assert.equal((await publicClient.readContract({ address: registry, abi: compiled.currentReleaseRegistry.abi, functionName: "currentComponentIds" }) as unknown[]).length, 2);
assert.equal(await publicClient.readContract({ address: governor, abi: compiled.currentReleaseGovernor.abi, functionName: "totalCancelled" }), BigInt(1));
console.log("Release bytecode manifest, delayed approval, tamper rejection, and guardian cancellation passed.");
provider.disconnect();
