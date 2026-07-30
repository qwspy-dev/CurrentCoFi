import { and, eq, ne, sql } from "drizzle-orm";
import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { CurrentSession } from "../auth/session.js";
import {
  createUserContractExecutionChallenge,
  getUserChallenge,
  getUserTransaction,
} from "../circle/client.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import { allocations, claims, distributions, tokens, wallets } from "../db/schema.js";
import { ApiError } from "../http.js";
import { parseClaimToken } from "../security/crypto.js";
import { buildCampaignTree, contractAllocationId } from "./merkle.js";
import { campaignAllocations } from "./repository.js";

const FINAL_TRANSACTION_STATES = new Set(["COMPLETE", "CONFIRMED"]);
const FAILED_TRANSACTION_STATES = new Set(["FAILED", "DENIED", "CANCELLED"]);

function config() {
  const value = getServerConfig();
  if (!value.CURRENT_CAMPAIGN_VAULT_ADDRESS || !value.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY) {
    throw new ApiError(503, "CAMPAIGN_SETTLEMENT_NOT_CONFIGURED", "Campaign settlement is not configured yet.");
  }
  return {
    vaultAddress: value.CURRENT_CAMPAIGN_VAULT_ADDRESS as Address,
    authorizerKey: value.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY,
  };
}

export function contractCampaignId(distributionId: string) {
  return keccak256(stringToHex(distributionId));
}

function arcWallet(session: CurrentSession) {
  const wallet = session.wallets.find((item) => item.blockchain === ARC_TESTNET.network);
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet to continue.");
  return wallet;
}

async function challengeResult(request: Request, session: CurrentSession, challengeId: string) {
  const challenge = await getUserChallenge(request, session.userToken, challengeId);
  if (challenge.status === "FAILED" || challenge.status === "EXPIRED") {
    throw new ApiError(409, "WALLET_ACTION_FAILED", challenge.errorMessage ?? "The wallet action failed.");
  }
  if (challenge.status !== "COMPLETED" && challenge.status !== "COMPLETE") {
    return { pending: true as const, challengeStatus: challenge.status };
  }
  const transactionId = challenge.correlationIds?.[0];
  if (!transactionId) return { pending: true as const, challengeStatus: challenge.status };
  const transaction = await getUserTransaction(request, session.userToken, transactionId);
  if (FAILED_TRANSACTION_STATES.has(transaction.state)) {
    throw new ApiError(
      409,
      "ARC_TRANSACTION_FAILED",
      transaction.errorReason ?? transaction.errorDetails ?? "The Arc transaction failed.",
    );
  }
  if (!FINAL_TRANSACTION_STATES.has(transaction.state)) {
    return { pending: true as const, challengeStatus: challenge.status, transactionState: transaction.state };
  }
  return {
    pending: false as const,
    transactionId,
    transactionHash: transaction.txHash ?? null,
    transactionState: transaction.state,
  };
}

async function ownedCampaign(distributionId: string, userId: string) {
  const [row] = await getDb().select({
    id: distributions.id,
    status: distributions.status,
    amountAtomic: distributions.totalAmountAtomic,
    claimedAmountAtomic: distributions.claimedAmountAtomic,
    recipientCount: distributions.recipientCount,
    expiresAt: distributions.expiresAt,
    merkleRoot: distributions.merkleRoot,
    fundingTxHash: distributions.fundingTxHash,
    metadata: distributions.metadata,
    tokenAddress: tokens.contractAddress,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(
      eq(distributions.id, distributionId),
      eq(distributions.creatorUserId, userId),
      eq(distributions.kind, "merkle-campaign"),
    ))
    .limit(1);
  if (!row) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign was not found.");
  if (!row.expiresAt || !row.merkleRoot) {
    throw new ApiError(409, "CAMPAIGN_INVALID", "This campaign is missing its settlement data.");
  }
  return { ...row, expiresAt: row.expiresAt, merkleRoot: row.merkleRoot as Hex };
}

export async function createCampaignFundingChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "approve" | "deposit",
) {
  const settlement = config();
  const wallet = arcWallet(session);
  const row = await ownedCampaign(distributionId, userId);
  if (row.status === "active") {
    return { complete: true, status: row.status, transactionHash: row.fundingTxHash };
  }
  if (row.status !== "awaiting_funding") {
    throw new ApiError(409, "CAMPAIGN_NOT_FUNDABLE", "This campaign is not awaiting funding.");
  }
  const parameters = action === "approve"
    ? {
      contractAddress: row.tokenAddress,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [settlement.vaultAddress, row.amountAtomic],
    }
    : {
      contractAddress: settlement.vaultAddress,
      abiFunctionSignature: "fundCampaign(bytes32,address,uint256,uint64,uint32,bytes32)",
      abiParameters: [
        contractCampaignId(row.id),
        row.tokenAddress,
        row.amountAtomic,
        Math.floor(row.expiresAt.getTime() / 1_000).toString(),
        row.recipientCount,
        row.merkleRoot,
      ],
    };
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    ...parameters,
    refId: `campaign-${action}-${row.id}`.slice(0, 100),
  });
  const metadata = row.metadata as Record<string, unknown>;
  await getDb().update(distributions).set({
    vaultAddress: settlement.vaultAddress.toLowerCase(),
    metadata: {
      ...metadata,
      contractCampaignId: contractCampaignId(row.id),
      [`${action}ChallengeId`]: challengeId,
    },
    updatedAt: new Date(),
  }).where(eq(distributions.id, row.id));
  return { complete: false, action, challengeId };
}

