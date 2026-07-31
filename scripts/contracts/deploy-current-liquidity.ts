import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, getAddress, http, keccak256, parseEventLogs, parseUnits, stringToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
const guardian = process.env.CURRENT_GOVERNANCE_GUARDIAN_ADDRESS?.trim() as Address | undefined;
if (!deployerKey || !guardian) throw new Error("Protocol deployer and governance guardian are required.");
const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const current = previous.currentTokenAddress as Address | undefined;
const lockVault = previous.currentLockVaultAddress as Address | undefined;
if (!current || !lockVault) throw new Error("Deploy the base $CURRENT economy first.");

const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const deployer = privateKeyToAccount(deployerKey); const compiled = compileContracts();
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 5, retryDelay: 750 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
async function receipt(hash: Hex) { const value = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 }); if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`); return value; }
async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) { const hash = await walletClient.deployContract({ abi, bytecode, args }); const value = await receipt(hash); if (!value.contractAddress) throw new Error(`Deployment failed: ${hash}`); return { address: value.contractAddress, hash }; }
async function queued(hash: Hex, abi: readonly unknown[]) { const value = await receipt(hash); const [event] = parseEventLogs({ abi, logs: value.logs, eventName: "OperationQueued" }); if (!event) throw new Error("OperationQueued missing"); return (event as unknown as { args: { operationId: Hex } }).args.operationId; }
async function waitDelay() { await new Promise((resolve) => setTimeout(resolve, 33_000)); }

const minimumDelay = 30;
const liquidityVault = await deploy(compiled.currentLiquidityVault.abi, compiled.currentLiquidityVault.bytecode, [deployer.address, current, ARC_TESTNET.usdcAddress]);
const feeRouter = await deploy(compiled.currentFeeRouter.abi, compiled.currentFeeRouter.bytecode, [deployer.address, ARC_TESTNET.usdcAddress, current, lockVault, deployer.address, liquidityVault.address, deployer.address, deployer.address]);
const buybackGovernor = await deploy(compiled.currentBuybackGovernor.abi, compiled.currentBuybackGovernor.bytecode, [deployer.address, getAddress(guardian), feeRouter.address, minimumDelay]);
const exchangeAdapter = await deploy(compiled.currentTestnetExchangeAdapter.abi, compiled.currentTestnetExchangeAdapter.bytecode, [feeRouter.address, BigInt(100_000_000_000_000)]);
const liquidityGovernor = await deploy(compiled.currentLiquidityGovernor.abi, compiled.currentLiquidityGovernor.bytecode, [deployer.address, getAddress(guardian), liquidityVault.address, minimumDelay]);
const liquidityAdapter = await deploy(compiled.currentTestnetLiquidityAdapter.abi, compiled.currentTestnetLiquidityAdapter.bytecode, [liquidityVault.address]);
const routerOwnershipHash = await walletClient.writeContract({ address: feeRouter.address, abi: compiled.currentFeeRouter.abi, functionName: "transferOwnership", args: [buybackGovernor.address] }); await receipt(routerOwnershipHash);
const vaultOwnershipHash = await walletClient.writeContract({ address: liquidityVault.address, abi: compiled.currentLiquidityVault.abi, functionName: "transferOwnership", args: [liquidityGovernor.address] }); await receipt(vaultOwnershipHash);

const exchangeApprovalId = await queued(await walletClient.writeContract({ address: buybackGovernor.address, abi: compiled.currentBuybackGovernor.abi, functionName: "queueAdapterUpdate", args: [exchangeAdapter.address, true] }), compiled.currentBuybackGovernor.abi);
const liquidityApprovalId = await queued(await walletClient.writeContract({ address: liquidityGovernor.address, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueAdapterUpdate", args: [liquidityAdapter.address, true] }), compiled.currentLiquidityGovernor.abi);
await waitDelay();
const exchangeApprovalHash = await walletClient.writeContract({ address: buybackGovernor.address, abi: compiled.currentBuybackGovernor.abi, functionName: "executeAdapterUpdate", args: [exchangeApprovalId] }); await receipt(exchangeApprovalHash);
const liquidityApprovalHash = await walletClient.writeContract({ address: liquidityGovernor.address, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeAdapterUpdate", args: [liquidityApprovalId] }); await receipt(liquidityApprovalHash);

const exchangeFundingHash = await walletClient.writeContract({ address: current, abi: compiled.currentToken.abi, functionName: "transfer", args: [exchangeAdapter.address, parseUnits("10000", 18)] }); await receipt(exchangeFundingHash);
const feeAmount = parseUnits("5", 6); const feeReference = keccak256(stringToHex(`protocol-liquidity-proof-${Date.now()}`));
await receipt(await walletClient.writeContract({ address: ARC_TESTNET.usdcAddress, abi: compiled.mockUsdc.abi, functionName: "approve", args: [feeRouter.address, feeAmount] }));
const feeHash = await walletClient.writeContract({ address: feeRouter.address, abi: compiled.currentFeeRouter.abi, functionName: "routeProductFee", args: [feeReference, feeAmount] }); await receipt(feeHash);
const buybackId = await queued(await walletClient.writeContract({ address: buybackGovernor.address, abi: compiled.currentBuybackGovernor.abi, functionName: "queueBuyback", args: [exchangeAdapter.address, parseUnits("0.5", 6), parseUnits("50", 18), keccak256("0x")] }), compiled.currentBuybackGovernor.abi);
await waitDelay();
const buybackHash = await walletClient.writeContract({ address: buybackGovernor.address, abi: compiled.currentBuybackGovernor.abi, functionName: "executeBuyback", args: [buybackId, "0x"] }); await receipt(buybackHash);

const currentAmount = parseUnits("10", 18); const usdcAmount = parseUnits("1", 6);
const provideId = await queued(await walletClient.writeContract({ address: liquidityGovernor.address, abi: compiled.currentLiquidityGovernor.abi, functionName: "queueProvide", args: [liquidityAdapter.address, currentAmount, usdcAmount, usdcAmount, keccak256("0x")] }), compiled.currentLiquidityGovernor.abi);
await waitDelay();
const provideHash = await walletClient.writeContract({ address: liquidityGovernor.address, abi: compiled.currentLiquidityGovernor.abi, functionName: "executeProvide", args: [provideId, "0x"] });
const provideReceipt = await receipt(provideHash);
const [provided] = parseEventLogs({ abi: compiled.currentLiquidityVault.abi, logs: provideReceipt.logs, eventName: "LiquidityProvided" });
const positionId = (provided as unknown as { args?: { positionId?: Hex } } | undefined)?.args?.positionId;
if (!positionId) throw new Error("Liquidity proof position missing.");

fs.writeFileSync(deploymentPath, JSON.stringify({ ...previous,
  currentFeeRouterAddress: feeRouter.address, currentFeeRouterDeploymentTransactionHash: feeRouter.hash,
  currentBuybackGovernorAddress: buybackGovernor.address, currentBuybackGovernorDeploymentTransactionHash: buybackGovernor.hash,
  currentTestnetExchangeAdapterAddress: exchangeAdapter.address, currentTestnetExchangeAdapterDeploymentTransactionHash: exchangeAdapter.hash,
  currentLiquidityVaultAddress: liquidityVault.address, currentLiquidityVaultDeploymentTransactionHash: liquidityVault.hash,
  currentLiquidityGovernorAddress: liquidityGovernor.address, currentLiquidityGovernorDeploymentTransactionHash: liquidityGovernor.hash,
  currentTestnetLiquidityAdapterAddress: liquidityAdapter.address, currentTestnetLiquidityAdapterDeploymentTransactionHash: liquidityAdapter.hash,
  currentLiquidityFeeTransactionHash: feeHash, currentLiquidityBuybackTransactionHash: buybackHash,
  currentLiquidityProvideTransactionHash: provideHash, currentLiquidityPositionId: positionId,
  currentLiquidityGovernanceMinimumDelaySeconds: minimumDelay, currentLiquidityStatus: "deployed-and-proven",
}, null, 2) + "\n");
console.log(JSON.stringify({ feeRouter: feeRouter.address, buybackGovernor: buybackGovernor.address, liquidityVault: liquidityVault.address, liquidityGovernor: liquidityGovernor.address, liquidityAdapter: liquidityAdapter.address, proofTransactionHash: provideHash, positionId }, null, 2));
