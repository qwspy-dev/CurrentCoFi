import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, http, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
if (!deployerKey) throw new Error("CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY is required.");
const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const current = previous.currentTokenAddress as Address | undefined;
if (!current) throw new Error("Deploy the base $CURRENT economy first.");

const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const deployer = privateKeyToAccount(deployerKey); const compiled = compileContracts();
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 5, retryDelay: 750 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
async function receipt(hash: Hex) { const value = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 }); if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`); return value; }
async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) { const hash = await walletClient.deployContract({ abi, bytecode, args }); const value = await receipt(hash); if (!value.contractAddress) throw new Error(`Deployment failed: ${hash}`); return { address: value.contractAddress, hash }; }

const router = await deploy(compiled.currentCheckoutRouter.abi, compiled.currentCheckoutRouter.bytecode, [deployer.address, ARC_TESTNET.usdcAddress]);
const adapter = await deploy(compiled.currentTestnetCheckoutAdapter.abi, compiled.currentTestnetCheckoutAdapter.bytecode, [router.address, current, ARC_TESTNET.usdcAddress, BigInt(100_000_000_000_000)]);
const adapterApprovalHash = await walletClient.writeContract({ address: router.address, abi: compiled.currentCheckoutRouter.abi, functionName: "setAdapter", args: [adapter.address, true] }); await receipt(adapterApprovalHash);
const routeApprovalHash = await walletClient.writeContract({ address: router.address, abi: compiled.currentCheckoutRouter.abi, functionName: "setRoute", args: [current, adapter.address, true] }); await receipt(routeApprovalHash);
const reserveAmount = parseUnits("25", 6);
const reserveHash = await walletClient.writeContract({ address: ARC_TESTNET.usdcAddress, abi: compiled.mockUsdc.abi, functionName: "transfer", args: [adapter.address, reserveAmount] }); await receipt(reserveHash);
const quote = await publicClient.readContract({ address: router.address, abi: compiled.currentCheckoutRouter.abi, functionName: "quote", args: [current, parseUnits("1", 6), adapter.address] });

fs.writeFileSync(deploymentPath, JSON.stringify({ ...previous,
  currentCheckoutRouterAddress: router.address,
  currentCheckoutRouterDeploymentTransactionHash: router.hash,
  currentTestnetCheckoutAdapterAddress: adapter.address,
  currentTestnetCheckoutAdapterDeploymentTransactionHash: adapter.hash,
  currentCheckoutAdapterApprovalTransactionHash: adapterApprovalHash,
  currentCheckoutRouteApprovalTransactionHash: routeApprovalHash,
  currentCheckoutReserveTransactionHash: reserveHash,
  currentCheckoutReserveUSDC: "25",
  currentCheckoutOneUsdcQuoteCURRENT: (quote as bigint).toString(),
  currentCheckoutStatus: "deployed-and-proven-testnet-fixed-rate",
}, null, 2) + "\n");

console.log(JSON.stringify({ router: router.address, adapter: adapter.address, reserveUSDC: "25", oneUsdcQuoteCURRENTAtomic: (quote as bigint).toString(), proofTransactionHash: reserveHash }, null, 2));
