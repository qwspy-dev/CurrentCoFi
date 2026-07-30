import { and, eq, sql } from "drizzle-orm";
import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import {
  createUserContractExecutionChallenge,
  getUserChallenge,
  getUserTransaction,
} from "../circle/client.js";
import { getDb } from "../db/client.js";
import { allocations, claims, distributions, tokens, wallets } from "../db/schema.js";
import { ApiError } from "../http.js";
import { parseClaimToken, sha256 } from "../security/crypto.js";
import type { CurrentSession } from "../auth/session.js";

const FINAL_TRANSACTION_STATES = new Set(["COMPLETE", "CONFIRMED"]);
const FAILED_TRANSACTION_STATES = new Set(["FAILED", "DENIED", "CANCELLED"]);

function settlementConfig() {
  const config = getServerConfig();
  if (!config.CURRENT_CLAIM_VAULT_ADDRESS || !config.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY) {
    throw new ApiError(503, "ARC_SETTLEMENT_NOT_CONFIGURED", "Arc settlement is not configured yet.");
  }
  return {
    vaultAddress: config.CURRENT_CLAIM_VAULT_ADDRESS as Address,
    authorizerKey: config.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY,
  };
}

export function contractDistributionId(distributionId: string) {
  return keccak256(stringToHex(distributionId));
}

function arcWallet(session: CurrentSession) {
  const wallet = session.wallets.find((item) => item.blockchain === ARC_TESTNET.network);
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet to continue.");
  return wallet;
}

async function ownedDistribution(distributionId: string, userId: string) {
  const db = getDb();
  const [row] = await db.select({
    id: distributions.id,
    creatorUserId: distributions.creatorUserId,
    status: distributions.status,
    amountAtomic: distributions.totalAmountAtomic,
    expiresAt: distributions.expiresAt,
    fundingTxHash: distributions.fundingTxHash,
    metadata: distributions.metadata,
    tokenAddress: tokens.contractAddress,
    allocationId: allocations.id,
    secretHash: allocations.claimSecretHash,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .innerJoin(allocations, eq(allocations.distributionId, distributions.id))
    .where(and(eq(distributions.id, distributionId), eq(distributions.creatorUserId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "DISTRIBUTION_NOT_FOUND", "This distribution was not found.");
  if (!row.expiresAt || !row.secretHash) {
    throw new ApiError(409, "DISTRIBUTION_INVALID", "This distribution cannot be settled on Arc.");
  }
  return { ...row, expiresAt: row.expiresAt, secretHash: row.secretHash };
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
    return {
      pending: true as const,
      challengeStatus: challenge.status,
      transactionState: transaction.state,
    };
  }
  return {
    pending: false as const,
    transactionId,
    transactionHash: transaction.txHash ?? null,
    transactionState: transaction.state,
  };
}

export async function createFundingChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "approve" | "deposit",
) {
  const config = settlementConfig();
  const wallet = arcWallet(session);
  const row = await ownedDistribution(distributionId, userId);
  if (row.status === "active") {
    return { complete: true, status: row.status, transactionHash: row.fundingTxHash };
  }
  if (row.status !== "awaiting_funding") {
    throw new ApiError(409, "DISTRIBUTION_NOT_FUNDABLE", "This distribution is not awaiting funding.");
  }
  const params: {
    contractAddress: string;
    abiFunctionSignature: string;
    abiParameters: Array<string | number | boolean | unknown[]>;
  } = action === "approve"
    ? {
        contractAddress: row.tokenAddress,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [config.vaultAddress, row.amountAtomic],
      }
    : {
        contractAddress: config.vaultAddress,
        abiFunctionSignature: "fundDistribution(bytes32,address,uint256,uint64,bytes32)",
        abiParameters: [
          contractDistributionId(row.id),
          row.tokenAddress,
          row.amountAtomic,
          Math.floor(row.expiresAt.getTime() / 1_000).toString(),
          row.secretHash,
        ],
      };
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    ...params,
    refId: `current-${action}-${row.id}`.slice(0, 100),
  });
  const metadata = row.metadata as Record<string, unknown>;
  await getDb().update(distributions).set({
    vaultAddress: config.vaultAddress.toLowerCase(),
    metadata: {
      ...metadata,
      contractDistributionId: contractDistributionId(row.id),
      [`${action}ChallengeId`]: challengeId,
    },
    updatedAt: new Date(),
  }).where(eq(distributions.id, row.id));
  return { complete: false, action, challengeId };
}

