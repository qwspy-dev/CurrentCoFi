import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
const authorizerKey = process.env.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY as `0x${string}` | undefined;
if (!deployerKey || !authorizerKey) {
  throw new Error("Campaign deployment requires the protocol deployer and claim authorizer keys.");
}

const chain = defineChain({
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
});
const deployer = privateKeyToAccount(deployerKey);
const authorizer = privateKeyToAccount(authorizerKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
const compiled = compileContracts();

const transactionHash = await walletClient.deployContract({
  abi: compiled.campaignVault.abi,
  bytecode: compiled.campaignVault.bytecode,
  args: [deployer.address, authorizer.address],
});
const receipt = await publicClient.waitForTransactionReceipt({
  hash: transactionHash,
  confirmations: 1,
  timeout: 120_000,
});
if (!receipt.contractAddress || receipt.status !== "success") {
  throw new Error(`Campaign vault deployment failed: ${transactionHash}`);
}

const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
fs.writeFileSync(deploymentPath, JSON.stringify({
  ...previous,
  campaignVaultAddress: receipt.contractAddress,
  campaignDeploymentTransactionHash: transactionHash,
  campaignVaultStatus: "deployed",
}, null, 2) + "\n");

console.log(JSON.stringify({
  campaignVaultAddress: receipt.contractAddress,
  transactionHash,
  deployer: deployer.address,
  authorizer: authorizer.address,
}, null, 2));
