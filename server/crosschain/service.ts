import { and, desc, eq } from "drizzle-orm";
import { pad, type Address } from "viem";
import type { CurrentSession } from "../auth/session.js";
import {
  createUserContractExecutionChallenge,
  createUserWalletChallenge,
  getUserChallenge,
  listUserWallets,
} from "../circle/client.js";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import { crosschainFundingIntents, distributions, tokens } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";
import {
  arcFundingDestination,
  CCTP_FORWARD_HOOK,
  CCTP_TOKEN_MESSENGER_V2,
  fundingChain,
  fundingChains,
} from "./chains.js";

const IRIS = "https://iris-api-sandbox.circle.com";

function serialize(row: typeof crosschainFundingIntents.$inferSelect) {
  const source = fundingChain(row.sourceChain);
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    source: { ...source, transactionUrl: row.sourceTransactionHash ? `${source.explorer}/tx/${row.sourceTransactionHash}` : null },
    destination: {
      ...arcFundingDestination,
      transactionUrl: row.destinationTransactionHash
        ? `${arcFundingDestination.explorer}/tx/${row.destinationTransactionHash}`
        : null,
    },
    stages: [
      { id: "route", label: "Route created", complete: true },
      { id: "source", label: "USDC burned on source", complete: Boolean(row.sourceTransactionHash) },
      { id: "arc", label: "USDC received on Arc", complete: Boolean(row.destinationTransactionHash) },
      { id: "vault", label: "Campaign vault funded", complete: row.status === "complete" },
    ],
  };
}

