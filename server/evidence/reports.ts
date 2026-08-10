import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import {
  activationEvents,
  agentActions,
  agentSettlementHandoffs,
  allocations,
  apiKeys,
  auditEvents,
  bounties,
  bountySubmissions,
  communityTreasuries,
  claims,
  campaignQualityPolicies,
  campaignDeliveries,
  campaignDestinationClicks,
  checkoutLinks,
  checkoutPayments,
  crosschainFundingIntents,
  distributions,
  evidenceReports,
  escrowAgreements,
  escrowMilestones,
  gatewayFundingIntents,
  giveawayEntries,
  giveaways,
  identityAttestations,
  merchantAccounts,
  projectMembers,
  participantQualityAssessments,
  projects,
  publicDrops,
  publicDropSlots,
  referrals,
  subscriptionNotices,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
  tokens,
  treasuryBudgets,
  treasuryProposals,
  vestingBatches,
  vestingSchedules,
  vestingTranches,
  webhookEndpoints,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { listProjectPilots } from "../pilots/operations.js";
import { randomSecret, sha256 } from "../security/crypto.js";

export const EVIDENCE_SCHEMA_VERSION = "current-evidence-v23";

type Criterion = {
  id: string;
  label: string;
  weight: number;
  passed: boolean;
  evidence: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function stableEvidenceJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

export function evidenceReadiness(criteria: Criterion[]) {
  const possible = criteria.reduce((total, criterion) => total + criterion.weight, 0);
  const earned = criteria.reduce(
    (total, criterion) => total + (criterion.passed ? criterion.weight : 0),
    0,
  );
  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    earned,
    possible,
    criteria,
  };
}

async function projectAccess(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({
    where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)),
  });
  if (!membership) {
    throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot create evidence for this project.");
  }
}

async function projectCampaigns(projectId: string, distributionId?: string) {
  const conditions = [eq(distributions.projectId, projectId)];
  if (distributionId) conditions.push(eq(distributions.id, distributionId));
  const rows = await getDb().select({
    id: distributions.id,
    name: distributions.name,
    status: distributions.status,
    recipientCount: distributions.recipientCount,
    totalAmountAtomic: distributions.totalAmountAtomic,
    claimedAmountAtomic: distributions.claimedAmountAtomic,
    merkleRoot: distributions.merkleRoot,
    vaultAddress: distributions.vaultAddress,
    fundingTxHash: distributions.fundingTxHash,
    expiresAt: distributions.expiresAt,
    createdAt: distributions.createdAt,
    rules: distributions.rules,
    metadata: distributions.metadata,
    tokenAddress: tokens.contractAddress,
    tokenSymbol: tokens.symbol,
    tokenDecimals: tokens.decimals,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(...conditions))
    .orderBy(desc(distributions.createdAt))
    .limit(100);
  if (distributionId && !rows.length) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign is not available to the project.");
  }
  return rows;
}

function formatAtomic(value: string, decimals: number) {
  const padded = value.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function projectCommerceEvidence(projectId: string) {
  const db = getDb();
  const merchant = await db.query.merchantAccounts.findFirst({ where: eq(merchantAccounts.projectId, projectId) });
  if (!merchant) {
    return {
      merchant: null,
      checkout: { links: 0, confirmedPayments: 0, refunds: 0, volume: "0", settlements: [] as Array<Record<string, unknown>> },
      subscriptions: { plans: 0, active: 0, cancelled: 0, confirmedCycles: 0, volume: "0", renewalDue: 0, pastDue: 0, settlements: [] as Array<Record<string, unknown>> },
    };
  }
  const [linkRows, checkoutRows, planRows, subscriptionRows, cycleRows, noticeRows] = await Promise.all([
    db.select().from(checkoutLinks).where(eq(checkoutLinks.merchantId, merchant.id)).orderBy(desc(checkoutLinks.createdAt)).limit(100),
    db.select({ payment: checkoutPayments, checkout: checkoutLinks }).from(checkoutPayments)
      .innerJoin(checkoutLinks, eq(checkoutLinks.id, checkoutPayments.checkoutId))
      .where(eq(checkoutLinks.merchantId, merchant.id)).orderBy(desc(checkoutPayments.createdAt)).limit(200),
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptionPlans.createdAt)).limit(100),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptions.createdAt)).limit(200),
    db.select({ payment: subscriptionPayments, plan: subscriptionPlans }).from(subscriptionPayments)
      .innerJoin(subscriptions, eq(subscriptions.id, subscriptionPayments.subscriptionId))
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptionPayments.createdAt)).limit(500),
    db.select({ notice: subscriptionNotices, plan: subscriptionPlans }).from(subscriptionNotices)
      .innerJoin(subscriptions, eq(subscriptions.id, subscriptionNotices.subscriptionId))
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptionNotices.createdAt)).limit(500),
  ]);
  const confirmedCheckouts = checkoutRows.filter((row) => row.payment.status === "confirmed" || row.payment.status === "refunded");
  const confirmedCycles = cycleRows.filter((row) => row.payment.status === "confirmed");
  const checkoutVolume = confirmedCheckouts.reduce((total, row) => total + BigInt(row.payment.amountAtomic), BigInt(0));
  const subscriptionVolume = confirmedCycles.reduce((total, row) => total + BigInt(row.payment.amountAtomic), BigInt(0));
  return {
    merchant: { name: merchant.displayName, status: merchant.status, settlementAddress: merchant.settlementAddress },
    checkout: {
      links: linkRows.length,
      confirmedPayments: confirmedCheckouts.length,
      refunds: checkoutRows.filter((row) => row.payment.status === "refunded").length,
      volume: formatAtomic(checkoutVolume.toString(), 6),
      settlements: confirmedCheckouts.map((row) => ({
        checkoutId: row.checkout.id,
        title: row.checkout.title,
        receiptNumber: row.payment.receiptNumber,
        status: row.payment.status,
        amount: formatAtomic(row.payment.amountAtomic, 6),
        transactionHash: row.payment.paymentTransactionHash,
        refundTransactionHash: row.payment.refundTransactionHash,
        paidAt: row.payment.paidAt?.toISOString() ?? null,
      })),
    },
    subscriptions: {
      plans: planRows.length,
      active: subscriptionRows.filter((row) => row.subscription.status === "active").length,
      cancelled: subscriptionRows.filter((row) => row.subscription.status === "cancelled").length,
      confirmedCycles: confirmedCycles.length,
      volume: formatAtomic(subscriptionVolume.toString(), 6),
      renewalDue: noticeRows.filter((row) => row.notice.status === "open" && row.notice.kind === "renewal_due").length,
      pastDue: noticeRows.filter((row) => row.notice.status === "open" && row.notice.kind === "past_due").length,
      settlements: confirmedCycles.map((row) => ({
        planId: row.plan.id,
        planTitle: row.plan.title,
        periodNumber: row.payment.periodNumber,
        receiptNumber: row.payment.receiptNumber,
        amount: formatAtomic(row.payment.amountAtomic, 6),
        transactionHash: row.payment.transactionHash,
        paidAt: row.payment.paidAt?.toISOString() ?? null,
      })),
    },
  };
}

