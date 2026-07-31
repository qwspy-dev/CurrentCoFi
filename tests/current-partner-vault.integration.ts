import assert from "node:assert/strict";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, getAddress, keccak256, parseEventLogs, parseUnits, stringToHex } from "viem";
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
async function operationId(hash: `0x${string}`) { const receipt = await confirmed(hash); const [event] = parseEventLogs({ abi: compiled.currentPartnerGovernor.abi, logs: receipt.logs, eventName: "OperationQueued" }); assert.ok(event); return (event as unknown as { args: { operationId: `0x${string}` } }).args.operationId; }

const partnerToken = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentTestnetPartnerToken.abi, bytecode: compiled.currentTestnetPartnerToken.bytecode, args: [accounts[0].address] }));
const campaignVault = await deployed(await owner.deployContract({ chain: null, abi: compiled.campaignVault.abi, bytecode: compiled.campaignVault.bytecode, args: [accounts[0].address, accounts[2].address] }));
const partnerVault = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentPartnerVault.abi, bytecode: compiled.currentPartnerVault.bytecode, args: [accounts[0].address, campaignVault] }));
const governor = await deployed(await owner.deployContract({ chain: null, abi: compiled.currentPartnerGovernor.abi, bytecode: compiled.currentPartnerGovernor.bytecode, args: [accounts[0].address, accounts[1].address, partnerVault, 30] }));
await confirmed(await owner.writeContract({ chain: null, address: partnerVault, abi: compiled.currentPartnerVault.abi, functionName: "transferOwnership", args: [governor] }));
const metadataHash = keccak256(stringToHex("current:test-partner:v1"));

const cancelled = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "queueAssetUpdate", args: [partnerToken, accounts[0].address, metadataHash, true] }));
await confirmed(await guardian.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "cancel", args: [cancelled] })); await advance();
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "executeAssetUpdate", args: [cancelled, accounts[0].address, metadataHash, true] }));
const approval = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "queueAssetUpdate", args: [partnerToken, accounts[0].address, metadataHash, true] })); await advance();
await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "executeAssetUpdate", args: [approval, accounts[0].address, metadataHash, true] }));

const depositAmount = parseUnits("100000", 18); await confirmed(await owner.writeContract({ chain: null, address: partnerToken, abi: compiled.currentTestnetPartnerToken.abi, functionName: "approve", args: [partnerVault, depositAmount] }));
await confirmed(await owner.writeContract({ chain: null, address: partnerVault, abi: compiled.currentPartnerVault.abi, functionName: "deposit", args: [partnerToken, depositAmount, keccak256(stringToHex("partner-reserve-proof"))] }));
const campaignId = keccak256(stringToHex("partner-campaign-proof")); const merkleRoot = keccak256(stringToHex("partner-allocation-root")); const campaignAmount = parseUnits("10000", 18); const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86_400);
const campaignOp = await operationId(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "queueCampaign", args: [partnerToken, campaignId, campaignAmount, expiresAt, 100, merkleRoot] }));
await assert.rejects(() => owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "executeCampaign", args: [campaignOp, campaignId, campaignAmount, expiresAt, 100, merkleRoot] })); await advance();
await confirmed(await owner.writeContract({ chain: null, address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "executeCampaign", args: [campaignOp, campaignId, campaignAmount, expiresAt, 100, merkleRoot] }));
const campaign = await publicClient.readContract({ address: campaignVault, abi: compiled.campaignVault.abi, functionName: "campaigns", args: [campaignId] }) as readonly unknown[];
assert.equal(String(campaign[0]).toLowerCase(), partnerVault.toLowerCase()); assert.equal(campaign[2], campaignAmount); assert.equal(campaign[7], 1);
const asset = await publicClient.readContract({ address: partnerVault, abi: compiled.currentPartnerVault.abi, functionName: "assets", args: [partnerToken] }) as readonly unknown[];
assert.equal(asset[0], true); assert.equal(asset[3], depositAmount); assert.equal(asset[4], campaignAmount);
assert.equal(await publicClient.readContract({ address: governor, abi: compiled.currentPartnerGovernor.abi, functionName: "totalCancelled" }), BigInt(1));
console.log("Partner token approval, transparent reserve, delayed campaign funding, and guardian cancellation passed.");
provider.disconnect();
