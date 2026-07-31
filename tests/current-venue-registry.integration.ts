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
async function operationId(hash: `0x${string}`) { const receipt = await confirmed(hash); const [event] = parseEventLogs({ abi: compiled.currentVenueRegistryGovernor.abi, logs: receipt.logs, eventName: "VenueOperationQueued" }); assert.ok(event); return (event as unknown as { args: { operationId: `0x${string}` } }).args.operationId; }

const current = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentToken.abi, bytecode: compiled.currentToken.bytecode, args: [accounts[0].address] }));
const usdc = await deployed(await owner.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode }));
const adapter = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentTestnetLiquidityAdapter.abi, bytecode: compiled.currentTestnetLiquidityAdapter.bytecode, args: [accounts[4].address] }));
const registry = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentLiquidityVenueRegistry.abi, bytecode: compiled.currentLiquidityVenueRegistry.bytecode, args: [accounts[0].address, current, usdc] }));
const governor = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentVenueRegistryGovernor.abi, bytecode: compiled.currentVenueRegistryGovernor.bytecode, args: [accounts[0].address, accounts[1].address, registry, 30] }));
await confirmed(await owner.writeContract({ chain: null, address: registry, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "transferOwnership", args: [governor] }));
const code = await publicClient.getCode({ address: adapter }); assert.ok(code); const codeHash = keccak256(code);
const venueId = keccak256(stringToHex("current:arc-testnet-venue:v1")); const nameHash = keccak256(stringToHex("Current Arc testnet paired reserve"));

const cancelled = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "queueVenue", args: [adapter, venueId, nameHash, codeHash, 300, 2000, true] }));
await confirmed(await guardian.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "cancel", args: [cancelled] })); await advance();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "executeVenue", args: [cancelled, venueId, nameHash, codeHash, 300, 2000, true] }));

const approval = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "queueVenue", args: [adapter, venueId, nameHash, codeHash, 300, 2000, true] }));
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "executeVenue", args: [approval, venueId, nameHash, codeHash, 300, 2000, true] })); await advance();
await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "executeVenue", args: [approval, venueId, nameHash, codeHash, 300, 2000, true] }));
assert.equal(await publicClient.readContract({ address: registry, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "validateExecution", args: [adapter, current, usdc, 250, 1500] }), venueId);
await assert.rejects(() => publicClient.readContract({ address: registry, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "validateExecution", args: [adapter, usdc, current, 250, 1500] }));
await assert.rejects(() => publicClient.readContract({ address: registry, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "validateExecution", args: [adapter, current, usdc, 301, 1500] }));
const venue = await publicClient.readContract({ address: registry, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "venues", args: [adapter] }) as readonly unknown[];
assert.equal(venue[0], true); assert.equal(venue[1], venueId); assert.equal(venue[3], codeHash); assert.equal(venue[4], 300); assert.equal(venue[5], 2000);
assert.equal(await publicClient.readContract({ address: governor, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "totalCancelled" }), BigInt(1));
console.log("Venue codehash binding, pair validation, risk ceilings, delayed approval, and guardian cancellation passed.");
provider.disconnect();
