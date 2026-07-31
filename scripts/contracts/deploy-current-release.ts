import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, getAddress, http, keccak256, parseEventLogs, stringToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
const guardian = process.env.CURRENT_GOVERNANCE_GUARDIAN_ADDRESS?.trim() as Address | undefined;
if (!deployerKey || !guardian) throw new Error("Protocol deployer and governance guardian are required.");
const deployment = JSON.parse(fs.readFileSync(path.join(process.cwd(), "deployments", "arc-testnet.json"), "utf8")) as Record<string, unknown>;
const catalog = [
  ["claim-vault", "claim-vault:v1", "claimVaultAddress"], ["campaign-vault", "campaign-vault:v1", "campaignVaultAddress"],
  ["current-token", "current-token:v1", "currentTokenAddress"], ["current-lock-vault", "current-lock-vault:v1", "currentLockVaultAddress"],
  ["fee-router", "fee-router:v1", "currentFeeRouterAddress"], ["access-manager", "access-manager:v1", "currentAccessManagerAddress"],
  ["buyback-governor", "buyback-governor:v1", "currentBuybackGovernorAddress"], ["liquidity-vault", "liquidity-vault:v1", "currentLiquidityVaultAddress"],
  ["partner-vault", "partner-vault:v1", "currentPartnerVaultAddress"], ["venue-registry", "venue-registry:v1", "currentVenueRegistryAddress"],
] as const;
const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const deployer = privateKeyToAccount(deployerKey); const compiled = compileContracts();
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 8, retryDelay: 1_000 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
async function receipt(hash: Hex) { const value = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }); if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`); return value; }
async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) { const hash = await walletClient.deployContract({ abi, bytecode, args }); const value = await receipt(hash); if (!value.contractAddress) throw new Error(`Deployment failed: ${hash}`); return { address: value.contractAddress, hash }; }
const components = [];
for (const [name, version, key] of catalog) {
  const implementation = deployment[key] as Address | undefined; if (!implementation) throw new Error(`Missing ${key}.`);
  const code = await publicClient.getCode({ address: implementation }); if (!code) throw new Error(`No bytecode for ${name}.`);
  components.push({ componentId: keccak256(stringToHex(name)), implementation, codeHash: keccak256(code), versionHash: keccak256(stringToHex(version)) });
}
const releaseId = keccak256(stringToHex("current-cofi:arc-testnet:release:v1"));
const registry = await deploy(compiled.currentReleaseRegistry.abi, compiled.currentReleaseRegistry.bytecode, [deployer.address]);
const governor = await deploy(compiled.currentReleaseGovernor.abi, compiled.currentReleaseGovernor.bytecode, [deployer.address, getAddress(guardian), registry.address, 30]);
const ownershipHash = await walletClient.writeContract({ address: registry.address, abi: compiled.currentReleaseRegistry.abi, functionName: "transferOwnership", args: [governor.address] }); await receipt(ownershipHash);
const queueHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentReleaseGovernor.abi, functionName: "queueRelease", args: [releaseId, components] });
const queued = await receipt(queueHash); const [event] = parseEventLogs({ abi: compiled.currentReleaseGovernor.abi, logs: queued.logs, eventName: "ReleaseOperationQueued" });
const operationId = (event as unknown as { args?: { operationId?: Hex } } | undefined)?.args?.operationId; if (!operationId) throw new Error("Release operation missing.");
await new Promise((resolve) => setTimeout(resolve, 33_000));
const executeHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentReleaseGovernor.abi, functionName: "executeRelease", args: [operationId, releaseId, components] }); await receipt(executeHash);
const manifestHash = await publicClient.readContract({ address: registry.address, abi: compiled.currentReleaseRegistry.abi, functionName: "currentManifestHash" });
console.log(JSON.stringify({ registry: registry.address, registryDeploymentHash: registry.hash, governor: governor.address, governorDeploymentHash: governor.hash, ownershipHash, queueHash, executeHash, operationId, releaseId, manifestHash, components }, null, 2));