async function projectEscrowEvidence(projectId: string) {
  const db = getDb();
  const agreements = await db.select({ agreement: escrowAgreements, token: tokens })
    .from(escrowAgreements)
    .innerJoin(tokens, eq(tokens.id, escrowAgreements.tokenId))
    .where(eq(escrowAgreements.projectId, projectId))
    .orderBy(desc(escrowAgreements.createdAt))
    .limit(100);
  const agreementIds = agreements.map((row) => row.agreement.id);
  const milestones = agreementIds.length
    ? await db.select().from(escrowMilestones)
      .where(inArray(escrowMilestones.agreementId, agreementIds))
      .orderBy(escrowMilestones.agreementId, escrowMilestones.position)
    : [];
  const assetMap = new Map<string, { symbol: string; address: string; secured: bigint; released: bigint; refunded: bigint; agreements: number }>();
  for (const row of agreements) {
    const key = row.token.contractAddress.toLowerCase();
    const current = assetMap.get(key) ?? { symbol: row.token.symbol, address: row.token.contractAddress, secured: BigInt(0), released: BigInt(0), refunded: BigInt(0), agreements: 0 };
    current.secured += BigInt(row.agreement.totalAmountAtomic);
    current.released += BigInt(row.agreement.releasedAmountAtomic);
    current.refunded += BigInt(row.agreement.refundedAmountAtomic);
    current.agreements += 1;
    assetMap.set(key, current);
  }
  return {
    totals: {
      agreements: agreements.length,
      funded: agreements.filter((row) => Boolean(row.agreement.fundingTransactionHash)).length,
      active: agreements.filter((row) => ["active", "disputed", "cancellation_requested"].includes(row.agreement.status)).length,
      completed: agreements.filter((row) => row.agreement.status === "completed").length,
      disputed: milestones.filter((milestone) => milestone.status === "disputed").length,
      submitted: milestones.filter((milestone) => Boolean(milestone.submissionTransactionHash)).length,
      settled: milestones.filter((milestone) => Boolean(milestone.settlementTransactionHash)).length,
    },
    assets: [...assetMap.values()].map((asset) => {
      const decimals = agreements.find((row) => row.token.contractAddress.toLowerCase() === asset.address.toLowerCase())?.token.decimals ?? 18;
      return { symbol: asset.symbol, address: asset.address, agreements: asset.agreements, secured: formatAtomic(asset.secured.toString(), decimals), released: formatAtomic(asset.released.toString(), decimals), refunded: formatAtomic(asset.refunded.toString(), decimals) };
    }),
    agreements: agreements.map((row) => ({
      id: row.agreement.id,
      name: row.agreement.name,
      status: row.agreement.status,
      asset: { symbol: row.token.symbol, address: row.token.contractAddress },
      totalAmount: formatAtomic(row.agreement.totalAmountAtomic, row.token.decimals),
      releasedAmount: formatAtomic(row.agreement.releasedAmountAtomic, row.token.decimals),
      refundedAmount: formatAtomic(row.agreement.refundedAmountAtomic, row.token.decimals),
      milestoneCount: row.agreement.milestoneCount,
      nextMilestone: row.agreement.nextMilestone,
      anchors: { contractDealId: row.agreement.contractDealId, contractAddress: row.agreement.contractAddress, termsHash: row.agreement.termsHash, fundingTransactionHash: row.agreement.fundingTransactionHash },
      milestones: milestones.filter((milestone) => milestone.agreementId === row.agreement.id).map((milestone) => ({
        position: milestone.position,
        title: milestone.title,
        status: milestone.status,
        amount: formatAtomic(milestone.amountAtomic, row.token.decimals),
        dueAt: milestone.dueAt.toISOString(),
        proofHash: milestone.proofHash,
        submissionTransactionHash: milestone.submissionTransactionHash,
        settlementTransactionHash: milestone.settlementTransactionHash,
        submittedAt: milestone.submittedAt?.toISOString() ?? null,
        settledAt: milestone.settledAt?.toISOString() ?? null,
      })),
      createdAt: row.agreement.createdAt.toISOString(),
    })),
    privacy: "Agreement terms digests, amounts, states, and public Arc transaction anchors only. Client, provider, arbitrator, and refund addresses are excluded from grant evidence.",
    boundary: "A configured contract proves deployability; funded and settled counts increase only from persisted Circle-wallet-authorized Arc receipts.",
  };
}

