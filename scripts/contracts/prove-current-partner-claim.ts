import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseEventLogs,
  parseUnits,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildCampaignTree, contractAllocationId } from "../../server/campaigns/merkle.js";
import { ARC_TESTNET } from "../../server/config.js";

const deploymentPath = path.join(process.cwd(), "deployments", "arc-testnet.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Record<string, unknown>;
const deployerKey = process.env.CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?.trim() as Hex | undefined;
const authorizerKey = process.env.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY?.trim() as Hex | undefined;
if (!deployerKey || !authorizerKey) throw new Error("The protocol deployer and claim authorizer keys are required.");

const campaignVault = getAddress(String(deployment.campaignVaultAddress)) as Address;
const partnerGovernor = getAddress(String(deployment.currentPartnerGovernorAddress)) as Address;
const partnerVault = getAddress(String(deployment.currentPartnerVaultAddress)) as Address;
const partnerToken = getAddress(String(deployment.currentTestnetPartnerTokenAddress)) as Address;
const configured = {
  campaignVault: process.env.CURRENT_CAMPAIGN_VAULT_ADDRESS,
  partnerGovernor: process.env.CURRENT_PARTNER_GOVERNOR_ADDRESS,
  partnerToken: process.env.CURRENT_TESTNET_PARTNER_TOKEN_ADDRESS,
};
for (const [key, expected] of Object.entries({ campaignVault, partnerGovernor, partnerToken })) {
  const supplied = configured[key as keyof typeof configured];
  if (supplied && supplied.toLowerCase() !== expected.toLowerCase()) throw new Error(`${key} does not match the reviewed deployment.`);
}

const chain = defineChain({
  id: ARC_TESTNET.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl } },
});
const deployer = privateKeyToAccount(deployerKey);
const authorizer = privateKeyToAccount(authorizerKey);
const publicClient = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { retryCount: 6, retryDelay: 800 }) });
const walletClient = createWalletClient({ account: deployer, chain, transport: http(chain.rpcUrls.default.http[0]) });

const governorAbi = parseAbi([
  "function owner() view returns (address)",
  "function operations(bytes32) view returns (uint8 kind,uint64 executeAfter,bool executed,bool cancelled,address token,bytes32 payloadHash)",
  "function queueCampaign(address token,bytes32 campaignId,uint256 amount,uint64 expiresAt,uint32 recipientCount,bytes32 merkleRoot) returns (bytes32)",
  "function executeCampaign(bytes32 id,bytes32 campaignId,uint256 amount,uint64 expiresAt,uint32 recipientCount,bytes32 merkleRoot)",
  "event OperationQueued(bytes32 indexed operationId,uint8 indexed kind,address indexed token,uint64 executeAfter,bytes32 campaignId,uint256 amount)",
]);
const partnerVaultAbi = parseAbi([
  "function assets(address) view returns (bool approved,address treasury,bytes32 metadataHash,uint256 totalDeposited,uint256 totalCampaignFunded)",
]);
const campaignAbi = parseAbi([
  "function authorizer() view returns (address)",
  "function campaigns(bytes32) view returns (address sender,address token,uint128 totalAmount,uint128 remainingAmount,uint64 expiresAt,uint32 recipientCount,bytes32 merkleRoot,uint8 state)",
  "function isClaimed(bytes32,uint256) view returns (bool)",
  "function claim(bytes32 campaignId,uint256 index,bytes32 allocationId,uint256 amount,address recipient,uint64 authorizationExpiresAt,bytes32[] merkleProof,bytes authorization)",
]);
const tokenAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

async function confirmed(hash: Hex) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success") throw new Error(`Transaction failed: ${hash}`);
  return receipt;
}
function persist(values: Record<string, unknown>) {
  Object.assign(deployment, values);
  fs.writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
}

if ((await publicClient.getChainId()) !== ARC_TESTNET.chainId) throw new Error("The RPC is not Arc testnet.");
const [governorOwner, vaultAuthorizer, asset] = await Promise.all([
  publicClient.readContract({ address: partnerGovernor, abi: governorAbi, functionName: "owner" }),
  publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "authorizer" }),
  publicClient.readContract({ address: partnerVault, abi: partnerVaultAbi, functionName: "assets", args: [partnerToken] }),
]);
if (governorOwner.toLowerCase() !== deployer.address.toLowerCase()) throw new Error("The configured deployer does not own the partner governor.");
if (vaultAuthorizer.toLowerCase() !== authorizer.address.toLowerCase()) throw new Error("The configured claim authorizer does not match the campaign vault.");
if (!asset[0]) throw new Error("CPT is not an approved partner asset.");

