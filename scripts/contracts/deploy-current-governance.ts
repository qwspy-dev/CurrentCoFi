import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  keccak256,
  parseEventLogs,
  parseUnits,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
const guardianAddress = process.env.CURRENT_GOVERNANCE_GUARDIAN_ADDRESS?.trim() as Address | undefined;
if (!deployerKey) throw new Error("CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY is required.");
if (!guardianAddress) throw new Error("CURRENT_GOVERNANCE_GUARDIAN_ADDRESS is required.");

const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const currentAddress = previous.currentTokenAddress as Address | undefined;
const lockVaultAddress = previous.currentLockVaultAddress as Address | undefined;
const feeRouterAddress = previous.currentFeeRouterAddress as Address | undefined;
if (!currentAddress || !lockVaultAddress || !feeRouterAddress) {
  throw new Error("Deploy the base $CURRENT economy contracts first.");
}

const chain = defineChain({
  id: ARC_TESTNET.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } },
});
const deployer = privateKeyToAccount(deployerKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 5, retryDelay: 750 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
const compiled = compileContracts();

async function receipt(hash: Hex) {
  const value = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180_000,
  });
  if (value.status !== "success") throw new Error(`Transaction failed: ${hash}`);
  return value;
}

async function deploy(abi: readonly unknown[], bytecode: Hex, args: readonly unknown[]) {
  const hash = await walletClient.deployContract({ abi, bytecode, args });
  const result = await receipt(hash);
  if (!result.contractAddress) throw new Error(`Contract deployment failed: ${hash}`);
  return { address: result.contractAddress, hash };
}

async function queuedOperation(hash: Hex) {
  const result = await receipt(hash);
  const [event] = parseEventLogs({
    abi: compiled.currentBuybackGovernor.abi,
    logs: result.logs,
    eventName: "OperationQueued",
  });
  if (!event) throw new Error(`OperationQueued event missing: ${hash}`);
  return (event as unknown as { args: { operationId: Hex } }).args.operationId;
}

async function waitForGovernanceDelay(seconds: number) {
  await new Promise((resolve) => setTimeout(resolve, (seconds + 3) * 1_000));
}

const minimumDelay = 30;
const accessManager = await deploy(
  compiled.currentAccessManager.abi,
  compiled.currentAccessManager.bytecode,
  [lockVaultAddress],
);
const governor = await deploy(
  compiled.currentBuybackGovernor.abi,
  compiled.currentBuybackGovernor.bytecode,
  [deployer.address, getAddress(guardianAddress), feeRouterAddress, minimumDelay],
);
const adapter = await deploy(
  compiled.currentTestnetExchangeAdapter.abi,
  compiled.currentTestnetExchangeAdapter.bytecode,
  [feeRouterAddress, BigInt(100_000_000_000_000)],
);

const ownershipHash = await walletClient.writeContract({
  address: feeRouterAddress,
  abi: compiled.currentFeeRouter.abi,
  functionName: "transferOwnership",
  args: [governor.address],
});
await receipt(ownershipHash);

const projectId = keccak256(stringToHex("current-cofi-grant-proof"));
const lockId = keccak256(stringToHex(`current-cofi-grant-proof-${Date.now()}`));
const proofLockAmount = parseUnits("25000", 18);
await receipt(await walletClient.writeContract({
  address: currentAddress,
  abi: compiled.currentToken.abi,
  functionName: "approve",
  args: [lockVaultAddress, proofLockAmount],
}));
const latestBlock = await publicClient.getBlock();
const proofUnlockAt = Number(latestBlock.timestamp) + 365 * 86_400;
const proofLockHash = await walletClient.writeContract({
  address: lockVaultAddress,
  abi: compiled.currentLockVault.abi,
  functionName: "createLock",
  args: [lockId, projectId, deployer.address, proofLockAmount, proofUnlockAt],
});
await receipt(proofLockHash);
const proofAccessHash = await walletClient.writeContract({
  address: accessManager.address,
  abi: compiled.currentAccessManager.abi,
  functionName: "syncAccess",
  args: [projectId, lockId],
});
await receipt(proofAccessHash);