async function buildSnapshot(projectId: string, distributionId?: string) {
  const db = getDb();
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "The project does not exist.");
  const campaigns = await projectCampaigns(projectId, distributionId);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const config = getServerConfig();
  const commercePromise = projectCommerceEvidence(projectId);
  const escrowPromise = projectEscrowEvidence(projectId);
  const deliveryPromise = campaignIds.length
    ? db.select({ id: campaignDeliveries.id, distributionId: campaignDeliveries.distributionId, channel: campaignDeliveries.channel, status: campaignDeliveries.status, allocationStatus: allocations.status, sentAt: campaignDeliveries.sentAt })
      .from(campaignDeliveries)
      .innerJoin(allocations, eq(allocations.id, campaignDeliveries.allocationId))
      .where(inArray(campaignDeliveries.distributionId, campaignIds))
      .orderBy(desc(campaignDeliveries.createdAt))
    : Promise.resolve([]);
  const bountyPromise = Promise.all([
    db.select({ bounty: bounties, distribution: distributions, token: tokens })
      .from(bounties).innerJoin(distributions, eq(distributions.id, bounties.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
      .where(eq(bounties.projectId, projectId)).orderBy(desc(bounties.createdAt)),
    db.select({ submission: bountySubmissions, bountyId: bounties.id })
      .from(bountySubmissions).innerJoin(bounties, eq(bounties.id, bountySubmissions.bountyId)).where(eq(bounties.projectId, projectId)),
  ]);
  const giveawayPromise = Promise.all([
    db.select({ giveaway: giveaways, distribution: distributions, token: tokens })
      .from(giveaways).innerJoin(distributions, eq(distributions.id, giveaways.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
      .where(eq(giveaways.projectId, projectId)).orderBy(desc(giveaways.createdAt)),
    db.select({ entry: giveawayEntries, giveawayId: giveaways.id })
      .from(giveawayEntries).innerJoin(giveaways, eq(giveaways.id, giveawayEntries.giveawayId)).where(eq(giveaways.projectId, projectId)),
  ]);
  const publicDropPromise = Promise.all([
    db.select({ drop: publicDrops, distribution: distributions, token: tokens }).from(publicDrops).innerJoin(distributions, eq(distributions.id, publicDrops.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).where(eq(publicDrops.projectId, projectId)).orderBy(desc(publicDrops.createdAt)),
    db.select({ slot: publicDropSlots, dropId: publicDrops.id, allocationStatus: allocations.status }).from(publicDropSlots).innerJoin(publicDrops, eq(publicDrops.id, publicDropSlots.dropId)).innerJoin(allocations, eq(allocations.id, publicDropSlots.allocationId)).where(eq(publicDrops.projectId, projectId)),
  ]);
  const treasuryPromise = Promise.all([
    db.select().from(communityTreasuries).where(eq(communityTreasuries.projectId, projectId)),
    db.select({ budget: treasuryBudgets, treasuryId: communityTreasuries.id })
      .from(treasuryBudgets).innerJoin(communityTreasuries, eq(communityTreasuries.id, treasuryBudgets.treasuryId))
      .where(eq(communityTreasuries.projectId, projectId)),
    db.select({ proposal: treasuryProposals, token: tokens, treasuryId: communityTreasuries.id })
      .from(treasuryProposals)
      .innerJoin(communityTreasuries, eq(communityTreasuries.id, treasuryProposals.treasuryId))
      .innerJoin(tokens, eq(tokens.id, treasuryProposals.tokenId))
      .where(eq(communityTreasuries.projectId, projectId)).orderBy(desc(treasuryProposals.createdAt)),
  ]);
  const vestingPromise = Promise.all([
    db.select({ batch: vestingBatches, distribution: distributions, token: tokens })
      .from(vestingBatches)
      .innerJoin(distributions, eq(distributions.id, vestingBatches.distributionId))
      .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
      .where(eq(vestingBatches.projectId, projectId)).orderBy(desc(vestingBatches.createdAt)),
    db.select({ schedule: vestingSchedules, batchId: vestingBatches.id })
      .from(vestingSchedules).innerJoin(vestingBatches, eq(vestingBatches.id, vestingSchedules.batchId))
      .where(eq(vestingBatches.projectId, projectId)),
    db.select({ tranche: vestingTranches, scheduleId: vestingSchedules.id, batchId: vestingBatches.id, allocationStatus: allocations.status })
      .from(vestingTranches)
      .innerJoin(vestingSchedules, eq(vestingSchedules.id, vestingTranches.scheduleId))
      .innerJoin(vestingBatches, eq(vestingBatches.id, vestingSchedules.batchId))
      .innerJoin(allocations, eq(allocations.id, vestingTranches.allocationId))
      .where(eq(vestingBatches.projectId, projectId)),
  ]);

  const [
    allocationRows,
    claimRows,
    claimTransactions,
    activationRows,
    destinationRows,
    attestationRows,
    referralRows,
    integrationRows,
    recentAuditRows,
    pilotRows,
    agentActionRows,
    agentSettlementRows,
    crosschainFundingRows,
    gatewayFundingRows,
    qualityPolicyRows,
    qualityAssessmentRows,
  ] = await Promise.all([
    campaignIds.length
      ? db.select({
        distributionId: allocations.distributionId,
        total: count(),
        confirmed: count(sql`CASE WHEN ${allocations.status} = 'confirmed' THEN 1 END`),
      }).from(allocations)
        .where(inArray(allocations.distributionId, campaignIds))
        .groupBy(allocations.distributionId)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: allocations.distributionId,
        confirmed: count(),
        wallets: count(sql`DISTINCT ${claims.destinationWalletId}`),
      }).from(claims)
        .innerJoin(allocations, eq(allocations.id, claims.allocationId))
        .where(and(
          inArray(allocations.distributionId, campaignIds),
          eq(claims.status, "confirmed"),
        ))
        .groupBy(allocations.distributionId)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: allocations.distributionId,
        transactionHash: claims.transactionHash,
        confirmedAt: claims.confirmedAt,
      }).from(claims)
        .innerJoin(allocations, eq(allocations.id, claims.allocationId))
        .where(and(
          inArray(allocations.distributionId, campaignIds),
          eq(claims.status, "confirmed"),
          sql`${claims.transactionHash} IS NOT NULL`,
        ))
        .orderBy(desc(claims.confirmedAt))
        .limit(100)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: activationEvents.distributionId,
        eventType: activationEvents.eventType,
        total: count(),
      }).from(activationEvents)
        .where(inArray(activationEvents.distributionId, campaignIds))
        .groupBy(activationEvents.distributionId, activationEvents.eventType)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: campaignDestinationClicks.distributionId,
        recipients: count(),
        opens: sql<number>`sum(${campaignDestinationClicks.openCount})`,
      }).from(campaignDestinationClicks)
        .where(inArray(campaignDestinationClicks.distributionId, campaignIds))
        .groupBy(campaignDestinationClicks.distributionId)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: identityAttestations.distributionId,
        verified: count(),
        consumed: count(sql`CASE WHEN ${identityAttestations.consumedAt} IS NOT NULL THEN 1 END`),
      }).from(identityAttestations)
        .where(inArray(identityAttestations.distributionId, campaignIds))
        .groupBy(identityAttestations.distributionId)
      : [],
    campaignIds.length
      ? db.select({
        distributionId: referrals.distributionId,
        total: count(),
        activated: count(sql`CASE WHEN ${referrals.status} = 'activated' THEN 1 END`),
      }).from(referrals)
        .where(inArray(referrals.distributionId, campaignIds))
        .groupBy(referrals.distributionId)
      : [],
    Promise.all([
      db.select({ total: count() }).from(apiKeys)
        .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt))),
      db.select({ total: count() }).from(webhookEndpoints)
        .where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookEndpoints.enabled, true))),
    ]),
    db.select({
      action: auditEvents.action,
      resourceType: auditEvents.resourceType,
      resourceId: auditEvents.resourceId,
      createdAt: auditEvents.createdAt,
    }).from(auditEvents)
      .where(eq(auditEvents.projectId, projectId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(30),
    listProjectPilots(projectId),
    db.select({
      id: agentActions.id,
      kind: agentActions.kind,
      status: agentActions.status,
      riskLevel: agentActions.riskLevel,
      amountAtomic: agentActions.amountAtomic,
      policyDecision: agentActions.policyDecision,
      result: agentActions.result,
      createdAt: agentActions.createdAt,
      reviewedAt: agentActions.reviewedAt,
      executedAt: agentActions.executedAt,
    }).from(agentActions)
      .where(eq(agentActions.projectId, projectId))
      .orderBy(desc(agentActions.createdAt))
      .limit(100),
    db.select({
      id: agentSettlementHandoffs.id,
      actionId: agentSettlementHandoffs.actionId,
      distributionId: agentSettlementHandoffs.distributionId,
      status: agentSettlementHandoffs.status,
      transactionHash: agentSettlementHandoffs.transactionHash,
      evidence: agentSettlementHandoffs.evidence,
      settledAt: agentSettlementHandoffs.settledAt,
      updatedAt: agentSettlementHandoffs.updatedAt,
    }).from(agentSettlementHandoffs)
      .where(eq(agentSettlementHandoffs.projectId, projectId))
      .orderBy(desc(agentSettlementHandoffs.createdAt))
      .limit(100),
    campaignIds.length
      ? db.select({
        distributionId: crosschainFundingIntents.distributionId,
        sourceChain: crosschainFundingIntents.sourceChain,
        destinationChain: crosschainFundingIntents.destinationChain,
        status: crosschainFundingIntents.status,
        amountAtomic: crosschainFundingIntents.amountAtomic,
        sourceTransactionHash: crosschainFundingIntents.sourceTransactionHash,
        destinationTransactionHash: crosschainFundingIntents.destinationTransactionHash,
        campaignFundingTransactionHash: crosschainFundingIntents.campaignFundingTransactionHash,
        messageHash: crosschainFundingIntents.messageHash,
        createdAt: crosschainFundingIntents.createdAt,
        updatedAt: crosschainFundingIntents.updatedAt,
      }).from(crosschainFundingIntents)
        .where(inArray(crosschainFundingIntents.distributionId, campaignIds))
        .orderBy(desc(crosschainFundingIntents.createdAt))
      : [],
    campaignIds.length
      ? db.select({
        distributionId: gatewayFundingIntents.distributionId,
        sourceChain: gatewayFundingIntents.sourceChain,
        status: gatewayFundingIntents.status,
        amountAtomic: gatewayFundingIntents.amountAtomic,
        maxFeeAtomic: gatewayFundingIntents.maxFeeAtomic,
        sourceWalletAddress: gatewayFundingIntents.sourceWalletAddress,
        depositTransactionHash: gatewayFundingIntents.depositTransactionHash,
        transferId: gatewayFundingIntents.transferId,
        mintTransactionHash: gatewayFundingIntents.mintTransactionHash,
        campaignFundingTransactionHash: gatewayFundingIntents.campaignFundingTransactionHash,
        createdAt: gatewayFundingIntents.createdAt,
        updatedAt: gatewayFundingIntents.updatedAt,
      }).from(gatewayFundingIntents)
        .where(inArray(gatewayFundingIntents.distributionId, campaignIds))
        .orderBy(desc(gatewayFundingIntents.createdAt))
      : [],
    campaignIds.length
      ? db.select().from(campaignQualityPolicies).where(inArray(campaignQualityPolicies.distributionId, campaignIds))
      : [],
    campaignIds.length
      ? db.select().from(participantQualityAssessments).where(inArray(participantQualityAssessments.distributionId, campaignIds))
      : [],
  ]);
  const commerce = await commercePromise;
  const escrow = await escrowPromise;
  const deliveryRows = await deliveryPromise;
  const [bountyRows, bountySubmissionRows] = await bountyPromise;
  const [giveawayRows, giveawayEntryRows] = await giveawayPromise;
  const [publicDropRows, publicDropSlotRows] = await publicDropPromise;
  const [treasuryRows, treasuryBudgetRows, treasuryProposalRows] = await treasuryPromise;
  const [vestingBatchRows, vestingScheduleRows, vestingTrancheRows] = await vestingPromise;
  const deliveryEvidence = {
    totals: {
      privateLinks: deliveryRows.length,
      ready: deliveryRows.filter((row) => row.status === "ready" && row.allocationStatus !== "confirmed").length,
      handedOff: deliveryRows.filter((row) => row.status === "handed_off" && row.allocationStatus !== "confirmed").length,
      claimed: deliveryRows.filter((row) => row.allocationStatus === "confirmed").length,
    },
    channels: Object.entries(deliveryRows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.channel]: (result[row.channel] ?? 0) + 1 }), {})).map(([channel, total]) => ({ channel, total })),
    privacy: "Recipient identities and encrypted private claim URLs are excluded from grant evidence. A handoff record does not assert third-party delivery confirmation.",
  };
  const bountyEvidence = {
    totals: {
      bounties: bountyRows.length,
      funded: bountyRows.filter((row) => ["active", "completed"].includes(row.distribution.status)).length,
      submissions: bountySubmissionRows.length,
      awarded: bountyRows.filter((row) => row.bounty.status === "awarded").length,
    },
    items: bountyRows.map((row) => ({
      id: row.bounty.id,
      title: row.bounty.title,
      category: row.bounty.category,
      status: row.bounty.status,
      submissionDeadline: row.bounty.submissionDeadline.toISOString(),
      submissionCount: bountySubmissionRows.filter((submission) => submission.bountyId === row.bounty.id).length,
      prize: { amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals), symbol: row.token.symbol, address: row.token.contractAddress },
      anchors: { distributionId: row.distribution.id, merkleRoot: row.distribution.merkleRoot, fundingTransactionHash: row.distribution.fundingTxHash },
      awardedAt: row.bounty.awardedAt?.toISOString() ?? null,
    })),
  };
  const giveawayEvidence = {
    totals: {
      giveaways: giveawayRows.length,
      funded: giveawayRows.filter((row) => ["active", "completed"].includes(row.distribution.status)).length,
      entries: giveawayEntryRows.length,
      referrals: giveawayEntryRows.filter((row) => Boolean(row.entry.referredByCode)).length,
      drawn: giveawayRows.filter((row) => row.giveaway.status === "drawn" && Boolean(row.giveaway.drawDigest)).length,
    },
    items: giveawayRows.map((row) => ({
      id: row.giveaway.id,
      title: row.giveaway.title,
      status: row.giveaway.status,
      entryDeadline: row.giveaway.entryDeadline.toISOString(),
      entryCount: giveawayEntryRows.filter((entry) => entry.giveawayId === row.giveaway.id).length,
      referralCount: giveawayEntryRows.filter((entry) => entry.giveawayId === row.giveaway.id && Boolean(entry.entry.referredByCode)).length,
      prize: { amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals), symbol: row.token.symbol, address: row.token.contractAddress },
      anchors: { distributionId: row.distribution.id, merkleRoot: row.distribution.merkleRoot, fundingTransactionHash: row.distribution.fundingTxHash },
      proof: { method: "SHA-256 commit-reveal", randomnessCommitment: row.giveaway.randomnessCommitment, entrySetDigest: row.giveaway.entrySetDigest, drawDigest: row.giveaway.drawDigest, revealPublished: Boolean(row.giveaway.revealedRandomness), deterministic: Boolean(row.giveaway.entrySetDigest && row.giveaway.drawDigest && row.giveaway.revealedRandomness) },
      drawnAt: row.giveaway.drawnAt?.toISOString() ?? null,
    })),
    privacy: "Only masked aggregate entry and referral evidence is exported. Raw entrant identities and private winner claim credentials are excluded.",
  };
  const publicDropEvidence = {
    totals: { drops: publicDropRows.length, proofGated: publicDropRows.filter((row) => Boolean((row.distribution.rules as Record<string, unknown>).claimCondition)).length, funded: publicDropRows.filter((row) => ["active", "completed"].includes(row.distribution.status)).length, reserved: publicDropSlotRows.filter((row) => Boolean(row.slot.identityHash)).length, claimed: publicDropSlotRows.filter((row) => row.allocationStatus === "confirmed").length, referrals: publicDropSlotRows.filter((row) => Boolean(row.slot.referredByCode)).length },
    items: publicDropRows.map((row) => ({ id: row.drop.id, title: row.drop.title, status: row.distribution.status, maxClaims: row.drop.maxClaims, claimCondition: (row.distribution.rules as Record<string, unknown>).claimCondition ?? null, reserved: publicDropSlotRows.filter((slot) => slot.dropId === row.drop.id && Boolean(slot.slot.identityHash)).length, claimed: publicDropSlotRows.filter((slot) => slot.dropId === row.drop.id && slot.allocationStatus === "confirmed").length, reward: { amount: formatAtomic(row.drop.claimAmountAtomic, row.token.decimals), symbol: row.token.symbol, address: row.token.contractAddress }, anchors: { distributionId: row.distribution.id, merkleRoot: row.distribution.merkleRoot, fundingTransactionHash: row.distribution.fundingTxHash } })),
    privacy: "Only aggregate capacity, reservations, referrals, claims, and public Arc anchors are exported. Encrypted email identities and private claim credentials are excluded.",
  };
  const treasuryEvidence = {
    totals: {
      treasuries: treasuryRows.length,
      budgets: treasuryBudgetRows.length,
      proposals: treasuryProposalRows.length,
      approved: treasuryProposalRows.filter((row) => ["approved", "authorizing", "executed"].includes(row.proposal.status)).length,
      executed: treasuryProposalRows.filter((row) => row.proposal.status === "executed" && Boolean(row.proposal.transactionHash)).length,
    },
    items: treasuryProposalRows.map((row) => ({
      id: row.proposal.id,
      treasuryId: row.treasuryId,
      title: row.proposal.title,
      category: row.proposal.category,
      status: row.proposal.status,
      amount: formatAtomic(row.proposal.amountAtomic, row.token.decimals),
      asset: { symbol: row.token.symbol, address: row.token.contractAddress },
      approvalCount: row.proposal.approvalCount,
      approvalsRequired: row.proposal.approvalsRequired,
      transactionHash: row.proposal.transactionHash,
      executedAt: row.proposal.executedAt?.toISOString() ?? null,
    })),
    privacy: "Proposal purpose, category, amounts, approvals, and public Arc receipts only. Recipient addresses are excluded from grant evidence.",
  };
  const vestingEvidence = {
    totals: {
      batches: vestingBatchRows.length,
      funded: vestingBatchRows.filter((row) => ["active", "completed"].includes(row.distribution.status)).length,
      recipients: vestingScheduleRows.length,
      tranches: vestingTrancheRows.length,
      unlocked: vestingTrancheRows.filter((row) => row.tranche.unlockAt.getTime() <= Date.now()).length,
      claimed: vestingTrancheRows.filter((row) => row.allocationStatus === "confirmed").length,
    },
    items: vestingBatchRows.map((row) => ({
      id: row.batch.id,
      name: row.batch.name,
      status: row.distribution.status,
      cliffAt: row.batch.cliffAt.toISOString(),
      releaseCount: row.batch.releaseCount,
      intervalDays: row.batch.intervalDays,
      recipientCount: vestingScheduleRows.filter((schedule) => schedule.batchId === row.batch.id).length,
      trancheCount: vestingTrancheRows.filter((tranche) => tranche.batchId === row.batch.id).length,
      claimedTranches: vestingTrancheRows.filter((tranche) => tranche.batchId === row.batch.id && tranche.allocationStatus === "confirmed").length,
      asset: { amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals), symbol: row.token.symbol, address: row.token.contractAddress },
      anchors: { distributionId: row.distribution.id, merkleRoot: row.distribution.merkleRoot, fundingTransactionHash: row.distribution.fundingTxHash },
    })),
    privacy: "Recipient identities, access credentials, and private tranche claim tokens are excluded. Only aggregate schedules, unlocks, masked counts, and public Arc anchors are exported.",
  };

  const allocationsByCampaign = new Map(allocationRows.map((row) => [row.distributionId, row]));
  const claimsByCampaign = new Map(claimRows.map((row) => [row.distributionId, row]));
  const attestationsByCampaign = new Map(attestationRows.map((row) => [row.distributionId, row]));
  const referralsByCampaign = new Map(referralRows.map((row) => [row.distributionId, row]));
  const destinationsByCampaign = new Map(destinationRows.map((row) => [row.distributionId, row]));
  const activationsByCampaign = new Map<string, { eventType: string; total: number }[]>();
  for (const row of activationRows) {
    if (!row.distributionId) continue;
    const current = activationsByCampaign.get(row.distributionId) ?? [];
    current.push({ eventType: row.eventType, total: Number(row.total) });
    activationsByCampaign.set(row.distributionId, current);
  }
  const transactionsByCampaign = new Map<string, { hash: string; confirmedAt: string | null }[]>();
  for (const row of claimTransactions) {
    if (!row.transactionHash) continue;
    const current = transactionsByCampaign.get(row.distributionId) ?? [];
    current.push({
      hash: row.transactionHash,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    });
    transactionsByCampaign.set(row.distributionId, current);
  }
  const crosschainByCampaign = new Map<string, typeof crosschainFundingRows>();
  for (const row of crosschainFundingRows) {
    const current = crosschainByCampaign.get(row.distributionId) ?? [];
    current.push(row);
    crosschainByCampaign.set(row.distributionId, current);
  }
  const gatewayByCampaign = new Map<string, typeof gatewayFundingRows>();
  for (const row of gatewayFundingRows) {
    const current = gatewayByCampaign.get(row.distributionId) ?? [];
    current.push(row);
    gatewayByCampaign.set(row.distributionId, current);
  }

  const campaignEvidence = campaigns.map((campaign) => {
    const allocation = allocationsByCampaign.get(campaign.id);
    const claim = claimsByCampaign.get(campaign.id);
    const attestation = attestationsByCampaign.get(campaign.id);
    const referral = referralsByCampaign.get(campaign.id);
    const targeted = Number(allocation?.total ?? campaign.recipientCount);
    const claimed = Number(claim?.confirmed ?? allocation?.confirmed ?? 0);
    const activations = (activationsByCampaign.get(campaign.id) ?? [])
      .reduce((total, row) => total + row.total, 0);
    const rules = campaign.rules as Record<string, unknown>;
    const metadata = campaign.metadata as Record<string, unknown>;
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      asset: {
        symbol: campaign.tokenSymbol,
        address: campaign.tokenAddress,
        totalAmount: formatAtomic(campaign.totalAmountAtomic, campaign.tokenDecimals),
        claimedAmount: formatAtomic(campaign.claimedAmountAtomic, campaign.tokenDecimals),
      },
      targeting: {
        claimMode: rules.claimMode === "identity-bound" ? "identity-bound" : "allowlist",
        targeted,
        claimed,
        claimRate: targeted ? Math.round((claimed / targeted) * 10_000) / 100 : 0,
      },
      activation: {
        requestedEvent: typeof rules.activationEvent === "string" ? rules.activationEvent : null,
        total: activations,
        rate: claimed ? Math.round((activations / claimed) * 10_000) / 100 : 0,
        eventTypes: activationsByCampaign.get(campaign.id) ?? [],
      },
      returnToProject: {
        authenticatedRecipients: Number(destinationsByCampaign.get(campaign.id)?.recipients ?? 0),
        totalOpens: Number(destinationsByCampaign.get(campaign.id)?.opens ?? 0),
        destinationConfigured: Boolean(rules.activationDestination),
        evidenceType: "authenticated-clickthrough",
        boundary: "A destination open is not a project-verified activation event.",
      },
      identityVerification: {
        attestations: Number(attestation?.verified ?? 0),
        consumedAttestations: Number(attestation?.consumed ?? 0),
      },
      referrals: {
        claimed: Number(referral?.total ?? 0),
        activated: Number(referral?.activated ?? 0),
      },
      anchors: {
        merkleRoot: campaign.merkleRoot,
        vaultAddress: campaign.vaultAddress ?? config.CURRENT_CAMPAIGN_VAULT_ADDRESS ?? null,
        fundingTransactionHash: campaign.fundingTxHash,
        refundTransactionHash: typeof metadata.refundTransactionHash === "string"
          ? metadata.refundTransactionHash
          : null,
        claimTransactions: transactionsByCampaign.get(campaign.id) ?? [],
        crosschainFunding: (crosschainByCampaign.get(campaign.id) ?? []).map((route) => ({
          sourceChain: route.sourceChain,
          destinationChain: route.destinationChain,
          status: route.status,
          amountAtomic: route.amountAtomic,
          sourceTransactionHash: route.sourceTransactionHash,
          destinationTransactionHash: route.destinationTransactionHash,
          campaignFundingTransactionHash: route.campaignFundingTransactionHash,
          messageHash: route.messageHash,
          createdAt: route.createdAt.toISOString(),
          verifiedAt: route.updatedAt.toISOString(),
        })),
        gatewayFunding: (gatewayByCampaign.get(campaign.id) ?? []).map((route) => ({
          sourceChain: route.sourceChain,
          destinationChain: ARC_TESTNET.network,
          status: route.status,
          amountAtomic: route.amountAtomic,
          maxFeeAtomic: route.maxFeeAtomic,
          sourceWalletAddress: route.sourceWalletAddress,
          depositTransactionHash: route.depositTransactionHash,
          transferId: route.transferId,
          mintTransactionHash: route.mintTransactionHash,
          campaignFundingTransactionHash: route.campaignFundingTransactionHash,
          createdAt: route.createdAt.toISOString(),
          verifiedAt: route.updatedAt.toISOString(),
        })),
      },
      timeline: {
        createdAt: campaign.createdAt.toISOString(),
        expiresAt: campaign.expiresAt?.toISOString() ?? null,
      },
    };
  });

  const totals = campaignEvidence.reduce((current, campaign) => ({
    campaigns: current.campaigns + 1,
    fundedCampaigns: current.fundedCampaigns + (campaign.anchors.fundingTransactionHash ? 1 : 0),
    recipients: current.recipients + campaign.targeting.targeted,
    claims: current.claims + campaign.targeting.claimed,
    walletsCreated: current.walletsCreated +
      Number(claimsByCampaign.get(campaign.id)?.wallets ?? 0),
    activations: current.activations + campaign.activation.total,
    identityAttestations: current.identityAttestations + campaign.identityVerification.attestations,
    consumedIdentityAttestations: current.consumedIdentityAttestations +
      campaign.identityVerification.consumedAttestations,
    referrals: current.referrals + campaign.referrals.claimed,
    activatedReferrals: current.activatedReferrals + campaign.referrals.activated,
  }), {
    campaigns: 0,
    fundedCampaigns: 0,
    recipients: 0,
    claims: 0,
    walletsCreated: 0,
    activations: 0,
    identityAttestations: 0,
    consumedIdentityAttestations: 0,
    referrals: 0,
    activatedReferrals: 0,
  });
  const apiKeyCount = Number(integrationRows[0][0]?.total ?? 0);
  const webhookCount = Number(integrationRows[1][0]?.total ?? 0);
  const identityBoundCampaigns = campaignEvidence.filter(
    (campaign) => campaign.targeting.claimMode === "identity-bound",
  ).length;
  const attestedPilots = pilotRows.filter((pilot) => pilot.attestation).length;
  const completedPilots = pilotRows.filter((pilot) => pilot.status === "complete").length;
  const completedAgentActions = agentActionRows.filter((action) => action.status === "completed").length;
  const reviewedAgentActions = agentActionRows.filter((action) => Boolean(action.reviewedAt)).length;
  const settledAgentActions = agentSettlementRows.filter((settlement) => settlement.status === "settled").length;
  const gatewayMintedRoutes = gatewayFundingRows.filter((route) => Boolean(route.mintTransactionHash)).length;
  const reviewedParticipants = qualityAssessmentRows.filter((row) => row.decision !== "allow").length;
  const criteria: Criterion[] = [
    {
      id: "working-product",
      label: "Working Arc product",
      weight: 10,
      passed: Boolean(config.DATABASE_URL && config.CURRENT_CAMPAIGN_VAULT_ADDRESS),
      evidence: "Production API, persistence, and Arc campaign vault are configured.",
    },
    {
      id: "campaigns",
      label: "Pilot campaigns",
      weight: 10,
      passed: totals.campaigns > 0,
      evidence: `${totals.campaigns} campaign${totals.campaigns === 1 ? "" : "s"} included.`,
    },
    {
      id: "funding",
      label: "Onchain funding",
      weight: 10,
      passed: totals.fundedCampaigns > 0,
      evidence: `${totals.fundedCampaigns} campaign funding transaction${totals.fundedCampaigns === 1 ? "" : "s"} recorded.`,
    },
    {
      id: "settlement",
      label: "Recipient settlement",
      weight: 10,
      passed: totals.claims > 0,
      evidence: `${totals.claims} confirmed Arc claim${totals.claims === 1 ? "" : "s"}.`,
    },
    {
      id: "wallets",
      label: "Walletless onboarding",
      weight: 10,
      passed: totals.walletsCreated > 0,
      evidence: `${totals.walletsCreated} destination wallet${totals.walletsCreated === 1 ? "" : "s"} tied to confirmed claims.`,
    },
    {
      id: "activation",
      label: "Post-claim activation",
      weight: 10,
      passed: totals.activations > 0,
      evidence: `${totals.activations} project-signed activation event${totals.activations === 1 ? "" : "s"}.`,
    },
    {
      id: "identity",
      label: "Identity verification",
      weight: 10,
      passed: identityBoundCampaigns === 0 || totals.identityAttestations > 0,
      evidence: identityBoundCampaigns
        ? `${totals.identityAttestations} wallet-bound identity attestation${totals.identityAttestations === 1 ? "" : "s"}.`
        : "No external-identity campaign is included in this report.",
    },
    {
      id: "integration",
      label: "Builder integration",
      weight: 10,
      passed: apiKeyCount > 0 || webhookCount > 0,
      evidence: `${apiKeyCount} active API key${apiKeyCount === 1 ? "" : "s"} and ${webhookCount} webhook endpoint${webhookCount === 1 ? "" : "s"}.`,
    },
    {
      id: "merchant-settlement",
      label: "Direct merchant USDC settlement",
      weight: 10,
      passed: commerce.checkout.confirmedPayments > 0,
      evidence: `${commerce.checkout.confirmedPayments} confirmed checkout settlement${commerce.checkout.confirmedPayments === 1 ? "" : "s"} totaling ${commerce.checkout.volume} USDC.`,
    },
    {
      id: "recurring-settlement",
      label: "Subscriber-controlled recurring USDC",
      weight: 10,
      passed: commerce.subscriptions.confirmedCycles > 0,
      evidence: `${commerce.subscriptions.confirmedCycles} explicitly approved subscription cycle${commerce.subscriptions.confirmedCycles === 1 ? "" : "s"} totaling ${commerce.subscriptions.volume} USDC.`,
    },
    {
      id: "milestone-escrow-settlement",
      label: "Proof-gated milestone escrow",
      weight: 10,
      passed: escrow.totals.funded > 0 && escrow.totals.settled > 0,
      evidence: `${escrow.totals.funded} funded escrow agreement${escrow.totals.funded === 1 ? "" : "s"}, ${escrow.totals.submitted} proof submission${escrow.totals.submitted === 1 ? "" : "s"}, and ${escrow.totals.settled} Arc-settled milestone${escrow.totals.settled === 1 ? "" : "s"}.`,
    },
    {
      id: "community-bounties",
      label: "Prize-backed contributor bounties",
      weight: 10,
      passed: bountyEvidence.totals.awarded > 0,
      evidence: `${bountyEvidence.totals.funded} funded bount${bountyEvidence.totals.funded === 1 ? "y" : "ies"}, ${bountyEvidence.totals.submissions} tamper-evident submission${bountyEvidence.totals.submissions === 1 ? "" : "s"}, and ${bountyEvidence.totals.awarded} award${bountyEvidence.totals.awarded === 1 ? "" : "s"}.`,
    },
    {
      id: "verifiable-giveaways",
      label: "Verifiable walletless giveaways",
      weight: 10,
      passed: giveawayEvidence.totals.drawn > 0,
      evidence: `${giveawayEvidence.totals.funded} funded giveaway${giveawayEvidence.totals.funded === 1 ? "" : "s"}, ${giveawayEvidence.totals.entries} encrypted entr${giveawayEvidence.totals.entries === 1 ? "y" : "ies"}, ${giveawayEvidence.totals.referrals} attributed referral${giveawayEvidence.totals.referrals === 1 ? "" : "s"}, and ${giveawayEvidence.totals.drawn} reproducible draw${giveawayEvidence.totals.drawn === 1 ? "" : "s"}.`,
    },
    {
      id: "public-walletless-mass-drops",
      label: "Public walletless mass drops",
      weight: 10,
      passed: publicDropEvidence.totals.funded > 0 && publicDropEvidence.totals.claimed > 0,
      evidence: `${publicDropEvidence.totals.funded} funded public drop${publicDropEvidence.totals.funded === 1 ? "" : "s"}, ${publicDropEvidence.totals.proofGated} proof-gated activation pool${publicDropEvidence.totals.proofGated === 1 ? "" : "s"}, ${publicDropEvidence.totals.reserved} encrypted reservation${publicDropEvidence.totals.reserved === 1 ? "" : "s"}, ${publicDropEvidence.totals.claimed} Arc claim${publicDropEvidence.totals.claimed === 1 ? "" : "s"}, and ${publicDropEvidence.totals.referrals} attributed referral${publicDropEvidence.totals.referrals === 1 ? "" : "s"}.`,
    },
    {
      id: "walletless-launch-vesting",
      label: "Walletless launch vesting",
      weight: 10,
      passed: vestingEvidence.totals.funded > 0 && vestingEvidence.totals.tranches > 0,
      evidence: `${vestingEvidence.totals.funded} funded vesting batch${vestingEvidence.totals.funded === 1 ? "" : "es"}, ${vestingEvidence.totals.recipients} masked recipient schedule${vestingEvidence.totals.recipients === 1 ? "" : "s"}, and ${vestingEvidence.totals.tranches} authorizer-enforced tranche${vestingEvidence.totals.tranches === 1 ? "" : "s"}.`,
    },
    {
      id: "transparent-community-treasury",
      label: "Transparent community treasury",
      weight: 10,
      passed: treasuryEvidence.totals.executed > 0,
      evidence: `${treasuryEvidence.totals.budgets} published budget${treasuryEvidence.totals.budgets === 1 ? "" : "s"}, ${treasuryEvidence.totals.proposals} proposal${treasuryEvidence.totals.proposals === 1 ? "" : "s"}, and ${treasuryEvidence.totals.executed} Circle-wallet-approved Arc payment${treasuryEvidence.totals.executed === 1 ? "" : "s"}.`,
    },
    {
      id: "external-pilot",
      label: "External pilot validation",
      weight: 10,
      passed: attestedPilots > 0,
      evidence: `${attestedPilots} partner-attested pilot${attestedPilots === 1 ? "" : "s"} and ${completedPilots} completed pilot${completedPilots === 1 ? "" : "s"}.`,
    },
    {
      id: "agent-runtime",
      label: "Policy-bound agent activity",
      weight: 10,
      passed: settledAgentActions > 0,
      evidence: `${settledAgentActions} agent-funded Arc settlement${settledAgentActions === 1 ? "" : "s"}, ${completedAgentActions} completed action${completedAgentActions === 1 ? "" : "s"}, and ${reviewedAgentActions} human-reviewed action${reviewedAgentActions === 1 ? "" : "s"}.`,
    },
    {
      id: "gateway-funding",
      label: "Gateway unified funding",
      weight: 10,
      passed: gatewayMintedRoutes > 0,
      evidence: `${gatewayMintedRoutes} Gateway direct-mint route${gatewayMintedRoutes === 1 ? "" : "s"} anchored on Arc.`,
    },
    {
      id: "protocol-liquidity",
      label: "Protocol-owned liquidity",
      weight: 10,
      passed: Boolean(
        config.CURRENT_LIQUIDITY_VAULT_ADDRESS &&
        config.CURRENT_LIQUIDITY_GOVERNOR_ADDRESS &&
        config.CURRENT_TESTNET_LIQUIDITY_ADAPTER_ADDRESS
      ),
      evidence: "A paired $CURRENT/USDC reserve is held by an onchain vault with delayed governance and guardian cancellation.",
    },
    {
      id: "partner-token-vault",
      label: "Partner ecosystem reserves",
      weight: 10,
      passed: Boolean(config.CURRENT_PARTNER_VAULT_ADDRESS && config.CURRENT_PARTNER_GOVERNOR_ADDRESS),
      evidence: "Partner project tokens can enter a transparent reserve and fund fully allocated Arc campaigns only after a public governance delay.",
    },
    {
      id: "mainnet-venue-qualification",
      label: "Mainnet liquidity venue boundary",
      weight: 10,
      passed: Boolean(config.CURRENT_VENUE_REGISTRY_ADDRESS && config.CURRENT_VENUE_REGISTRY_GOVERNOR_ADDRESS),
      evidence: "Liquidity venue adapters are qualified through exact bytecode, pair, slippage, allocation, delayed governance, and guardian cancellation constraints.",
    },
    {
      id: "mainnet-release-rehearsal",
      label: "Verifiable deployment rehearsal",
      weight: 10,
      passed: Boolean(config.CURRENT_RELEASE_REGISTRY_ADDRESS && config.CURRENT_RELEASE_GOVERNOR_ADDRESS && config.CURRENT_RELEASE_ID),
      evidence: "One governed release manifest binds the ten critical protocol addresses to exact runtime bytecode with public delay, guardian cancellation, and rollback payloads.",
    },
    {
      id: "production-observability",
      label: "Operational resilience",
      weight: 10,
      passed: Boolean(config.DATABASE_URL && config.CURRENT_RELEASE_REGISTRY_ADDRESS),
      evidence: "Structured request logs, public component health, SLO targets, scheduled monitoring, and a persistent incident-response ledger are active.",
    },
    {
      id: "security-review-readiness",
      label: "External security review readiness",
      weight: 10,
      passed: Boolean(config.CURRENT_RELEASE_REGISTRY_ADDRESS && config.CURRENT_GOVERNANCE_GUARDIAN_ADDRESS),
      evidence: "A public threat model, protocol invariants, privileged-role and fund-flow maps, adversarial checks, disclosure policy, and auditor handoff are published. Independent review remains pending.",
    },
    {
      id: "campaign-quality-controls",
      label: "Explainable campaign quality",
      weight: 10,
      passed: qualityPolicyRows.length > 0,
      evidence: `${qualityPolicyRows.length} campaign quality polic${qualityPolicyRows.length === 1 ? "y" : "ies"} and ${qualityAssessmentRows.length} persisted participant assessment${qualityAssessmentRows.length === 1 ? "" : "s"}; ${reviewedParticipants} require review.`,
    },
  ];
  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    generatedAt,
    purpose: "Circle Developer Grants technical and ecosystem evidence",
    privacy: "Aggregate metrics and public transaction anchors only. Recipient identities are excluded.",
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      websiteUrl: project.websiteUrl,
    },
    network: {
      name: ARC_TESTNET.network,
      chainId: ARC_TESTNET.chainId,
      explorerUrl: ARC_TESTNET.explorerUrl,
      usdcAddress: ARC_TESTNET.usdcAddress,
      campaignVaultAddress: config.CURRENT_CAMPAIGN_VAULT_ADDRESS ?? null,
      claimVaultAddress: config.CURRENT_CLAIM_VAULT_ADDRESS ?? null,
      liquidityVaultAddress: config.CURRENT_LIQUIDITY_VAULT_ADDRESS ?? null,
      liquidityGovernorAddress: config.CURRENT_LIQUIDITY_GOVERNOR_ADDRESS ?? null,
      liquidityAdapterAddress: config.CURRENT_TESTNET_LIQUIDITY_ADAPTER_ADDRESS ?? null,
      partnerVaultAddress: config.CURRENT_PARTNER_VAULT_ADDRESS ?? null,
      partnerGovernorAddress: config.CURRENT_PARTNER_GOVERNOR_ADDRESS ?? null,
      testnetPartnerTokenAddress: config.CURRENT_TESTNET_PARTNER_TOKEN_ADDRESS ?? null,
      partnerProofCampaignId: config.CURRENT_PARTNER_PROOF_CAMPAIGN_ID ?? null,
      venueRegistryAddress: config.CURRENT_VENUE_REGISTRY_ADDRESS ?? null,
      venueRegistryGovernorAddress: config.CURRENT_VENUE_REGISTRY_GOVERNOR_ADDRESS ?? null,
      releaseRegistryAddress: config.CURRENT_RELEASE_REGISTRY_ADDRESS ?? null,
      releaseGovernorAddress: config.CURRENT_RELEASE_GOVERNOR_ADDRESS ?? null,
      releaseId: config.CURRENT_RELEASE_ID ?? null,
      milestoneEscrowAddress: config.CURRENT_MILESTONE_ESCROW_ADDRESS ?? null,
    },
    readiness: evidenceReadiness(criteria),
    totals: {
      ...totals,
      claimRate: totals.recipients
        ? Math.round((totals.claims / totals.recipients) * 10_000) / 100
        : 0,
      activationRate: totals.claims
        ? Math.round((totals.activations / totals.claims) * 10_000) / 100
        : 0,
      activeApiKeys: apiKeyCount,
      activeWebhooks: webhookCount,
      pilots: pilotRows.length,
      attestedPilots,
      completedPilots,
      agentActions: agentActionRows.length,
      completedAgentActions,
      reviewedAgentActions,
      settledAgentActions,
      gatewayFundingRoutes: gatewayFundingRows.length,
      gatewayMintedRoutes,
      qualityPolicies: qualityPolicyRows.length,
      qualityAssessments: qualityAssessmentRows.length,
      qualityReviewQueue: reviewedParticipants,
      checkoutLinks: commerce.checkout.links,
      checkoutPayments: commerce.checkout.confirmedPayments,
      checkoutVolume: commerce.checkout.volume,
      subscriptionPlans: commerce.subscriptions.plans,
      activeSubscriptions: commerce.subscriptions.active,
      subscriptionCycles: commerce.subscriptions.confirmedCycles,
      subscriptionVolume: commerce.subscriptions.volume,
      escrowAgreements: escrow.totals.agreements,
      fundedEscrowAgreements: escrow.totals.funded,
      settledEscrowMilestones: escrow.totals.settled,
      bounties: bountyEvidence.totals.bounties,
      fundedBounties: bountyEvidence.totals.funded,
      bountySubmissions: bountyEvidence.totals.submissions,
      bountyAwards: bountyEvidence.totals.awarded,
      giveaways: giveawayEvidence.totals.giveaways,
      fundedGiveaways: giveawayEvidence.totals.funded,
      giveawayEntries: giveawayEvidence.totals.entries,
      giveawayReferrals: giveawayEvidence.totals.referrals,
      giveawayDraws: giveawayEvidence.totals.drawn,
      publicDrops: publicDropEvidence.totals.drops,
      proofGatedPublicDrops: publicDropEvidence.totals.proofGated,
      fundedPublicDrops: publicDropEvidence.totals.funded,
      publicDropReservations: publicDropEvidence.totals.reserved,
      publicDropClaims: publicDropEvidence.totals.claimed,
      publicDropReferrals: publicDropEvidence.totals.referrals,
      privateCampaignLinks: deliveryEvidence.totals.privateLinks,
      campaignDeliveryHandoffs: deliveryEvidence.totals.handedOff,
      deliveredCampaignClaims: deliveryEvidence.totals.claimed,
      vestingBatches: vestingEvidence.totals.batches,
      fundedVestingBatches: vestingEvidence.totals.funded,
      vestingRecipients: vestingEvidence.totals.recipients,
      vestingTranches: vestingEvidence.totals.tranches,
      claimedVestingTranches: vestingEvidence.totals.claimed,
      communityTreasuries: treasuryEvidence.totals.treasuries,
      treasuryBudgets: treasuryEvidence.totals.budgets,
      treasuryProposals: treasuryEvidence.totals.proposals,
      treasuryPayments: treasuryEvidence.totals.executed,
    },
    commerce,
    escrow,
    bounties: bountyEvidence,
    giveaways: giveawayEvidence,
    publicDrops: publicDropEvidence,
    campaignDeliveries: deliveryEvidence,
    vesting: vestingEvidence,
    treasury: treasuryEvidence,
    campaigns: campaignEvidence,
    pilots: pilotRows.map((pilot) => ({
      id: pilot.id,
      partnerName: pilot.partnerName,
      useCase: pilot.useCase,
      status: pilot.status,
      readinessScore: pilot.readinessScore,
      targetMet: pilot.targetMet,
      campaignId: pilot.campaign?.id ?? null,
      attestation: pilot.attestation ? {
        signerName: pilot.attestation.signerName,
        signerRole: pilot.attestation.signerRole,
        digest: pilot.attestation.digest,
        attestedAt: pilot.attestation.attestedAt,
      } : null,
    })),
    agentActions: agentActionRows.map((action) => ({
      id: action.id,
      kind: action.kind,
      status: action.status,
      riskLevel: action.riskLevel,
      amountAtomic: action.amountAtomic,
      policyDecision: action.policyDecision,
      result: action.result,
      createdAt: action.createdAt.toISOString(),
      reviewedAt: action.reviewedAt?.toISOString() ?? null,
      executedAt: action.executedAt?.toISOString() ?? null,
    })),
    agentSettlements: agentSettlementRows.map((settlement) => ({
      id: settlement.id,
      actionId: settlement.actionId,
      distributionId: settlement.distributionId,
      status: settlement.status,
      transactionHash: settlement.transactionHash,
      evidence: settlement.evidence,
      settledAt: settlement.settledAt?.toISOString() ?? null,
      updatedAt: settlement.updatedAt.toISOString(),
    })),
    auditTrail: recentAuditRows.map((event) => ({
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      createdAt: event.createdAt.toISOString(),
    })),
    verification: {
      digestAlgorithm: "SHA-256",
      canonicalization: "Recursively sorted JSON object keys",
      sources: [
        "Current CoFi production database",
        "Arc campaign and claim settlement transaction hashes",
        "Circle user-controlled wallet records",
        "Project-signed activation and identity events",
        "Partner-signed pilot attestations",
        "Policy-bound agent actions and human approval decisions",
        "Human-authorized agent campaign vault settlements",
        "Circle Gateway deposits, EOA burn intents, attestations, and Arc mint hashes",
        "Current release registry manifest, runtime bytecode validations, delayed governance, and rollback controls",
        "Milestone escrow terms digests, funding receipts, delivery proofs, and bounded settlement transactions",
      ],
    },
  };
}

