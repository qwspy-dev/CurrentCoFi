import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
if (!deployerKey) throw new Error("CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY is required.");

const chain = defineChain({
  id: ARC_TESTNET.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } },
});
const deployer = privateKeyToAccount(deployerKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
const compiled = compileContracts();

async function deploy(
  abi: readonly unknown[],
  bytecode: Hex,
  args: readonly unknown[],
) {
  const hash = await walletClient.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180_000,
  });
  if (!receipt.contractAddress || receipt.status !== "success") {
    throw new Error(`Contract deployment failed: ${hash}`);
  }
  return { address: receipt.contractAddress, hash };
}

const token = await deploy(
  compiled.currentToken.abi,
  compiled.currentToken.bytecode,
  [deployer.address],
);
const lockVault = await deploy(
  compiled.currentLockVault.abi,
  compiled.currentLockVault.bytecode,
  [deployer.address, token.address],
);
const feeRouter = await deploy(
  compiled.currentFeeRouter.abi,
  compiled.currentFeeRouter.bytecode,
  [
    deployer.address,
    ARC_TESTNET.usdcAddress,
    token.address,
    lockVault.address,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address,
  ],
);

const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
fs.writeFileSync(deploymentPath, JSON.stringify({
  ...previous,
  currentTokenAddress: token.address,
  currentTokenDeploymentTransactionHash: token.hash,
  currentLockVaultAddress: lockVault.address,
  currentLockVaultDeploymentTransactionHash: lockVault.hash,
  currentFeeRouterAddress: feeRouter.address,
  currentFeeRouterDeploymentTransactionHash: feeRouter.hash,
  currentEconomyStatus: "deployed",
  currentEconomyDeployer: deployer.address,
}, null, 2) + "\n");

const result: Record<string, Address | Hex> = {
  currentTokenAddress: token.address,
  currentTokenDeploymentTransactionHash: token.hash,
  currentLockVaultAddress: lockVault.address,
  currentLockVaultDeploymentTransactionHash: lockVault.hash,
  currentFeeRouterAddress: feeRouter.address,
  currentFeeRouterDeploymentTransactionHash: feeRouter.hash,
};
console.log(JSON.stringify(result, null, 2));