async function ownedUsdcCampaign(distributionId: string, userId: string) {
  const [row] = await getDb().select({
    id: distributions.id,
    projectId: distributions.projectId,
    status: distributions.status,
    amountAtomic: distributions.totalAmountAtomic,
    fundingTxHash: distributions.fundingTxHash,
    tokenAddress: tokens.contractAddress,
    symbol: tokens.symbol,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(eq(distributions.id, distributionId), eq(distributions.creatorUserId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign was not found.");
  if (row.tokenAddress.toLowerCase() !== ARC_TESTNET.usdcAddress.toLowerCase() && row.symbol.toUpperCase() !== "USDC") {
    throw new ApiError(409, "USDC_ROUTE_REQUIRED", "Crosschain campaign funding currently supports USDC campaigns.");
  }
  return row;
}

async function cctpQuote(sourceDomain: number, amountAtomic: bigint) {
  const response = await fetch(
    `${IRIS}/v2/burn/USDC/fees/${sourceDomain}/${ARC_TESTNET.gatewayDomain}?forward=true`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new ApiError(502, "CCTP_QUOTE_FAILED", "Circle could not quote this route.");
  const fees = await response.json() as Array<{
    finalityThreshold: number;
    minimumFee: number;
    forwardFee?: { low: number; med: number; high: number };
  }>;
  const standard = fees.find((item) => item.finalityThreshold === 2000) ?? fees.at(-1);
  if (!standard?.forwardFee) throw new ApiError(502, "CCTP_ROUTE_UNAVAILABLE", "Circle forwarding is unavailable for this route.");
  const feeDenominator = BigInt(100_000);
  const feeNumerator = amountAtomic * BigInt(Math.ceil(standard.minimumFee * 10));
  const protocolFeeAtomic = (feeNumerator + feeDenominator - BigInt(1)) / feeDenominator;
  const forwardFeeAtomic = BigInt(Math.ceil(standard.forwardFee.med));
  return {
    finalityThreshold: standard.finalityThreshold,
    protocolFeeAtomic,
    forwardFeeAtomic,
    totalBurnAtomic: amountAtomic + protocolFeeAtomic + forwardFeeAtomic,
  };
}

export function crosschainCatalog() {
  return {
    sourceChains: fundingChains,
    destination: arcFundingDestination,
    transport: "CCTP V2 Standard + Forwarding Service",
    finalityThreshold: 2000,
    asset: "USDC",
  };
}

export async function listFundingIntents(userId: string) {
  const rows = await getDb().select().from(crosschainFundingIntents)
    .where(eq(crosschainFundingIntents.userId, userId))
    .orderBy(desc(crosschainFundingIntents.createdAt))
    .limit(50);
  return rows.map(serialize);
}

export async function listProjectFundingIntents(projectId: string) {
  const rows = await getDb().select().from(crosschainFundingIntents)
    .where(eq(crosschainFundingIntents.projectId, projectId))
    .orderBy(desc(crosschainFundingIntents.createdAt))
    .limit(100);
  return { catalog: crosschainCatalog(), intents: rows.map(serialize) };
}

export async function createFundingIntent(
  userId: string,
  session: CurrentSession,
  distributionId: string,
  sourceChainCode: string,
  idempotencyKey: string,
) {
  const campaign = await ownedUsdcCampaign(distributionId, userId);
  if (campaign.status !== "awaiting_funding") {
    throw new ApiError(409, "CAMPAIGN_NOT_FUNDABLE", "Choose a USDC campaign that is awaiting funding.");
  }
  const source = fundingChain(sourceChainCode);
  const destination = arcWallet(session);
  const quote = await cctpQuote(source.domain, BigInt(campaign.amountAtomic));
  const [row] = await getDb().insert(crosschainFundingIntents).values({
    projectId: campaign.projectId,
    distributionId,
    userId,
    sourceChain: source.code,
    sourceDomain: source.domain,
    sourceUsdcAddress: source.usdcAddress.toLowerCase(),
    destinationAddress: destination.address.toLowerCase(),
    amountAtomic: campaign.amountAtomic,
    protocolFeeAtomic: quote.protocolFeeAtomic.toString(),
    forwardFeeAtomic: quote.forwardFeeAtomic.toString(),
    totalBurnAtomic: quote.totalBurnAtomic.toString(),
    idempotencyKey,
    evidence: {
      circleRoute: "CCTP V2 Standard + Forwarding Service",
      finalityThreshold: quote.finalityThreshold,
      quotedAt: new Date().toISOString(),
    },
  }).onConflictDoNothing().returning();
  const intent = row ?? await getDb().query.crosschainFundingIntents.findFirst({
    where: and(
      eq(crosschainFundingIntents.projectId, campaign.projectId),
      eq(crosschainFundingIntents.idempotencyKey, idempotencyKey),
    ),
  });
  if (!intent) throw new ApiError(409, "FUNDING_INTENT_CONFLICT", "This route could not be created.");
  await queueWebhookEvent(campaign.projectId, "crosschain.funding.created", {
    intentId: intent.id,
    distributionId,
    sourceChain: source.code,
    destinationChain: ARC_TESTNET.network,
    amountAtomic: campaign.amountAtomic,
  });
  await deliverQueuedWebhooks(10);
  return serialize(intent);
}

export async function prepareSourceWallet(
  request: Request,
  session: CurrentSession,
  intentId: string,
  challengeId?: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const existing = session.wallets.find((wallet) => wallet.blockchain === intent.sourceChain);
  if (existing) {
    await getDb().update(crosschainFundingIntents).set({
      sourceWalletId: existing.id,
      status: "wallet_ready",
      updatedAt: new Date(),
    }).where(eq(crosschainFundingIntents.id, intent.id));
    return { complete: true, wallet: existing, wallets: session.wallets };
  }
  if (!challengeId) {
    const challenge = await createUserWalletChallenge(request, session.userToken, intent.sourceChain);
    await getDb().update(crosschainFundingIntents).set({
      sourceChallengeId: challenge.challengeId,
      status: "wallet_authorizing",
      updatedAt: new Date(),
    }).where(eq(crosschainFundingIntents.id, intent.id));
    return { complete: false, challengeId: challenge.challengeId };
  }
  if (intent.sourceChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the funding route.");
  }
  const result = await getUserChallenge(request, session.userToken, challengeId);
  if (result.status !== "COMPLETE" && result.status !== "COMPLETED") {
    return { pending: true, challengeStatus: result.status };
  }
  const wallets = await listUserWallets(request, session.userToken);
  const wallet = wallets.find((item) => item.blockchain === intent.sourceChain);
  if (!wallet) return { pending: true, challengeStatus: result.status };
  await getDb().update(crosschainFundingIntents).set({
    sourceWalletId: wallet.id,
    status: "wallet_ready",
    updatedAt: new Date(),
  }).where(eq(crosschainFundingIntents.id, intent.id));
  return { complete: true, wallet, wallets };
}

export async function prepareBridgeChallenge(
  request: Request,
  session: CurrentSession,
  intentId: string,
  action: "approve" | "burn",
  challengeId?: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const wallet = session.wallets.find((item) => item.blockchain === intent.sourceChain);
  if (!wallet || intent.sourceWalletId !== wallet.id) {
    throw new ApiError(409, "SOURCE_WALLET_REQUIRED", "Create the source-network wallet before bridging.");
  }
  const evidence = intent.evidence as Record<string, unknown>;
  const evidenceKey = action === "approve" ? "approvalChallengeId" : "burnChallengeId";
  if (challengeId) {
    if (evidence[evidenceKey] !== challengeId) {
      throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the funding route.");
    }
    const result = await circleChallengeResult(request, session, challengeId);
    if (result.pending) return result;
    const patch = action === "burn"
      ? { sourceTransactionHash: result.transactionHash, status: "source_confirmed" }
      : { status: "approved" };
    const [updated] = await getDb().update(crosschainFundingIntents).set({
      ...patch,
      evidence: { ...evidence, [`${action}TransactionHash`]: result.transactionHash },
      updatedAt: new Date(),
    }).where(eq(crosschainFundingIntents.id, intent.id)).returning();
    if (action === "burn") {
      await queueWebhookEvent(intent.projectId, "crosschain.funding.source-confirmed", {
        intentId: intent.id,
        distributionId: intent.distributionId,
        sourceChain: intent.sourceChain,
        transactionHash: result.transactionHash,
      });
      await deliverQueuedWebhooks(10);
    }
    return { ...result, intent: serialize(updated) };
  }
  const destinationBytes32 = pad(intent.destinationAddress as Address, { size: 32 });
  const parameters = action === "approve"
    ? {
      contractAddress: intent.sourceUsdcAddress,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [CCTP_TOKEN_MESSENGER_V2, intent.totalBurnAtomic],
    }
    : {
      contractAddress: CCTP_TOKEN_MESSENGER_V2,
      abiFunctionSignature: "depositForBurnWithHook(uint256,uint32,bytes32,address,bytes32,uint256,uint32,bytes)",
      abiParameters: [
        intent.totalBurnAtomic,
        intent.destinationDomain,
        destinationBytes32,
        intent.sourceUsdcAddress,
        pad("0x", { size: 32 }),
        (BigInt(intent.protocolFeeAtomic) + BigInt(intent.forwardFeeAtomic)).toString(),
        2000,
        CCTP_FORWARD_HOOK,
      ],
    };
  const challenge = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    ...parameters,
    refId: `crosschain-${action}-${intent.id}`.slice(0, 100),
  });
  await getDb().update(crosschainFundingIntents).set({
    status: action === "approve" ? "approving" : "source_authorizing",
    evidence: { ...evidence, [evidenceKey]: challenge.challengeId },
    updatedAt: new Date(),
  }).where(eq(crosschainFundingIntents.id, intent.id));
  return { complete: false, action, challengeId: challenge.challengeId };
}

export async function syncFundingIntent(userId: string, intentId: string) {
  const intent = await ownedIntent(intentId, userId);
  if (intent.status === "complete") return serialize(intent);
  if (intent.sourceTransactionHash && !intent.destinationTransactionHash) {
    const response = await fetch(
      `${IRIS}/v2/messages/${intent.sourceDomain}?transactionHash=${encodeURIComponent(intent.sourceTransactionHash)}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) },
    );
    if (response.ok) {
      const payload = await response.json() as {
        messages?: Array<{ forwardTxHash?: string; messageHash?: string; status?: string }>;
      };
      const message = payload.messages?.[0];
      if (message?.forwardTxHash) {
        const [updated] = await getDb().update(crosschainFundingIntents).set({
          destinationTransactionHash: message.forwardTxHash,
          messageHash: message.messageHash,
          status: "arc_arrived",
          evidence: {
            ...(intent.evidence as Record<string, unknown>),
            irisStatus: message.status ?? "forwarded",
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        }).where(eq(crosschainFundingIntents.id, intent.id)).returning();
        await queueWebhookEvent(intent.projectId, "crosschain.funding.arc-arrived", {
          intentId: intent.id,
          distributionId: intent.distributionId,
          transactionHash: message.forwardTxHash,
          network: ARC_TESTNET.network,
        });
        await deliverQueuedWebhooks(10);
        return serialize(updated);
      }
    }
  }
  if (intent.destinationTransactionHash && intent.fundingTxHash) {
    const [updated] = await getDb().update(crosschainFundingIntents).set({
      campaignFundingTransactionHash: intent.fundingTxHash,
      status: "complete",
      updatedAt: new Date(),
    }).where(eq(crosschainFundingIntents.id, intent.id)).returning();
    await queueWebhookEvent(intent.projectId, "crosschain.funding.campaign-funded", {
      intentId: intent.id,
      distributionId: intent.distributionId,
      transactionHash: intent.fundingTxHash,
    });
    await deliverQueuedWebhooks(10);
    return serialize(updated);
  }
  return serialize(intent);
}

async function ownedIntent(intentId: string, userId?: string) {
  if (!userId) throw new ApiError(401, "NOT_AUTHENTICATED", "Sign in to continue.");
  const [row] = await getDb().select({
    intent: crosschainFundingIntents,
    fundingTxHash: distributions.fundingTxHash,
  }).from(crosschainFundingIntents)
    .innerJoin(distributions, eq(distributions.id, crosschainFundingIntents.distributionId))
    .where(and(eq(crosschainFundingIntents.id, intentId), eq(crosschainFundingIntents.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "FUNDING_ROUTE_NOT_FOUND", "This funding route was not found.");
  return { ...row.intent, fundingTxHash: row.fundingTxHash };
}