export async function confirmCampaignFundingChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "approve" | "deposit",
  challengeId: string,
) {
  const row = await ownedCampaign(distributionId, userId);
  const metadata = row.metadata as Record<string, unknown>;
  if (metadata[`${action}ChallengeId`] !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the campaign.");
  }
  const result = await challengeResult(request, session, challengeId);
  if (result.pending) return result;
  if (action === "deposit") {
    await getDb().update(distributions).set({
      status: "active",
      fundingTxHash: result.transactionHash,
      updatedAt: new Date(),
      metadata: { ...metadata, fundedAt: new Date().toISOString() },
    }).where(eq(distributions.id, distributionId));
  }
  return { ...result, status: action === "deposit" ? "active" : "approved" };
}

async function campaignClaimRow(tokenValue: string, allowCompleted = false) {
  const { allocationId, secret } = await parseClaimToken(tokenValue);
  const [row] = await getDb().select({
    allocationId: allocations.id,
    allocationIndex: allocations.merkleIndex,
    allocationStatus: allocations.status,
    storedSecretHash: allocations.claimSecretHash,
    amountAtomic: allocations.amountAtomic,
    distributionId: distributions.id,
    distributionStatus: distributions.status,
    expiresAt: distributions.expiresAt,
    kind: distributions.kind,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  const valid = row?.storedSecretHash &&
    /^0x[0-9a-f]{64}$/i.test(secret) &&
    row.storedSecretHash === keccak256(secret as Hex);
  if (!row || !valid || row.kind !== "merkle-campaign" || row.allocationIndex === null) {
    throw new ApiError(404, "CLAIM_NOT_FOUND", "This campaign claim link is invalid.");
  }
  if (row.distributionStatus !== "active" && !(allowCompleted && row.distributionStatus === "completed")) {
    throw new ApiError(409, "CLAIM_NOT_FUNDED", "This campaign has not been funded or is no longer active.");
  }
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "CLAIM_EXPIRED", "This campaign claim has expired.");
  }
  return { ...row, allocationIndex: row.allocationIndex };
}

export async function createCampaignClaimChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  tokenValue: string,
) {
  const settlement = config();
  const sessionWallet = arcWallet(session);
  const db = getDb();
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.address, sessionWallet.address.toLowerCase())),
  });
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Your Arc wallet is not ready.");
  const row = await campaignClaimRow(tokenValue);
  const existing = await db.query.claims.findFirst({ where: eq(claims.allocationId, row.allocationId) });
  if (existing?.status === "confirmed") {
    return { complete: true, status: "confirmed", transactionHash: existing.transactionHash };
  }
  if (row.allocationStatus !== "available" && !existing) {
    throw new ApiError(409, "CLAIM_UNAVAILABLE", "This claim is already being processed.");
  }
  const allAllocations = await campaignAllocations(row.distributionId);
  if (allAllocations.some((allocation) => allocation.index === null)) {
    throw new ApiError(409, "CAMPAIGN_INVALID", "This campaign contains an invalid allocation.");
  }
  const tree = buildCampaignTree(allAllocations.map((allocation) => ({
    allocationId: allocation.allocationId,
    index: allocation.index!,
    amountAtomic: allocation.amountAtomic,
  })));
  const authorizationDeadline = Math.floor(Date.now() / 1_000) + 15 * 60;
  const digest = keccak256(encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint64" },
    ],
    [
      settlement.vaultAddress,
      BigInt(ARC_TESTNET.chainId),
      contractCampaignId(row.distributionId),
      BigInt(row.allocationIndex),
      contractAllocationId(row.allocationId),
      sessionWallet.address as Address,
      BigInt(row.amountAtomic),
      BigInt(authorizationDeadline),
    ],
  ));
  const authorization = await privateKeyToAccount(settlement.authorizerKey)
    .signMessage({ message: { raw: digest } });
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: sessionWallet.id,
    contractAddress: settlement.vaultAddress,
    abiFunctionSignature: "claim(bytes32,uint256,bytes32,uint256,address,uint64,bytes32[],bytes)",
    abiParameters: [
      contractCampaignId(row.distributionId),
      row.allocationIndex.toString(),
      contractAllocationId(row.allocationId),
      row.amountAtomic,
      sessionWallet.address,
      authorizationDeadline.toString(),
      tree.proof(row.allocationIndex),
      authorization,
    ],
    refId: `campaign-claim-${row.allocationId}`.slice(0, 100),
  });
  const claimMetadata = { challengeId, authorizationDeadline, merkleProof: tree.proof(row.allocationIndex) };
  if (existing) {
    await db.update(claims).set({
      status: "authorizing",
      failureCode: null,
      metadata: claimMetadata,
      updatedAt: new Date(),
    }).where(eq(claims.id, existing.id));
  } else {
    const locked = await db.update(allocations).set({
      status: "authorizing",
      walletAddress: sessionWallet.address.toLowerCase(),
      updatedAt: new Date(),
    }).where(and(eq(allocations.id, row.allocationId), eq(allocations.status, "available"))).returning();
    if (!locked.length) throw new ApiError(409, "CLAIM_UNAVAILABLE", "This claim is already being processed.");
    await db.insert(claims).values({
      allocationId: row.allocationId,
      claimantUserId: userId,
      destinationWalletId: wallet.id,
      status: "authorizing",
      metadata: claimMetadata,
    });
  }
  return { complete: false, challengeId };
}