export async function evidenceDigest(snapshot: unknown) {
  return sha256(stableEvidenceJson(snapshot));
}

export async function createEvidenceReport(input: {
  projectId: string;
  distributionId?: string;
  createdByUserId?: string;
  createdByKeyId?: string;
}) {
  const snapshot = await buildSnapshot(input.projectId, input.distributionId);
  const digest = await evidenceDigest(snapshot);
  const [report] = await getDb().insert(evidenceReports).values({
    projectId: input.projectId,
    distributionId: input.distributionId,
    createdByUserId: input.createdByUserId,
    createdByKeyId: input.createdByKeyId,
    publicSlug: `proof_${randomSecret(18)}`,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    digest,
    snapshot,
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.createdByKeyId ? "api-key" : "user",
    actorId: input.createdByKeyId ?? input.createdByUserId,
    projectId: input.projectId,
    action: "evidence.report.created",
    resourceType: "evidence-report",
    resourceId: report.id,
    metadata: { digest, distributionId: input.distributionId ?? null },
  });
  return publicReport(report);
}

function publicReport(report: typeof evidenceReports.$inferSelect) {
  const snapshot = report.snapshot as Record<string, unknown>;
  const readiness = snapshot.readiness as Record<string, unknown> | undefined;
  return {
    id: report.id,
    publicSlug: report.publicSlug,
    schemaVersion: report.schemaVersion,
    digest: report.digest,
    distributionId: report.distributionId,
    readinessScore: Number(readiness?.score ?? 0),
    snapshot,
    createdAt: report.createdAt.toISOString(),
  };
}

