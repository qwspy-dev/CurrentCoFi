import { createHash } from "node:crypto";
import { getPartnerVaultSnapshot } from "./vault.js";

type PartnerSnapshot = Awaited<ReturnType<typeof getPartnerVaultSnapshot>>;

type ProofAnchors = {
  tokenDeploymentTransactionHash?: string;
  vaultDeploymentTransactionHash?: string;
  governorDeploymentTransactionHash?: string;
  assetApprovalTransactionHash?: string;
  reserveDepositTransactionHash?: string;
  campaignFundingTransactionHash?: string;
  settlementQueueTransactionHash?: string;
  settlementFundingTransactionHash?: string;
  settlementClaimTransactionHash?: string;
};

// Immutable, public Arc testnet transaction anchors for the currently configured
// partner-proof deployment. Live contract state is still read at request time.
const proofAnchors: ProofAnchors = {
  tokenDeploymentTransactionHash: "0x7e72141b21ceefb64a51266010a116e884c421592861a8337776c11ac01d2e7c",
  vaultDeploymentTransactionHash: "0x1d1775f94794733f01040598baad9fca046d46efadd56a5d6554dca3fbdd16aa",
  governorDeploymentTransactionHash: "0x100148f7903845824d061f8b5a7fbe07782bb00756b2b2afdb4f69a9dc27d398",
  assetApprovalTransactionHash: "0x7e19b228934a8b9a3afe8ef309ba808fdf952b6308c395324dab96baed957ee9",
  reserveDepositTransactionHash: "0x87a1d90e408d7cb2b2a175091b1ed6570c9076bb25acc2f0a4b9b14bafca1198",
  campaignFundingTransactionHash: "0xfd6067c3feac3ad26c9b5de5989123aa331e37f4a8746e46143709f3dd5c030f",
  settlementQueueTransactionHash: "0x47ad3265197cbe3c993e3f6980f1aef08494e49da5f5cc07f30fef4f4b2eab91",
  settlementFundingTransactionHash: "0xc9a6f417f615425a5a4c21f6094cce339bf87877fda5affeb0ffa06bcbefbcba",
  settlementClaimTransactionHash: "0xfad01a7d1feeb893480a9b65bc847a72a69b7400b88e6d4d3d18541bd3dd51e0",
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const projectTokenProofDigest = (value: unknown) =>
  createHash("sha256").update(stable(value)).digest("hex");

export function assembleProjectTokenProof(input: {
  generatedAt: string;
  snapshot: PartnerSnapshot;
  anchors: ProofAnchors;
}) {
  const { snapshot } = input;
  const explorerUrl = snapshot.explorerUrl ?? "https://testnet.arcscan.app";
  const addressUrl = (address?: string | null) => address ? `${explorerUrl}/address/${address}` : null;
  const transactionUrl = (hash?: string | null) => hash ? `${explorerUrl}/tx/${hash}` : null;
  const asset = snapshot.asset;
  const campaign = snapshot.proofCampaign;
  const settlement = snapshot.settlementProof;
  const governance = snapshot.governance;
  const addresses = snapshot.addresses;
  const funded = Boolean(
    snapshot.configured &&
    asset?.approved &&
    campaign &&
    Number(campaign.totalAmount) > 0 &&
    campaign.state === 1,
  );
  const settled = Boolean(
    settlement &&
    settlement.claimed &&
    Number(settlement.totalAmount) > 0 &&
    Number(settlement.remainingAmount) === 0 &&
    settlement.state === 2,
  );

  const body = {
    schemaVersion: "current-project-token-proof-v1",
    product: "Current CoFi",
    environment: "Arc testnet",
    generatedAt: input.generatedAt,
    configured: snapshot.configured,
    proofMode: "protocol-owned demonstration",
    valueStatus: "CPT is an Arc testnet demonstration token with no monetary value and no external partner endorsement.",
    boundary: "This proves Current CoFi can govern, reserve, fund, and complete an arbitrary ERC-20 recipient settlement on Arc testnet. It is protocol-owned capability evidence, not external pilot traction.",
    headline: "Project tokens move through the same funded walletless campaign rail as USDC—and settle to recipients on Arc.",
    readiness: {
      complete: funded && settled && Boolean(governance?.governorOwnsVault),
      verifiedStages: [
        Boolean(addresses?.testnetPartnerToken),
        Boolean(asset?.approved && Number(asset.totalDeposited) > 0),
        Boolean(governance?.governorOwnsVault && governance.totalExecuted >= 2),
        funded,
        settled,
      ].filter(Boolean).length,
      stages: 5,
    },
    asset: asset && addresses ? {
      symbol: asset.symbol,
      name: "Current Partner Test Token",
      decimals: asset.decimals,
      contractAddress: addresses.testnetPartnerToken,
      contractUrl: addressUrl(addresses.testnetPartnerToken),
      approved: asset.approved,
      metadataHash: asset.metadataHash,
      reserveBalance: asset.reserveBalance,
      totalDeposited: asset.totalDeposited,
      totalCampaignFunded: asset.totalCampaignFunded,
    } : null,
    campaign: campaign ? {
      proofRef: `project-token-${projectTokenProofDigest(campaign.id).slice(0, 16)}`,
      totalAmount: campaign.totalAmount,
      remainingAmount: campaign.remainingAmount,
      recipientCount: campaign.recipientCount,
      merkleRoot: campaign.merkleRoot,
      state: campaign.state === 1 ? "funded" : `state-${campaign.state}`,
      expiresAt: new Date(Number(campaign.expiresAt) * 1_000).toISOString(),
      claimEvidence: "funded-capability",
    } : null,
    settlement: settlement ? {
      proofRef: `project-token-settlement-${projectTokenProofDigest(settlement.id).slice(0, 16)}`,
      totalAmount: settlement.totalAmount,
      remainingAmount: settlement.remainingAmount,
      recipientCount: settlement.recipientCount,
      merkleRoot: settlement.merkleRoot,
      state: settlement.state === 2 ? "completed" : `state-${settlement.state}`,
      expiresAt: new Date(Number(settlement.expiresAt) * 1_000).toISOString(),
      claimed: settlement.claimed,
      claimEvidence: settled ? "claimed-and-verified" : "unavailable",
      queueTransactionHash: input.anchors.settlementQueueTransactionHash ?? null,
      queueTransactionUrl: transactionUrl(input.anchors.settlementQueueTransactionHash),
      fundingTransactionHash: input.anchors.settlementFundingTransactionHash ?? null,
      fundingTransactionUrl: transactionUrl(input.anchors.settlementFundingTransactionHash),
      claimTransactionHash: input.anchors.settlementClaimTransactionHash ?? null,
      claimTransactionUrl: transactionUrl(input.anchors.settlementClaimTransactionHash),
    } : null,
    governance: governance ? {
      governorOwnsVault: governance.governorOwnsVault,
      minimumDelaySeconds: governance.minimumDelaySeconds,
      queuedOperations: governance.totalQueued,
      executedOperations: governance.totalExecuted,
      cancelledOperations: governance.totalCancelled,
    } : null,
    flow: [
      { id: "erc20", label: "Arbitrary ERC-20 registered", status: addresses?.testnetPartnerToken && asset?.approved ? "verified" : "unavailable", evidence: addressUrl(addresses?.testnetPartnerToken) },
      { id: "reserve", label: "100,000 CPT reserved", status: Number(asset?.totalDeposited ?? 0) >= 100_000 ? "verified" : "unavailable", evidence: transactionUrl(input.anchors.reserveDepositTransactionHash) },
      { id: "governance", label: "Delayed governance executed", status: governance?.governorOwnsVault && governance.totalExecuted >= 2 ? "verified" : "unavailable", evidence: addressUrl(addresses?.governor) },
      { id: "campaign", label: "10,000 CPT fully funded", status: funded ? "verified" : "unavailable", evidence: transactionUrl(input.anchors.campaignFundingTransactionHash) },
      { id: "settlement", label: "25 CPT recipient settlement", status: settled ? "verified" : "unavailable", evidence: transactionUrl(input.anchors.settlementClaimTransactionHash) },
    ],
    contracts: addresses ? [
      { id: "token", label: "Test project token", address: addresses.testnetPartnerToken, url: addressUrl(addresses.testnetPartnerToken) },
      { id: "reserve", label: "Partner reserve vault", address: addresses.vault, url: addressUrl(addresses.vault) },
      { id: "governor", label: "Delayed partner governor", address: addresses.governor, url: addressUrl(addresses.governor) },
      { id: "campaign", label: "Walletless campaign vault", address: String(addresses.campaignVault), url: addressUrl(String(addresses.campaignVault)) },
    ] : [],
    transactions: [
      { id: "token-deployed", label: "Test token deployed", hash: input.anchors.tokenDeploymentTransactionHash, url: transactionUrl(input.anchors.tokenDeploymentTransactionHash) },
      { id: "asset-approved", label: "Asset approval executed", hash: input.anchors.assetApprovalTransactionHash, url: transactionUrl(input.anchors.assetApprovalTransactionHash) },
      { id: "reserve-funded", label: "Reserve deposited", hash: input.anchors.reserveDepositTransactionHash, url: transactionUrl(input.anchors.reserveDepositTransactionHash) },
      { id: "campaign-funded", label: "Campaign funded", hash: input.anchors.campaignFundingTransactionHash, url: transactionUrl(input.anchors.campaignFundingTransactionHash) },
      { id: "settlement-queued", label: "Settlement queued", hash: input.anchors.settlementQueueTransactionHash, url: transactionUrl(input.anchors.settlementQueueTransactionHash) },
      { id: "settlement-funded", label: "Settlement funded", hash: input.anchors.settlementFundingTransactionHash, url: transactionUrl(input.anchors.settlementFundingTransactionHash) },
      { id: "settlement-claimed", label: "Recipient claim completed", hash: input.anchors.settlementClaimTransactionHash, url: transactionUrl(input.anchors.settlementClaimTransactionHash) },
    ].filter((item) => item.hash),
    privacy: "No recipient identity, email, social handle, API key, session, or private project record is included.",
  };

  return { ...body, digest: projectTokenProofDigest(body) };
}

export async function getProjectTokenProof() {
  const snapshot = await getPartnerVaultSnapshot();
  return assembleProjectTokenProof({
    generatedAt: new Date().toISOString(),
    snapshot,
    anchors: proofAnchors,
  });
}