export async function confirmCampaignClaimChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  tokenValue: string,
  challengeId: string,
) {
  const row = await campaignClaimRow(tokenValue, true);
  const db = getDb();
  const claim = await db.query.claims.findFirst({
    where: and(eq(claims.allocationId, row.allocationId), eq(claims.claimantUserId, userId)),
  });
  if (claim?.status === "confirmed") {
    return { complete: true, status: "confirmed", transactionHash: claim.transactionHash };
  }
  const metadata = claim?.metadata as Record<string, unknown> | undefined;
  if (!claim || metadata?.challengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the campaign claim.");
  }
  const result = await challengeResult(request, session, challengeId);
  if (result.pending) return result;
  const updated = await db.update(claims).set({
    status: "confirmed",
    transactionHash: result.transactionHash,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(claims.id, claim.id), ne(claims.status, "confirmed"))).returning();
  if (updated.length) {
    await db.update(allocations).set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(allocations.id, row.allocationId));
    await db.update(distributions).set({
      claimedAmountAtomic: sql`${distributions.claimedAmountAtomic} + ${row.amountAtomic}`,
      status: sql`CASE WHEN ${distributions.claimedAmountAtomic} + ${row.amountAtomic} >= ${distributions.totalAmountAtomic} THEN 'completed'::distribution_status ELSE ${distributions.status} END`,
      updatedAt: new Date(),
    }).where(eq(distributions.id, row.distributionId));
  }
  return { ...result, status: "confirmed" };
}

export async function createCampaignManagementChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "cancel" | "refund",
) {
  const settlement = config();
  const wallet = arcWallet(session);
  const row = await ownedCampaign(distributionId, userId);
  if (row.status !== "active") throw new ApiError(409, "CAMPAIGN_NOT_ACTIVE", "Only an active campaign can be recovered.");
  if (action === "refund" && row.expiresAt.getTime() > Date.now()) {
    throw new ApiError(409, "REFUND_NOT_READY", "This campaign has not expired yet.");
  }
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: settlement.vaultAddress,
    abiFunctionSignature: `${action}(bytes32)`,
    abiParameters: [contractCampaignId(distributionId)],
    refId: `campaign-${action}-${distributionId}`.slice(0, 100),
  });
  const metadata = row.metadata as Record<string, unknown>;
  await getDb().update(distributions).set({
    metadata: { ...metadata, [`${action}ChallengeId`]: challengeId },
    updatedAt: new Date(),
  }).where(eq(distributions.id, distributionId));
  return { complete: false, action, challengeId };
}

export async function confirmCampaignManagementChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "cancel" | "refund",
  challengeId: string,
) {
  const row = await ownedCampaign(distributionId, userId);
  const metadata = row.metadata as Record<string, unknown>;
  if (metadata[`${action}ChallengeId`] !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the campaign.");
  }
  const result = await challengeResult(request, session, challengeId);
  if (result.pending) return result;
  const status = action === "cancel" ? "cancelled" : "refunded";
  await getDb().update(distributions).set({
    status,
    updatedAt: new Date(),
    metadata: { ...metadata, [`${action}TransactionHash`]: result.transactionHash },
  }).where(eq(distributions.id, distributionId));
  await getDb().update(allocations).set({ status: "refunded", updatedAt: new Date() })
    .where(and(eq(allocations.distributionId, distributionId), ne(allocations.status, "confirmed")));
  return { ...result, status };
}