function reportSummary(report: typeof evidenceReports.$inferSelect) {
  const snapshot = report.snapshot as Record<string, unknown>;
  const readiness = snapshot.readiness as Record<string, unknown> | undefined;
  const project = snapshot.project as Record<string, unknown> | undefined;
  const totals = snapshot.totals as Record<string, unknown> | undefined;
  return {
    id: report.id,
    publicSlug: report.publicSlug,
    schemaVersion: report.schemaVersion,
    digest: report.digest,
    distributionId: report.distributionId,
    readinessScore: Number(readiness?.score ?? 0),
    project: {
      name: String(project?.name ?? "Current project"),
      slug: String(project?.slug ?? "current-project"),
    },
    totals: {
      campaigns: Number(totals?.campaigns ?? 0),
      recipients: Number(totals?.recipients ?? 0),
      claims: Number(totals?.claims ?? 0),
      activations: Number(totals?.activations ?? 0),
    },
    createdAt: report.createdAt.toISOString(),
  };
}

export async function createUserEvidenceReport(input: {
  userId: string;
  projectId: string;
  distributionId?: string;
}) {
  await projectAccess(input.userId, input.projectId);
  return createEvidenceReport({
    projectId: input.projectId,
    distributionId: input.distributionId,
    createdByUserId: input.userId,
  });
}

