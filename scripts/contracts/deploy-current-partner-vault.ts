import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, getAddress, http, keccak256, parseEventLogs, parseUnits, stringToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
const guardian = process.env.CURRENT_GOVERNANCE_GUARDIAN_ADDRESS?.trim() as Address | undefined;
if (!deployerKey || !guardian) throw new Error("Protocol deployer and governance guardian are required.");
const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const campaignVault = previous.campaignVaultAddress as Address | undefined;
if (!campaignVault) throw new Error("Deploy the campaign vault first.");

const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const deployer = privateKeyToAccount(deployerKey); const compiled = compileContracts();
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 6, retryDelay: 900 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
async function receipt(hash: Hex) { const value = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 }); if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`); return value; }
async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) { const hash = await walletClient.deployContract({ abi, bytecode, args }); const value = await receipt(hash); if (!value.contractAddress) throw new Error(`Deployment failed: ${hash}`); return { address: value.contractAddress, hash }; }
async function queued(hash: Hex) { const value = await receipt(hash); const [event] = parseEventLogs({ abi: compiled.currentPartnerGovernor.abi, logs: value.logs, eventName: "OperationQueued" }); const id = (event as unknown as { args?: { operationId?: Hex } } | undefined)?.args?.operationId; if (!id) throw new Error("OperationQueued missing"); return id; }
async function waitDelay() { await new Promise((resolve) => setTimeout(resolve, 33_000)); }

const minimumDelay = 30;
const partnerToken = await deploy(compiled.currentTestnetPartnerToken.abi, compiled.currentTestnetPartnerToken.bytecode, [deployer.address]);
const partnerVault = await deploy(compiled.currentPartnerVault.abi, compiled.currentPartnerVault.bytecode, [deployer.address, campaignVault]);
const governor = await deploy(compiled.currentPartnerGovernor.abi, compiled.currentPartnerGovernor.bytecode, [deployer.address, getAddress(guardian), partnerVault.address, minimumDelay]);
const ownershipHash = await walletClient.writeContract({ address: partnerVault.address, abi: compiled.currentPartnerVault.abi, functionName: "transferOwnership", args: [governor.address] }); await receipt(ownershipHash);

const metadataHash = keccak256(stringToHex("Current CoFi partner proof asset: CPT; Arc testnet only; no monetary value"));
const approvalId = await queued(await walletClient.writeContract({ address: governor.address, abi: compiled.currentPartnerGovernor.abi, functionName: "queueAssetUpdate", args: [partnerToken.address, deployer.address, metadataHash, true] }));
await waitDelay();
const approvalHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentPartnerGovernor.abi, functionName: "executeAssetUpdate", args: [approvalId, deployer.address, metadataHash, true] }); await receipt(approvalHash);

const depositAmount = parseUnits("100000", 18); const depositReference = keccak256(stringToHex("current-partner-reserve-proof-v1"));
const tokenApprovalHash = await walletClient.writeContract({ address: partnerToken.address, abi: compiled.currentTestnetPartnerToken.abi, functionName: "approve", args: [partnerVault.address, depositAmount] }); await receipt(tokenApprovalHash);
const depositHash = await walletClient.writeContract({ address: partnerVault.address, abi: compiled.currentPartnerVault.abi, functionName: "deposit", args: [partnerToken.address, depositAmount, depositReference] }); await receipt(depositHash);

const campaignId = keccak256(stringToHex("current-partner-proof-campaign-v1")); const merkleRoot = keccak256(stringToHex("current-partner-proof-allocation-root-v1"));
const campaignAmount = parseUnits("10000", 18); const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60); const recipientCount = 100;
const campaignIdOperation = await queued(await walletClient.writeContract({ address: governor.address, abi: compiled.currentPartnerGovernor.abi, functionName: "queueCampaign", args: [partnerToken.address, campaignId, campaignAmount, expiresAt, recipientCount, merkleRoot] }));
await waitDelay();
const campaignHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentPartnerGovernor.abi, functionName: "executeCampaign", args: [campaignIdOperation, campaignId, campaignAmount, expiresAt, recipientCount, merkleRoot] }); await receipt(campaignHash);

fs.writeFileSync(deploymentPath, JSON.stringify({ ...previous,
  currentPartnerVaultAddress: partnerVault.address, currentPartnerVaultDeploymentTransactionHash: partnerVault.hash,
  currentPartnerGovernorAddress: governor.address, currentPartnerGovernorDeploymentTransactionHash: governor.hash,
  currentTestnetPartnerTokenAddress: partnerToken.address, currentTestnetPartnerTokenDeploymentTransactionHash: partnerToken.hash,
  currentPartnerVaultOwnershipTransactionHash: ownershipHash, currentPartnerAssetApprovalTransactionHash: approvalHash,
  currentPartnerDepositTransactionHash: depositHash, currentPartnerCampaignFundingTransactionHash: campaignHash,
  currentPartnerProofCampaignId: campaignId, currentPartnerProofMerkleRoot: merkleRoot,
  currentPartnerGovernanceMinimumDelaySeconds: minimumDelay, currentPartnerDepositedAmount: "100000",
  currentPartnerCampaignFundedAmount: "10000", currentPartnerStatus: "deployed-and-proven",
}, null, 2) + "\n");
console.log(JSON.stringify({ partnerToken: partnerToken.address, partnerVault: partnerVault.address, governor: governor.address, campaignId, campaignHash }, null, 2));
