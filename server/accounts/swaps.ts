import { and, eq } from "drizzle-orm";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  stringToHex,
  type Address,
} from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import { auditEvents, tokens, walletSwaps } from "../db/schema.js";
import { ApiError } from "../http.js";
import { formatAtomic, toAtomic } from "../campaigns/repository.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";

const routeAbi = parseAbi([
  "function quote(address tokenIn,uint256 usdcOut,address adapter) view returns (uint256 amountIn)",
]);
const balanceAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

type SwapRoute = {
  router: Address;
  adapter: Address;
  token: Address;
};

function routeConfig(): SwapRoute | null {
  const config = getServerConfig();
  if (!config.CURRENT_CHECKOUT_ROUTER_ADDRESS || !config.CURRENT_TESTNET_CHECKOUT_ADAPTER_ADDRESS || !config.CURRENT_TOKEN_ADDRESS) return null;
  return {
    router: getAddress(config.CURRENT_CHECKOUT_ROUTER_ADDRESS),
    adapter: getAddress(config.CURRENT_TESTNET_CHECKOUT_ADAPTER_ADDRESS),
    token: getAddress(config.CURRENT_TOKEN_ADDRESS),
  };
}

function requiredRoute(requestedToken?: string) {
  const route = routeConfig();
  if (!route) throw new ApiError(503, "SWAP_ROUTE_NOT_CONFIGURED", "The governed Arc testnet token route has not been activated yet.");
  if (!requestedToken || !isAddress(requestedToken) || getAddress(requestedToken) !== route.token) {
    throw new ApiError(409, "SWAP_ROUTE_UNAVAILABLE", "No qualified exact-USDC route exists for this Arc asset.");
  }
  return route;
}

async function currentMetadata(route: SwapRoute) {
  const token = await getDb().query.tokens.findFirst({
    where: and(eq(tokens.chainCode, ARC_TESTNET.network), eq(tokens.contractAddress, route.token.toLowerCase())),
  });
  return {
    address: route.token.toLowerCase(),
    symbol: token?.symbol ?? "$CURRENT",
    name: token?.name ?? "Current",
    decimals: token?.decimals ?? 18,
  };
}

function rpcClient() {
  return createPublicClient({ transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 4, retryDelay: 500 }) });
}

export function consumerSwapCapability() {
  const route = routeConfig();
  return route ? {
    configured: true as const,
    tokenAddress: route.token.toLowerCase(),
    outputAddress: ARC_TESTNET.usdcAddress.toLowerCase(),
    outputSymbol: "USDC",
    mode: "exact-usdc" as const,
    boundary: "The isolated Arc testnet adapter proves exact USDC settlement. It is not a mainnet market price or liquidity claim.",
  } : {
    configured: false as const,
    tokenAddress: getServerConfig().CURRENT_TOKEN_ADDRESS?.toLowerCase() ?? null,
    outputAddress: ARC_TESTNET.usdcAddress.toLowerCase(),
    outputSymbol: "USDC",
    mode: "exact-usdc" as const,
    boundary: "Consumer swaps remain fail-closed until a governed router and qualified adapter are configured.",
  };
}

export async function quoteConsumerSwap(input: { tokenAddress: string; usdcOut: string }) {
  const route = requiredRoute(input.tokenAddress);
  const asset = await currentMetadata(route);
  const usdcOutAtomic = toAtomic(input.usdcOut, 6);
  const amountIn = await rpcClient().readContract({
    address: route.router,
    abi: routeAbi,
    functionName: "quote",
    args: [route.token, BigInt(usdcOutAtomic), route.adapter],
  }).catch(() => null);
  if (!amountIn || amountIn <= BigInt(0)) throw new ApiError(409, "SWAP_ROUTE_UNAVAILABLE", "The governed testnet route could not return an exact quote.");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  return {
    network: ARC_TESTNET.network,
    route: "testnet-fixed-rate" as const,
    tokenIn: asset,
    amountIn: formatAtomic(amountIn.toString(), asset.decimals),
    amountInAtomic: amountIn.toString(),
    tokenOut: { address: ARC_TESTNET.usdcAddress.toLowerCase(), symbol: "USDC", name: "USD Coin", decimals: 6 },
    amountOut: formatAtomic(usdcOutAtomic, 6),
    amountOutAtomic: usdcOutAtomic,
    expiresAt: expiresAt.toISOString(),
    boundary: "This exact-output quote uses Current's isolated Arc testnet adapter, has no monetary value, and does not represent a mainnet market price.",
  };
}