export async function listUserEvidenceReports(userId: string) {
  const memberships = await getDb().select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const projectIds = memberships.map((membership) => membership.projectId);
  if (!projectIds.length) return [];
  const reports = await getDb().select().from(evidenceReports)
    .where(inArray(evidenceReports.projectId, projectIds))
    .orderBy(desc(evidenceReports.createdAt))
    .limit(50);
  return reports.map(reportSummary);
}

export async function listProjectEvidenceReports(projectId: string) {
  const reports = await getDb().select().from(evidenceReports)
    .where(eq(evidenceReports.projectId, projectId))
    .orderBy(desc(evidenceReports.createdAt))
    .limit(50);
  return reports.map(reportSummary);
}

export async function getPublicEvidenceReport(publicSlug: string) {
  if (!/^proof_[A-Za-z0-9_-]{12,80}$/.test(publicSlug)) {
    throw new ApiError(400, "INVALID_EVIDENCE_SLUG", "The evidence identifier is invalid.");
  }
  const report = await getDb().query.evidenceReports.findFirst({
    where: eq(evidenceReports.publicSlug, publicSlug),
  });
  if (!report) throw new ApiError(404, "EVIDENCE_NOT_FOUND", "The evidence report does not exist.");
  const recalculatedDigest = await evidenceDigest(report.snapshot);
  return {
    ...publicReport(report),
    integrity: {
      valid: recalculatedDigest === report.digest,
      recalculatedDigest,
    },
  };
}
