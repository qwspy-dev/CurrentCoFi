import { and, eq } from "drizzle-orm";
import { createPublicClient, getAddress, http, isAddress, parseAbi } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import { auditEvents, tokens, walletTransfers } from "../db/schema.js";
import { ApiError } from "../http.js";
import { circleChallengeResult, arcWallet } from "../campaigns/settlement.js";
import { formatAtomic, toAtomic } from "../campaigns/repository.js";

const balanceAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

type TransferAsset = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  verified: boolean;
};

function receiptNumber() {
  return `CUR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

async function transferAsset(tokenAddress: string): Promise<TransferAsset> {
  if (!isAddress(tokenAddress)) throw new ApiError(400, "INVALID_TOKEN", "Choose a token detected in your Current account.");
  const address = getAddress(tokenAddress).toLowerCase();
  if (address === ARC_TESTNET.usdcAddress.toLowerCase()) {
    return { address, symbol: "USDC", name: "USD Coin", decimals: 6, verified: true };
  }
  const token = await getDb().query.tokens.findFirst({
    where: and(eq(tokens.chainCode, ARC_TESTNET.network), eq(tokens.contractAddress, address)),
  });
  if (!token) throw new ApiError(400, "UNSUPPORTED_TOKEN", "This token has not been inspected by Current CoFi yet.");
  return { address, symbol: token.symbol, name: token.name, decimals: token.decimals, verified: token.verified };
}

export function validateTransferDestination(fromAddress: string, destination: string) {
  if (!isAddress(destination)) throw new ApiError(400, "INVALID_DESTINATION", "Enter a valid Arc wallet address.");
  const normalized = getAddress(destination).toLowerCase();
  if (normalized === fromAddress.toLowerCase()) throw new ApiError(400, "SELF_TRANSFER", "Choose a wallet other than your Current account.");
  return normalized;
}

async function assertBalance(walletAddress: string, asset: TransferAsset, amountAtomic: string) {
  const client = createPublicClient({ transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 4, retryDelay: 500 }) });
  const balance = await client.readContract({
    address: getAddress(asset.address),
    abi: balanceAbi,
    functionName: "balanceOf",
    args: [getAddress(walletAddress)],
  });
  if (BigInt(amountAtomic) > balance) {
    throw new ApiError(409, "INSUFFICIENT_BALANCE", `Your verified ${asset.symbol} balance is too low for this transfer.`);
  }
  return balance.toString();
}

function publicTransfer(row: typeof walletTransfers.$inferSelect) {
  return {
    id: row.id,
    network: ARC_TESTNET.network,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    asset: { address: row.tokenAddress, symbol: row.symbol, name: row.name, decimals: row.decimals },
    amount: formatAtomic(row.amountAtomic, row.decimals),
    amountAtomic: row.amountAtomic,
    status: row.status,
    receiptNumber: row.receiptNumber,
    transactionHash: row.transactionHash,
    explorerUrl: row.transactionHash ? `${ARC_TESTNET.explorerUrl}/tx/${row.transactionHash}` : null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createWalletTransferChallenge(request: Request, session: CurrentSession, input: {
  userId: string;
  tokenAddress: string;
  destination: string;
  amount: string;
  note?: string;
}) {
  const wallet = arcWallet(session);
  const destination = validateTransferDestination(wallet.address, input.destination);
  const asset = await transferAsset(input.tokenAddress);
  const amountAtomic = toAtomic(input.amount, asset.decimals);
  const observedBalanceAtomic = await assertBalance(wallet.address, asset, amountAtomic);
  const id = crypto.randomUUID();
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: asset.address,
    abiFunctionSignature: "transfer(address,uint256)",
    abiParameters: [destination, amountAtomic],
    refId: `wallet-transfer-${id}`.slice(0, 100),
  });
  const [created] = await getDb().insert(walletTransfers).values({
    id,
    userId: input.userId,
    circleWalletId: wallet.id,
    fromAddress: wallet.address.toLowerCase(),
    toAddress: destination,
    tokenAddress: asset.address,
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    amountAtomic,
    status: "authorizing",
    challengeId,
    receiptNumber: receiptNumber(),
    note: input.note?.trim().slice(0, 140) || null,
    metadata: { observedBalanceAtomic, verifiedAsset: asset.verified, network: ARC_TESTNET.network },
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: "user", actorId: input.userId, action: "wallet_transfer.prepared", resourceType: "wallet-transfer", resourceId: created.id,
    metadata: { tokenAddress: asset.address, symbol: asset.symbol, amountAtomic, destination },
  });
  return { complete: false as const, transferId: created.id, challengeId, transfer: publicTransfer(created) };
}

export async function confirmWalletTransferChallenge(request: Request, session: CurrentSession, input: {
  userId: string;
  transferId: string;
  challengeId: string;
}) {
  const db = getDb();
  const row = await db.query.walletTransfers.findFirst({ where: eq(walletTransfers.id, input.transferId) });
  if (!row) throw new ApiError(404, "TRANSFER_NOT_FOUND", "This transfer could not be found.");
  if (row.userId !== input.userId || row.challengeId !== input.challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet approval does not belong to this transfer.");
  }
  if (row.status === "confirmed") return { complete: true as const, transfer: publicTransfer(row) };
  if (row.status !== "authorizing") throw new ApiError(409, "TRANSFER_UNAVAILABLE", "This transfer is no longer awaiting approval.");
  const result = await circleChallengeResult(request, session, input.challengeId);
  if (result.pending) return { ...result, complete: false as const, transferId: row.id };
  const [confirmed] = await db.update(walletTransfers).set({
    status: "confirmed", transactionHash: result.transactionHash, confirmedAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(walletTransfers.id, row.id), eq(walletTransfers.status, "authorizing"))).returning();
  if (!confirmed) throw new ApiError(409, "TRANSFER_ALREADY_SETTLED", "This transfer was already confirmed or changed.");
  await db.insert(auditEvents).values({
    actorType: "user", actorId: input.userId, action: "wallet_transfer.confirmed", resourceType: "wallet-transfer", resourceId: row.id,
    metadata: { transactionHash: result.transactionHash, receiptNumber: row.receiptNumber },
  });
  return { ...result, complete: true as const, transfer: publicTransfer(confirmed) };
}
