import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { ARC_TESTNET } from "../config.js";
import { getDb, hasDatabaseConfig } from "../db/client.js";
import {
  activationEvents, allocations, claims, crosschainFundingIntents, distributions,
  gatewayFundingIntents, identityAttestations, referrals, tokens,
} from "../db/schema.js";

type DistributionRow = {
  id: string; kind: string; status: string; totalAmountAtomic: string; claimedAmountAtomic: string;
  recipientCount: number; merkleRoot: string | null; vaultAddress: string | null; fundingTxHash: string | null;
  startsAt: Date | null; expiresAt: Date | null; createdAt: Date; rules: Record<string, unknown>; metadata: Record<string, unknown>;
  token: { symbol: string; name: string; decimals: number; contractAddress: string; verified: boolean };
};

export type CampaignProofExplorerInput = {
  configured: boolean;
  generatedAt: Date;
  distributions: DistributionRow[];
  allocations: Array<{ distributionId: string; status: string }>;
  claims: Array<{ distributionId: string; status: string; transactionHash: string | null; confirmedAt: Date | null }>;
  activations: Array<{ distributionId: string | null; eventType: string; userId: string | null }>;
  attestations: Array<{ distributionId: string; identityType: string; consumedAt: Date | null }>;
  referrals: Array<{ distributionId: string; status: string }>;
  crosschain: Array<{ distributionId: string; sourceChain: string; destinationChain: string; status: string; sourceTransactionHash: string | null; destinationTransactionHash: string | null; campaignFundingTransactionHash: string | null }>;
  gateway: Array<{ distributionId: string; sourceChain: string; status: string; depositTransactionHash: string | null; mintTransactionHash: string | null; campaignFundingTransactionHash: string | null }>;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function campaignProofDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

const countBy = <T>(rows: T[], key: (row: T) => string) => rows.reduce<Record<string, number>>((all, row) => {
  const value = key(row); all[value] = (all[value] ?? 0) + 1; return all;
}, {});

export function assembleCampaignProofExplorer(input: CampaignProofExplorerInput) {
  const campaigns = input.distributions.map((distribution) => {
    const allocationRows = input.allocations.filter((row) => row.distributionId === distribution.id);
    const claimRows = input.claims.filter((row) => row.distributionId === distribution.id && row.status === "confirmed");
    const activationRows = input.activations.filter((row) => row.distributionId === distribution.id);
    const attestationRows = input.attestations.filter((row) => row.distributionId === distribution.id);
    const referralRows = input.referrals.filter((row) => row.distributionId === distribution.id);
    const crosschainRows = input.crosschain.filter((row) => row.distributionId === distribution.id);
    const gatewayRows = input.gateway.filter((row) => row.distributionId === distribution.id);
    const proofRef = `C-${campaignProofDigest(distribution.id).slice(0, 10).toUpperCase()}`;
    const metadata = distribution.metadata ?? {};
    const rules = distribution.rules ?? {};
    const remainingAtomic = (BigInt(distribution.totalAmountAtomic) - BigInt(distribution.claimedAmountAtomic)).toString();
    const body = {
      proofRef,
      label: `Campaign ${proofRef}`,
      network: ARC_TESTNET.network,
      status: distribution.status,
      kind: distribution.kind,
      asset: { ...distribution.token, amountAtomic: distribution.totalAmountAtomic, claimedAmountAtomic: distribution.claimedAmountAtomic },
      targeting: {
        claimMode: typeof rules.claimMode === "string" ? rules.claimMode : "allowlist",
        claimCondition: rules.claimCondition && typeof rules.claimCondition === "object" ? rules.claimCondition : null,
        recipients: allocationRows.length || distribution.recipientCount,
        allocationStates: countBy(allocationRows, (row) => row.status),
      },
      settlement: {
        confirmedClaims: claimRows.length,
        remainingAtomic,
        claimTransactions: claimRows.filter((row) => row.transactionHash).map((row) => ({ hash: row.transactionHash!, confirmedAt: row.confirmedAt?.toISOString() ?? null })),
      },
      activation: {
        events: activationRows.length,
        distinctUsers: new Set(activationRows.flatMap((row) => row.userId ? [row.userId] : [])).size,
        eventTypes: countBy(activationRows, (row) => row.eventType),
      },
      identity: { attestations: attestationRows.length, consumed: attestationRows.filter((row) => row.consumedAt).length, types: countBy(attestationRows, (row) => row.identityType) },
      referrals: { total: referralRows.length, states: countBy(referralRows, (row) => row.status) },
      anchors: {
        merkleRoot: distribution.merkleRoot,
        vaultAddress: distribution.vaultAddress,
        fundingTransactionHash: distribution.fundingTxHash,
        refundTransactionHash: typeof metadata.refundTransactionHash === "string" ? metadata.refundTransactionHash : null,
        crosschainFunding: crosschainRows.map((row) => ({ sourceChain: row.sourceChain, destinationChain: row.destinationChain, status: row.status, sourceTransactionHash: row.sourceTransactionHash, destinationTransactionHash: row.destinationTransactionHash, campaignFundingTransactionHash: row.campaignFundingTransactionHash })),
        gatewayFunding: gatewayRows.map((row) => ({ sourceChain: row.sourceChain, destinationChain: ARC_TESTNET.network, status: row.status, depositTransactionHash: row.depositTransactionHash, mintTransactionHash: row.mintTransactionHash, campaignFundingTransactionHash: row.campaignFundingTransactionHash })),
      },
      recovery: {
        expiresAt: distribution.expiresAt?.toISOString() ?? null,
        refundable: Boolean(distribution.expiresAt && distribution.expiresAt <= input.generatedAt && BigInt(remainingAtomic) > BigInt(0)),
        refunded: typeof metadata.refundTransactionHash === "string",
      },
      timeline: { createdAt: distribution.createdAt.toISOString(), startsAt: distribution.startsAt?.toISOString() ?? null, expiresAt: distribution.expiresAt?.toISOString() ?? null },
    };
    return { ...body, digest: campaignProofDigest(body) };
  });

  const body = {
    schemaVersion: "current-public-campaign-explorer-v1" as const,
    product: "Current CoFi" as const,
    network: ARC_TESTNET.network,
    explorerUrl: ARC_TESTNET.explorerUrl,
    configured: input.configured,
    valueStatus: "Test assets have no monetary value" as const,
    generatedAt: input.generatedAt.toISOString(),
    totals: {
      campaigns: campaigns.length,
      recipients: campaigns.reduce((sum, item) => sum + item.targeting.recipients, 0),
      confirmedClaims: campaigns.reduce((sum, item) => sum + item.settlement.confirmedClaims, 0),
      settlementTransactions: campaigns.reduce((sum, item) => sum + item.settlement.claimTransactions.length, 0),
      activationEvents: campaigns.reduce((sum, item) => sum + item.activation.events, 0),
      identityAttestations: campaigns.reduce((sum, item) => sum + item.identity.attestations, 0),
      fundedCampaigns: campaigns.filter((item) => item.anchors.fundingTransactionHash).length,
    },
    campaigns,
    sources: ["Arc testnet settlement hashes", "Current campaign, allocation, claim, activation, identity, referral, CCTP, and Gateway records"],
    privacy: "Campaign and project names, database IDs, recipient identities, wallet addresses, emails, social handles, API keys, and private contacts never leave this endpoint. Public references are one-way SHA-256 aliases.",
  };
  return { ...body, digest: campaignProofDigest(body) };
}

export async function getCampaignProofExplorer() {
  const generatedAt = new Date();
  if (!hasDatabaseConfig()) return assembleCampaignProofExplorer({ configured: false, generatedAt, distributions: [], allocations: [], claims: [], activations: [], attestations: [], referrals: [], crosschain: [], gateway: [] });
  const db = getDb();
  const [distributionRows, allocationRows, claimRows, activationRows, attestationRows, referralRows, crosschainRows, gatewayRows] = await Promise.all([
    db.select({ id: distributions.id, kind: distributions.kind, status: distributions.status, totalAmountAtomic: distributions.totalAmountAtomic, claimedAmountAtomic: distributions.claimedAmountAtomic, recipientCount: distributions.recipientCount, merkleRoot: distributions.merkleRoot, vaultAddress: distributions.vaultAddress, fundingTxHash: distributions.fundingTxHash, startsAt: distributions.startsAt, expiresAt: distributions.expiresAt, createdAt: distributions.createdAt, rules: distributions.rules, metadata: distributions.metadata, token: { symbol: tokens.symbol, name: tokens.name, decimals: tokens.decimals, contractAddress: tokens.contractAddress, verified: tokens.verified } }).from(distributions).innerJoin(tokens, eq(distributions.tokenId, tokens.id)).orderBy(desc(distributions.createdAt)).limit(100),
    db.select({ distributionId: allocations.distributionId, status: allocations.status }).from(allocations),
    db.select({ distributionId: allocations.distributionId, status: claims.status, transactionHash: claims.transactionHash, confirmedAt: claims.confirmedAt }).from(claims).innerJoin(allocations, eq(claims.allocationId, allocations.id)),
    db.select({ distributionId: activationEvents.distributionId, eventType: activationEvents.eventType, userId: activationEvents.userId }).from(activationEvents).where(sql`${activationEvents.distributionId} is not null`),
    db.select({ distributionId: identityAttestations.distributionId, identityType: identityAttestations.identityType, consumedAt: identityAttestations.consumedAt }).from(identityAttestations),
    db.select({ distributionId: referrals.distributionId, status: referrals.status }).from(referrals),
    db.select({ distributionId: crosschainFundingIntents.distributionId, sourceChain: crosschainFundingIntents.sourceChain, destinationChain: crosschainFundingIntents.destinationChain, status: crosschainFundingIntents.status, sourceTransactionHash: crosschainFundingIntents.sourceTransactionHash, destinationTransactionHash: crosschainFundingIntents.destinationTransactionHash, campaignFundingTransactionHash: crosschainFundingIntents.campaignFundingTransactionHash }).from(crosschainFundingIntents),
    db.select({ distributionId: gatewayFundingIntents.distributionId, sourceChain: gatewayFundingIntents.sourceChain, status: gatewayFundingIntents.status, depositTransactionHash: gatewayFundingIntents.depositTransactionHash, mintTransactionHash: gatewayFundingIntents.mintTransactionHash, campaignFundingTransactionHash: gatewayFundingIntents.campaignFundingTransactionHash }).from(gatewayFundingIntents),
  ]);
  return assembleCampaignProofExplorer({ configured: true, generatedAt, distributions: distributionRows, allocations: allocationRows, claims: claimRows, activations: activationRows, attestations: attestationRows, referrals: referralRows, crosschain: crosschainRows, gateway: gatewayRows });
}