const adapterLiquidity = parseUnits("10000", 18);
const adapterFundingHash = await walletClient.writeContract({
  address: currentAddress,
  abi: compiled.currentToken.abi,
  functionName: "transfer",
  args: [adapter.address, adapterLiquidity],
});
await receipt(adapterFundingHash);

const adapterOperationId = await queuedOperation(await walletClient.writeContract({
  address: governor.address,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "queueAdapterUpdate",
  args: [adapter.address, true],
}));
await waitForGovernanceDelay(minimumDelay);
const adapterApprovalHash = await walletClient.writeContract({
  address: governor.address,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeAdapterUpdate",
  args: [adapterOperationId],
});
await receipt(adapterApprovalHash);

const productFeeAmount = parseUnits("2", 6);
const feeReference = keccak256(stringToHex(`governed-buyback-proof-${Date.now()}`));
await receipt(await walletClient.writeContract({
  address: ARC_TESTNET.usdcAddress,
  abi: compiled.mockUsdc.abi,
  functionName: "approve",
  args: [feeRouterAddress, productFeeAmount],
}));
const productFeeHash = await walletClient.writeContract({
  address: feeRouterAddress,
  abi: compiled.currentFeeRouter.abi,
  functionName: "routeProductFee",
  args: [feeReference, productFeeAmount],
});
await receipt(productFeeHash);

const buybackUsdcAmount = parseUnits("0.5", 6);
const minimumCurrentOut = parseUnits("50", 18);
const buybackOperationId = await queuedOperation(await walletClient.writeContract({
  address: governor.address,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "queueBuyback",
  args: [adapter.address, buybackUsdcAmount, minimumCurrentOut, keccak256("0x")],
}));
await waitForGovernanceDelay(minimumDelay);
const buybackExecutionHash = await walletClient.writeContract({
  address: governor.address,
  abi: compiled.currentBuybackGovernor.abi,
  functionName: "executeBuyback",
  args: [buybackOperationId, "0x"],
});
await receipt(buybackExecutionHash);

fs.writeFileSync(deploymentPath, JSON.stringify({
  ...previous,
  currentAccessManagerAddress: accessManager.address,
  currentAccessManagerDeploymentTransactionHash: accessManager.hash,
  currentBuybackGovernorAddress: governor.address,
  currentBuybackGovernorDeploymentTransactionHash: governor.hash,
  currentTestnetExchangeAdapterAddress: adapter.address,
  currentTestnetExchangeAdapterDeploymentTransactionHash: adapter.hash,
  currentFeeRouterOwnershipTransactionHash: ownershipHash,
  currentGovernanceGuardian: getAddress(guardianAddress),
  currentGovernanceMinimumDelaySeconds: minimumDelay,
  currentAccessProofProjectId: projectId,
  currentAccessProofLockId: lockId,
  currentAccessProofTransactionHash: proofAccessHash,
  currentAdapterApprovalOperationId: adapterOperationId,
  currentAdapterApprovalTransactionHash: adapterApprovalHash,
  currentGovernedFeeTransactionHash: productFeeHash,
  currentBuybackOperationId: buybackOperationId,
  currentBuybackExecutionTransactionHash: buybackExecutionHash,
  currentGovernanceStatus: "deployed-and-proven",
}, null, 2) + "\n");

console.log(JSON.stringify({
  currentAccessManagerAddress: accessManager.address,
  currentBuybackGovernorAddress: governor.address,
  currentTestnetExchangeAdapterAddress: adapter.address,
  currentAccessProofTransactionHash: proofAccessHash,
  currentBuybackExecutionTransactionHash: buybackExecutionHash,
  guardian: getAddress(guardianAddress),
}, null, 2));