async function assertSwapBalance(walletAddress: string, tokenAddress: Address, amountAtomic: string) {
  const balance = await rpcClient().readContract({
    address: tokenAddress,
    abi: balanceAbi,
    functionName: "balanceOf",
    args: [getAddress(walletAddress)],
  });
  if (BigInt(amountAtomic) > balance) throw new ApiError(409, "INSUFFICIENT_SWAP_BALANCE", "Your verified project-token balance is too low for this exact-USDC swap.");
  return balance.toString();
}

function receiptNumber() {
  return `CUR-SWAP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function publicSwap(row: typeof walletSwaps.$inferSelect) {
  return {
    id: row.id,
    network: ARC_TESTNET.network,
    status: row.status,
    phase: row.phase,
    receiptNumber: row.receiptNumber,
    walletAddress: row.walletAddress,
    tokenIn: { address: row.tokenInAddress, symbol: row.tokenInSymbol, name: row.tokenInName, decimals: row.tokenInDecimals },
    amountIn: formatAtomic(row.amountInAtomic, row.tokenInDecimals),
    amountInAtomic: row.amountInAtomic,
    tokenOut: { address: ARC_TESTNET.usdcAddress.toLowerCase(), symbol: "USDC", name: "USD Coin", decimals: 6 },
    amountOut: formatAtomic(row.usdcOutAtomic, 6),
    amountOutAtomic: row.usdcOutAtomic,
    approvalTransactionHash: row.approvalTransactionHash,
    transactionHash: row.settlementTransactionHash,
    explorerUrl: row.settlementTransactionHash ? `${ARC_TESTNET.explorerUrl}/tx/${row.settlementTransactionHash}` : null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    boundary: "This receipt proves an isolated Arc testnet conversion into exact test USDC. Testnet assets have no monetary value.",
  };
}

export async function createConsumerSwapChallenge(request: Request, session: CurrentSession, input: {
  userId: string;
  tokenAddress: string;
  usdcOut: string;
  expectedAmountInAtomic: string;
}) {
  const wallet = arcWallet(session);
  const route = requiredRoute(input.tokenAddress);
  const quote = await quoteConsumerSwap(input);
  if (!/^\d+$/.test(input.expectedAmountInAtomic) || quote.amountInAtomic !== input.expectedAmountInAtomic) {
    throw new ApiError(409, "SWAP_QUOTE_CHANGED", "The exact project-token input changed. Review a fresh quote before approving.");
  }
  const observedBalanceAtomic = await assertSwapBalance(wallet.address, route.token, quote.amountInAtomic);
  const id = crypto.randomUUID();
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: route.token,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [route.router, quote.amountInAtomic],
    refId: `wallet-swap-approve-${id}`.slice(0, 100),
  });
  const [created] = await getDb().insert(walletSwaps).values({
    id,
    userId: input.userId,
    circleWalletId: wallet.id,
    walletAddress: wallet.address.toLowerCase(),
    tokenInAddress: quote.tokenIn.address,
    tokenInSymbol: quote.tokenIn.symbol,
    tokenInName: quote.tokenIn.name,
    tokenInDecimals: quote.tokenIn.decimals,
    amountInAtomic: quote.amountInAtomic,
    usdcOutAtomic: quote.amountOutAtomic,
    routerAddress: route.router.toLowerCase(),
    adapterAddress: route.adapter.toLowerCase(),
    status: "authorizing",
    phase: "approval",
    approvalChallengeId: challengeId,
    receiptNumber: receiptNumber(),
    metadata: { observedBalanceAtomic, quotedAt: new Date().toISOString(), quoteExpiresAt: quote.expiresAt, route: quote.route },
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: "user", actorId: input.userId, action: "wallet_swap.prepared", resourceType: "wallet-swap", resourceId: created.id,
    metadata: { tokenAddress: quote.tokenIn.address, amountInAtomic: quote.amountInAtomic, usdcOutAtomic: quote.amountOutAtomic, router: route.router },
  });
  return { complete: false as const, phase: "approval" as const, swapId: created.id, challengeId, swap: publicSwap(created) };
}

export async function confirmConsumerSwapChallenge(request: Request, session: CurrentSession, input: {
  userId: string;
  swapId: string;
  challengeId: string;
}) {
  const db = getDb();
  const row = await db.query.walletSwaps.findFirst({ where: eq(walletSwaps.id, input.swapId) });
  if (!row) throw new ApiError(404, "SWAP_NOT_FOUND", "This wallet swap could not be found.");
  if (row.userId !== input.userId) throw new ApiError(403, "SWAP_FORBIDDEN", "This swap belongs to another Current account.");
  if (row.status === "confirmed") return { complete: true as const, swap: publicSwap(row) };
  const route = requiredRoute(row.tokenInAddress);
  if (row.routerAddress !== route.router.toLowerCase() || row.adapterAddress !== route.adapter.toLowerCase()) {
    throw new ApiError(409, "SWAP_ROUTE_CHANGED", "The governed route changed before settlement. Start a new quote.");
  }

  if (row.phase === "approval") {
    if (row.approvalChallengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet approval does not belong to this swap.");
    const result = await circleChallengeResult(request, session, input.challengeId);
    if (result.pending) return { ...result, complete: false as const, phase: "approval" as const, swapId: row.id };
    const deadlineSeconds = Math.floor(Date.now() / 1_000) + 10 * 60;
    const wallet = arcWallet(session);
    const next = await createUserContractExecutionChallenge(request, session.userToken, {
      walletId: wallet.id,
      contractAddress: route.router,
      abiFunctionSignature: "settleExactUSDC(bytes32,address,uint256,uint256,address,uint64,address,bytes)",
      abiParameters: [keccak256(stringToHex(`wallet-swap:${row.id}`)), route.token, row.amountInAtomic, row.usdcOutAtomic, wallet.address, String(deadlineSeconds), route.adapter, "0x"],
      refId: `wallet-swap-settle-${row.id}`.slice(0, 100),
    });
    const [settling] = await db.update(walletSwaps).set({
      status: "settling",
      phase: "settlement",
      approvalTransactionHash: result.transactionHash,
      settlementChallengeId: next.challengeId,
      settlementDeadline: new Date(deadlineSeconds * 1_000),
      updatedAt: new Date(),
    }).where(and(eq(walletSwaps.id, row.id), eq(walletSwaps.phase, "approval"))).returning();
    if (!settling) throw new ApiError(409, "SWAP_ALREADY_ADVANCED", "This swap already advanced to settlement.");
    return { complete: false as const, phase: "settlement" as const, swapId: row.id, challengeId: next.challengeId, swap: publicSwap(settling) };
  }

  if (row.phase !== "settlement" || row.settlementChallengeId !== input.challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This settlement approval does not belong to this swap.");
  }
  const result = await circleChallengeResult(request, session, input.challengeId);
  if (result.pending) return { ...result, complete: false as const, phase: "settlement" as const, swapId: row.id };
  const [confirmed] = await db.update(walletSwaps).set({
    status: "confirmed",
    phase: "confirmed",
    settlementTransactionHash: result.transactionHash,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(walletSwaps.id, row.id), eq(walletSwaps.status, "settling"))).returning();
  if (!confirmed) throw new ApiError(409, "SWAP_ALREADY_SETTLED", "This swap was already confirmed or changed.");
  await db.insert(auditEvents).values({
    actorType: "user", actorId: input.userId, action: "wallet_swap.confirmed", resourceType: "wallet-swap", resourceId: row.id,
    metadata: { transactionHash: result.transactionHash, receiptNumber: row.receiptNumber, amountInAtomic: row.amountInAtomic, usdcOutAtomic: row.usdcOutAtomic },
  });
  return { ...result, complete: true as const, phase: "confirmed" as const, swap: publicSwap(confirmed) };
}