export async function confirmFundingChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  action: "approve" | "deposit",
  challengeId: string,
) {
  const row = await ownedDistribution(distributionId, userId);
  const metadata = row.metadata as Record<string, unknown>;
  if (metadata[`${action}ChallengeId`] !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the distribution.");
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

async function claimRow(tokenValue: string) {
  const { allocationId, secret } = await parseClaimToken(tokenValue);
  const db = getDb();
  const [row] = await db.select({
    allocationId: allocations.id,
    allocationStatus: allocations.status,
    storedSecretHash: allocations.claimSecretHash,
    amountAtomic: allocations.amountAtomic,
    distributionId: distributions.id,
    distributionStatus: distributions.status,
    expiresAt: distributions.expiresAt,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  const valid = row?.storedSecretHash && (
    row.storedSecretHash === await sha256(secret) ||
    (/^0x[0-9a-f]{64}$/i.test(secret) && row.storedSecretHash === keccak256(secret as Hex))
  );
  if (!row || !valid) throw new ApiError(404, "CLAIM_NOT_FOUND", "This claim link is invalid.");
  if (!/^0x[0-9a-f]{64}$/i.test(secret)) {
    throw new ApiError(409, "LEGACY_CLAIM", "This earlier test link must be recreated before it can settle on Arc.");
  }
  if (row.distributionStatus !== "active") {
    throw new ApiError(409, "CLAIM_NOT_FUNDED", "The sender has not funded this claim yet.");
  }
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "CLAIM_EXPIRED", "This claim has expired.");
  }
  return { ...row, secret: secret as Hex };
}

export async function createClaimChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  tokenValue: string,
) {
  const config = settlementConfig();
  const sessionWallet = arcWallet(session);
  const db = getDb();
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.address, sessionWallet.address.toLowerCase())),
  });
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Your Arc wallet is not ready.");
  const row = await claimRow(tokenValue);
  const existing = await db.query.claims.findFirst({ where: eq(claims.allocationId, row.allocationId) });
  if (existing?.status === "confirmed") {
    return { complete: true, status: "confirmed", transactionHash: existing.transactionHash };
  }
  if (row.allocationStatus !== "available" && !existing) {
    throw new ApiError(409, "CLAIM_UNAVAILABLE", "This claim is already being processed.");
  }
  const authorizationDeadline = Math.floor(Date.now() / 1_000) + 15 * 60;
  const digest = keccak256(encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "address" },
      { type: "uint64" },
    ],
    [
      config.vaultAddress,
      BigInt(ARC_TESTNET.chainId),
      contractDistributionId(row.distributionId),
      sessionWallet.address as Address,
      BigInt(authorizationDeadline),
    ],
  ));
  const authorization = await privateKeyToAccount(config.authorizerKey)
    .signMessage({ message: { raw: digest } });
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: sessionWallet.id,
    contractAddress: config.vaultAddress,
    abiFunctionSignature: "claim(bytes32,bytes32,address,uint64,bytes)",
    abiParameters: [
      contractDistributionId(row.distributionId),
      row.secret,
      sessionWallet.address,
      authorizationDeadline.toString(),
      authorization,
    ],
    refId: `current-claim-${row.distributionId}`.slice(0, 100),
  });
  const claimMetadata = { challengeId, authorizationDeadline };
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

export async function confirmClaimChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  tokenValue: string,
  challengeId: string,
) {
  const row = await claimRow(tokenValue);
  const db = getDb();
  const claim = await db.query.claims.findFirst({
    where: and(eq(claims.allocationId, row.allocationId), eq(claims.claimantUserId, userId)),
  });
  const metadata = claim?.metadata as Record<string, unknown> | undefined;
  if (!claim || metadata?.challengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the claim.");
  }
  const result = await challengeResult(request, session, challengeId);
  if (result.pending) return result;
  await db.update(claims).set({
    status: "confirmed",
    transactionHash: result.transactionHash,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(claims.id, claim.id));
  await db.update(allocations).set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(allocations.id, row.allocationId));
  await db.update(distributions).set({
    status: "completed",
    claimedAmountAtomic: sql`${distributions.claimedAmountAtomic} + ${row.amountAtomic}`,
    updatedAt: new Date(),
  }).where(eq(distributions.id, row.distributionId));
  return { ...result, status: "confirmed" };
}

export async function createRefundChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
) {
  const config = settlementConfig();
  const wallet = arcWallet(session);
  const row = await ownedDistribution(distributionId, userId);
  if (!row.expiresAt || row.expiresAt.getTime() > Date.now()) {
    throw new ApiError(409, "REFUND_NOT_READY", "This distribution has not expired yet.");
  }
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: config.vaultAddress,
    abiFunctionSignature: "refund(bytes32)",
    abiParameters: [contractDistributionId(distributionId)],
    refId: `current-refund-${distributionId}`.slice(0, 100),
  });
  const metadata = row.metadata as Record<string, unknown>;
  await getDb().update(distributions).set({
    metadata: { ...metadata, refundChallengeId: challengeId },
    updatedAt: new Date(),
  }).where(eq(distributions.id, distributionId));
  return { challengeId };
}

export async function confirmRefundChallenge(
  request: Request,
  session: CurrentSession,
  userId: string,
  distributionId: string,
  challengeId: string,
) {
  const row = await ownedDistribution(distributionId, userId);
  const metadata = row.metadata as Record<string, unknown>;
  if (metadata.refundChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the refund.");
  }
  const result = await challengeResult(request, session, challengeId);
  if (result.pending) return result;
  await getDb().update(distributions).set({
    status: "refunded",
    updatedAt: new Date(),
    metadata: { ...metadata, refundTransactionHash: result.transactionHash },
  }).where(eq(distributions.id, distributionId));
  await getDb().update(allocations).set({ status: "refunded", updatedAt: new Date() })
    .where(eq(allocations.distributionId, distributionId));
  return { ...result, status: "refunded" };
}
