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
const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const current = previous.currentTokenAddress as Address | undefined; const adapter = previous.currentTestnetLiquidityAdapterAddress as Address | undefined;
if (!current || !adapter) throw new Error("Deploy the $CURRENT liquidity proof first.");
const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const deployer = privateKeyToAccount(deployerKey); const compiled = compileContracts();
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 6, retryDelay: 900 }) }); const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
async function receipt(hash: Hex) { const value = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 }); if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`); return value; }
async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) { const hash = await walletClient.deployContract({ abi, bytecode, args }); const value = await receipt(hash); if (!value.contractAddress) throw new Error(`Deployment failed: ${hash}`); return { address: value.contractAddress, hash }; }
async function waitDelay() { await new Promise(resolve => setTimeout(resolve, 33_000)); }

const registry = await deploy(compiled.currentLiquidityVenueRegistry.abi, compiled.currentLiquidityVenueRegistry.bytecode, [deployer.address, current, ARC_TESTNET.usdcAddress]);
const governor = await deploy(compiled.currentVenueRegistryGovernor.abi, compiled.currentVenueRegistryGovernor.bytecode, [deployer.address, getAddress(guardian), registry.address, 30]);
const ownershipHash = await walletClient.writeContract({ address: registry.address, abi: compiled.currentLiquidityVenueRegistry.abi, functionName: "transferOwnership", args: [governor.address] }); await receipt(ownershipHash);
const code = await publicClient.getCode({ address: adapter }); if (!code) throw new Error("Liquidity adapter bytecode unavailable."); const codeHash = keccak256(code);
const venueId = keccak256(stringToHex("current:arc-testnet-paired-reserve:v1")); const venueNameHash = keccak256(stringToHex("Current Arc testnet paired reserve"));
const queueHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "queueVenue", args: [adapter, venueId, venueNameHash, codeHash, 300, 2000, true] });
const queueReceipt = await receipt(queueHash); const [event] = parseEventLogs({ abi: compiled.currentVenueRegistryGovernor.abi, logs: queueReceipt.logs, eventName: "VenueOperationQueued" });
const operationId = (event as unknown as { args?: { operationId?: Hex } } | undefined)?.args?.operationId; if (!operationId) throw new Error("Venue operation missing.");
await waitDelay();
const executeHash = await walletClient.writeContract({ address: governor.address, abi: compiled.currentVenueRegistryGovernor.abi, functionName: "executeVenue", args: [operationId, venueId, venueNameHash, codeHash, 300, 2000, true] }); await receipt(executeHash);
fs.writeFileSync(deploymentPath, JSON.stringify({ ...previous,
  currentVenueRegistryAddress: registry.address, currentVenueRegistryDeploymentTransactionHash: registry.hash,
  currentVenueRegistryGovernorAddress: governor.address, currentVenueRegistryGovernorDeploymentTransactionHash: governor.hash,
  currentVenueRegistryOwnershipTransactionHash: ownershipHash, currentVenueQualificationQueueTransactionHash: queueHash,
  currentVenueQualificationTransactionHash: executeHash, currentVenueQualificationOperationId: operationId,
  currentQualifiedVenueId: venueId, currentQualifiedVenueNameHash: venueNameHash, currentQualifiedAdapterCodeHash: codeHash,
  currentVenueMaxSlippageBps: 300, currentVenueMaxAllocationBps: 2000, currentVenueRegistryStatus: "deployed-and-proven",
}, null, 2) + "\n");
console.log(JSON.stringify({ registry: registry.address, governor: governor.address, adapter, venueId, codeHash, executeHash }, null, 2));
