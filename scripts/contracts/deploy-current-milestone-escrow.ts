import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "../../server/config.js";
import { compileContracts } from "./compile.js";

const rpcUrl = process.env.ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network";
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
if (!deployerKey) throw new Error("CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY is required.");
const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const previous = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const chain = defineChain({ id: ARC_TESTNET.chainId, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } }, blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } } });
const account = privateKeyToAccount(deployerKey);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 6, retryDelay: 900 }) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
const compiled = compileContracts();
const transactionHash = await walletClient.deployContract({ abi: compiled.milestoneEscrow.abi, bytecode: compiled.milestoneEscrow.bytecode, args: [account.address] });
const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1, timeout: 180_000 });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`Milestone escrow deployment failed: ${transactionHash}`);
const bytecode = await publicClient.getCode({ address: receipt.contractAddress });
if (!bytecode || bytecode === "0x") throw new Error("Deployed milestone escrow has no runtime bytecode.");
fs.writeFileSync(deploymentPath, JSON.stringify({ ...previous,
  currentMilestoneEscrowAddress: receipt.contractAddress,
  currentMilestoneEscrowDeploymentTransactionHash: transactionHash,
  currentMilestoneEscrowOwner: account.address,
  currentMilestoneEscrowStatus: "deployed-and-bytecode-verified",
}, null, 2) + "\n");
console.log(JSON.stringify({ address: receipt.contractAddress, transactionHash, bytecodeVerified: true }, null, 2));
