import { createPublicClient, formatUnits, http, parseAbi, type Address } from "viem";
import { ARC_TESTNET, getServerConfig } from "../config.js";

const vaultAbi = parseAbi([
  "function owner() view returns (address)",
  "function campaignVault() view returns (address)",
  "function approvedAssetCount() view returns (uint256)",
  "function totalDeposits() view returns (uint256)",
  "function totalCampaignsFunded() view returns (uint256)",
  "function assets(address) view returns (bool approved,address treasury,bytes32 metadataHash,uint256 totalDeposited,uint256 totalCampaignFunded)",
]);
const governorAbi = parseAbi([
  "function partnerVault() view returns (address)", "function guardian() view returns (address)",
  "function minimumDelay() view returns (uint64)", "function totalQueued() view returns (uint256)",
  "function totalExecuted() view returns (uint256)", "function totalCancelled() view returns (uint256)",
]);
const tokenAbi = parseAbi(["function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"]);
const campaignAbi = parseAbi(["function campaigns(bytes32) view returns (address sender,address token,uint128 totalAmount,uint128 remainingAmount,uint64 expiresAt,uint32 recipientCount,bytes32 merkleRoot,uint8 state)"]);
const multicall = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

export async function getPartnerVaultSnapshot() {
  const config = getServerConfig();
  const vault = config.CURRENT_PARTNER_VAULT_ADDRESS as Address | undefined;
  const governor = config.CURRENT_PARTNER_GOVERNOR_ADDRESS as Address | undefined;
  const token = config.CURRENT_TESTNET_PARTNER_TOKEN_ADDRESS as Address | undefined;
  if (!vault || !governor || !token) return { configured: false, network: ARC_TESTNET.network, addresses: null, asset: null, governance: null, proofCampaign: null };
  const client = createPublicClient({ transport: http(config.ARC_RPC_URL, { retryCount: 5, retryDelay: 700 }) });
  const contracts = [
    { address: vault, abi: vaultAbi, functionName: "owner" }, { address: vault, abi: vaultAbi, functionName: "campaignVault" },
    { address: vault, abi: vaultAbi, functionName: "approvedAssetCount" }, { address: vault, abi: vaultAbi, functionName: "totalDeposits" },
    { address: vault, abi: vaultAbi, functionName: "totalCampaignsFunded" }, { address: vault, abi: vaultAbi, functionName: "assets", args: [token] },
    { address: token, abi: tokenAbi, functionName: "balanceOf", args: [vault] }, { address: token, abi: tokenAbi, functionName: "symbol" }, { address: token, abi: tokenAbi, functionName: "decimals" },
    { address: governor, abi: governorAbi, functionName: "partnerVault" }, { address: governor, abi: governorAbi, functionName: "guardian" },
    { address: governor, abi: governorAbi, functionName: "minimumDelay" }, { address: governor, abi: governorAbi, functionName: "totalQueued" },
    { address: governor, abi: governorAbi, functionName: "totalExecuted" }, { address: governor, abi: governorAbi, functionName: "totalCancelled" },
  ] as const;
  const values = await client.multicall({ multicallAddress: multicall, allowFailure: false, contracts: contracts as never }) as readonly unknown[];
  const asset = values[5] as readonly [boolean, Address, `0x${string}`, bigint, bigint]; const decimals = Number(values[8]);
  let proofCampaign: null | Record<string, unknown> = null;
  if (config.CURRENT_PARTNER_PROOF_CAMPAIGN_ID) {
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const campaign = await client.readContract({ address: values[1] as Address, abi: campaignAbi, functionName: "campaigns", args: [config.CURRENT_PARTNER_PROOF_CAMPAIGN_ID] });
    proofCampaign = { id: config.CURRENT_PARTNER_PROOF_CAMPAIGN_ID, sender: campaign[0], token: campaign[1], totalAmount: formatUnits(campaign[2], decimals), remainingAmount: formatUnits(campaign[3], decimals), expiresAt: Number(campaign[4]), recipientCount: Number(campaign[5]), merkleRoot: campaign[6], state: Number(campaign[7]) };
  }
  return {
    configured: true, network: ARC_TESTNET.network, explorerUrl: ARC_TESTNET.explorerUrl,
    addresses: { vault, governor, testnetPartnerToken: token, campaignVault: values[1] },
    asset: { approved: asset[0], treasury: asset[1], metadataHash: asset[2], symbol: String(values[7]), decimals, reserveBalance: formatUnits(values[6] as bigint, decimals), totalDeposited: formatUnits(asset[3], decimals), totalCampaignFunded: formatUnits(asset[4], decimals) },
    governance: { governorOwnsVault: String(values[0]).toLowerCase() === governor.toLowerCase() && String(values[9]).toLowerCase() === vault.toLowerCase(), guardian: values[10], minimumDelaySeconds: Number(values[11]), totalQueued: Number(values[12]), totalExecuted: Number(values[13]), totalCancelled: Number(values[14]) },
    totals: { approvedAssets: Number(values[2]), deposits: Number(values[3]), campaignsFunded: Number(values[4]) }, proofCampaign,
    proofMode: "Arc testnet demonstration asset with no monetary value",
  };
}