const campaignId = keccak256(stringToHex("current-partner-settlement-proof-campaign-v1"));
const allocationId = "current-partner-settlement-proof-allocation-v1";
const allocationIndex = 0;
const amount = parseUnits("25", 18);
const tree = buildCampaignTree([{ allocationId, index: allocationIndex, amountAtomic: amount.toString() }]);
const expiresAt = Number(deployment.currentPartnerSettlementExpiresAt || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
persist({
  currentPartnerSettlementCampaignId: campaignId,
  currentPartnerSettlementMerkleRoot: tree.root,
  currentPartnerSettlementAmount: "25",
  currentPartnerSettlementRecipientCount: 1,
  currentPartnerSettlementExpiresAt: expiresAt,
});

let campaign = await publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "campaigns", args: [campaignId] });
if (Number(campaign[7]) === 0) {
  let operationId = deployment.currentPartnerSettlementOperationId as Hex | undefined;
  if (!operationId) {
    const queueHash = await walletClient.writeContract({ address: partnerGovernor, abi: governorAbi, functionName: "queueCampaign", args: [partnerToken, campaignId, amount, BigInt(expiresAt), 1, tree.root] });
    const receipt = await confirmed(queueHash);
    const [queued] = parseEventLogs({ abi: governorAbi, logs: receipt.logs, eventName: "OperationQueued" });
    operationId = queued?.args.operationId;
    if (!operationId) throw new Error("The queued campaign operation was not emitted.");
    persist({ currentPartnerSettlementOperationId: operationId, currentPartnerSettlementQueueTransactionHash: queueHash });
  }
  const operation = await publicClient.readContract({ address: partnerGovernor, abi: governorAbi, functionName: "operations", args: [operationId] });
  if (operation[3]) throw new Error("The settlement-proof campaign operation was cancelled.");
  if (!operation[2]) {
    while (Number((await publicClient.getBlock()).timestamp) <= Number(operation[1])) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    const fundingHash = await walletClient.writeContract({ address: partnerGovernor, abi: governorAbi, functionName: "executeCampaign", args: [operationId, campaignId, amount, BigInt(expiresAt), 1, tree.root] });
    await confirmed(fundingHash);
    persist({ currentPartnerSettlementFundingTransactionHash: fundingHash });
  }
  campaign = await publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "campaigns", args: [campaignId] });
}
if (campaign[1].toLowerCase() !== partnerToken.toLowerCase() || campaign[2] !== amount || campaign[6] !== tree.root) {
  throw new Error("The onchain campaign does not match the reviewed settlement proof.");
}

let claimHash = deployment.currentPartnerSettlementClaimTransactionHash as Hex | undefined;
let claimed = await publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "isClaimed", args: [campaignId, BigInt(allocationIndex)] });
const balanceBefore = await publicClient.readContract({ address: partnerToken, abi: tokenAbi, functionName: "balanceOf", args: [deployer.address] });
if (!claimed) {
  const authorizationExpiresAt = Math.floor(Date.now() / 1000) + 3_600;
  const digest = keccak256(encodeAbiParameters(
    [
      { type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "uint256" },
      { type: "bytes32" }, { type: "address" }, { type: "uint256" }, { type: "uint64" },
    ],
    [campaignVault, BigInt(ARC_TESTNET.chainId), campaignId, BigInt(allocationIndex), contractAllocationId(allocationId), deployer.address, amount, BigInt(authorizationExpiresAt)],
  ));
  const authorization = await authorizer.signMessage({ message: { raw: digest } });
  claimHash = await walletClient.writeContract({
    address: campaignVault,
    abi: campaignAbi,
    functionName: "claim",
    args: [campaignId, BigInt(allocationIndex), contractAllocationId(allocationId), amount, deployer.address, BigInt(authorizationExpiresAt), tree.proof(allocationIndex), authorization],
  });
  await confirmed(claimHash);
  claimed = await publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "isClaimed", args: [campaignId, BigInt(allocationIndex)] });
}
const balanceAfter = await publicClient.readContract({ address: partnerToken, abi: tokenAbi, functionName: "balanceOf", args: [deployer.address] });
campaign = await publicClient.readContract({ address: campaignVault, abi: campaignAbi, functionName: "campaigns", args: [campaignId] });
if (!claimed || Number(campaign[7]) !== 2 || campaign[3] !== BigInt(0)) throw new Error("The CPT settlement proof did not complete onchain.");
if (!claimHash) throw new Error("The completed claim is missing its transaction anchor.");

persist({
  currentPartnerSettlementClaimTransactionHash: claimHash,
  currentPartnerSettlementRecipientAddress: deployer.address,
  currentPartnerSettlementRecipientBalanceAfter: balanceAfter.toString(),
  currentPartnerSettlementStatus: "claimed-and-verified",
});
console.log(JSON.stringify({
  network: ARC_TESTNET.network,
  campaignId,
  amount: "25 CPT",
  funded: Number(campaign[7]) === 2,
  claimed,
  balanceIncreaseObserved: balanceAfter >= balanceBefore,
  claimTransactionHash: claimHash,
  status: "claimed-and-verified",
}, null, 2));
