import { desc, eq, or } from "drizzle-orm";
import { createPublicClient, formatUnits, getAddress, http, parseAbi, type Address } from "viem";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import {
  allocations,
  checkoutLinks,
  checkoutPayments,
  claims,
  distributions,
  socialPaymentRequests,
  socialPaymentShares,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
  tokens,
} from "../db/schema.js";
import { formatAtomic } from "../campaigns/repository.js";

const balanceAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

type PortfolioToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  verified: boolean;
  trustPosture: "circle-verified" | "review-required" | "standard-observations" | "not-inspected";
};

export type PortfolioActivity = {
  id: string;
  kind: "claim" | "social-payment" | "checkout" | "subscription";
  direction: "in" | "out";
  title: string;
  amount: string;
  symbol: string;
  status: string;
  transactionHash: string | null;
  occurredAt: string;
};

function assetFromMetadata(request: typeof socialPaymentRequests.$inferSelect): PortfolioToken {
  const metadata = request.metadata as Record<string, unknown>;
  const asset = metadata.asset && typeof metadata.asset === "object" && !Array.isArray(metadata.asset)
    ? metadata.asset as Record<string, unknown>
    : {};
  return {
    address: typeof asset.address === "string" ? asset.address.toLowerCase() : ARC_TESTNET.usdcAddress.toLowerCase(),
    symbol: typeof asset.symbol === "string" ? asset.symbol : request.currency,
    name: typeof asset.name === "string" ? asset.name : request.currency,
    decimals: typeof asset.decimals === "number" ? asset.decimals : 6,
    verified: asset.verified === true,
    trustPosture: asset.verified === true ? "circle-verified" : "not-inspected",
  };
}

export function trustedUsdValue(symbol: string, balance: string) {
  return symbol.toUpperCase() === "USDC" ? balance : null;
}

export function sortPortfolioActivity(items: PortfolioActivity[]) {
  return [...items].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

async function tokenCatalog() {
  const rows = await getDb().select().from(tokens).orderBy(desc(tokens.updatedAt)).limit(100);
  const catalog = new Map<string, PortfolioToken>();
  catalog.set(ARC_TESTNET.usdcAddress.toLowerCase(), {
    address: ARC_TESTNET.usdcAddress.toLowerCase(), symbol: "USDC", name: "USD Coin", decimals: 6, verified: true, trustPosture: "circle-verified",
  });
  for (const token of rows) {
    const metadata = token.metadata as Record<string, unknown>;
    const trust = metadata.trust && typeof metadata.trust === "object" && !Array.isArray(metadata.trust) ? metadata.trust as Record<string, unknown> : {};
    const posture = ["circle-verified", "review-required", "standard-observations"].includes(String(trust.posture))
      ? trust.posture as PortfolioToken["trustPosture"] : "not-inspected";
    catalog.set(token.contractAddress.toLowerCase(), {
      address: token.contractAddress.toLowerCase(), symbol: token.symbol, name: token.name,
      decimals: token.decimals, verified: token.verified || token.contractAddress.toLowerCase() === ARC_TESTNET.usdcAddress.toLowerCase(), trustPosture: posture,
    });
  }
  return catalog;
}

async function onchainBalances(walletAddress: string, catalog: Map<string, PortfolioToken>) {
  const client = createPublicClient({ transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 4, retryDelay: 500 }) });
  const wallet = getAddress(walletAddress);
  const tokenList = [...catalog.values()];
  const [blockNumber, results] = await Promise.all([
    client.getBlockNumber(),
    client.multicall({
      multicallAddress,
      allowFailure: true,
      contracts: tokenList.map((token) => ({
        address: getAddress(token.address) as Address,
        abi: balanceAbi,
        functionName: "balanceOf" as const,
        args: [wallet] as const,
      })),
    }),
  ]);
  const items = tokenList.map((token, index) => {
    const result = results[index];
    if (result?.status === "success") {
      const atomic = result.result;
      const balance = formatUnits(atomic, token.decimals);
      return {
        ...token,
        balance,
        balanceAtomic: atomic.toString(),
        usdValue: trustedUsdValue(token.symbol, balance),
        valuation: token.symbol.toUpperCase() === "USDC" ? "stablecoin-parity" as const : "unpriced" as const,
        status: "verified" as const,
        explorerUrl: `${ARC_TESTNET.explorerUrl}/token/${token.address}?a=${walletAddress}`,
      };
    }
    return {
      ...token,
      balance: "0",
      balanceAtomic: "0",
      usdValue: null,
      valuation: "unavailable" as const,
      status: "unavailable" as const,
      explorerUrl: `${ARC_TESTNET.explorerUrl}/token/${token.address}?a=${walletAddress}`,
    };
  });
  return { blockNumber: blockNumber.toString(), items: items.filter((item) => item.balanceAtomic !== "0" || item.symbol === "USDC") };
}

async function accountActivity(userId: string) {
  const db = getDb();
  const claimRows = await db.select({
    claim: claims, allocation: allocations, distribution: distributions, token: tokens,
  }).from(claims)
    .innerJoin(allocations, eq(allocations.id, claims.allocationId))
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(claims.claimantUserId, userId))
    .orderBy(desc(claims.createdAt)).limit(100);

  const socialRows = await db.select({ share: socialPaymentShares, request: socialPaymentRequests })
    .from(socialPaymentShares)
    .innerJoin(socialPaymentRequests, eq(socialPaymentRequests.id, socialPaymentShares.requestId))
    .where(or(eq(socialPaymentShares.payerUserId, userId), eq(socialPaymentRequests.recipientUserId, userId)))
    .orderBy(desc(socialPaymentShares.createdAt)).limit(100);

  const checkoutRows = await db.select({ payment: checkoutPayments, checkout: checkoutLinks })
    .from(checkoutPayments).innerJoin(checkoutLinks, eq(checkoutLinks.id, checkoutPayments.checkoutId))
    .where(eq(checkoutPayments.customerUserId, userId)).orderBy(desc(checkoutPayments.createdAt)).limit(100);

  const subscriptionRows = await db.select({ payment: subscriptionPayments, plan: subscriptionPlans, subscription: subscriptions })
    .from(subscriptionPayments)
    .innerJoin(subscriptions, eq(subscriptions.id, subscriptionPayments.subscriptionId))
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
    .where(eq(subscriptions.subscriberUserId, userId)).orderBy(desc(subscriptionPayments.createdAt)).limit(100);

  const activity: PortfolioActivity[] = claimRows.map(({ claim, allocation, distribution, token }) => ({
    id: `claim:${claim.id}`, kind: "claim", direction: "in", title: distribution.name,
    amount: formatAtomic(allocation.amountAtomic, token.decimals), symbol: token.symbol, status: claim.status,
    transactionHash: claim.transactionHash, occurredAt: (claim.confirmedAt ?? claim.createdAt).toISOString(),
  }));

  for (const { share, request } of socialRows) {
    const asset = assetFromMetadata(request);
    activity.push({
      id: `social:${share.id}`, kind: "social-payment", direction: share.payerUserId === userId ? "out" : "in",
      title: request.title, amount: formatAtomic(share.amountAtomic, asset.decimals), symbol: asset.symbol,
      status: share.status, transactionHash: share.transactionHash, occurredAt: (share.paidAt ?? share.createdAt).toISOString(),
    });
  }

  activity.push(...checkoutRows.map(({ payment, checkout }) => ({
    id: `checkout:${payment.id}`, kind: "checkout" as const, direction: "out" as const, title: checkout.title,
    amount: formatAtomic(payment.amountAtomic, 6), symbol: checkout.currency, status: payment.status,
    transactionHash: payment.paymentTransactionHash, occurredAt: (payment.paidAt ?? payment.createdAt).toISOString(),
  })));
  activity.push(...subscriptionRows.map(({ payment, plan }) => ({
    id: `subscription:${payment.id}`, kind: "subscription" as const, direction: "out" as const, title: plan.title,
    amount: formatAtomic(payment.amountAtomic, 6), symbol: plan.currency, status: payment.status,
    transactionHash: payment.transactionHash, occurredAt: (payment.paidAt ?? payment.createdAt).toISOString(),
  })));
  return sortPortfolioActivity(activity).slice(0, 100);
}

export async function getAccountPortfolio(userId: string, walletAddress: string) {
  const catalog = await tokenCatalog();
  const [balances, activity] = await Promise.all([onchainBalances(walletAddress, catalog), accountActivity(userId)]);
  const totalVerifiedUsd = balances.items.reduce((sum, item) => sum + Number(item.usdValue ?? 0), 0);
  return {
    schemaVersion: "1.0",
    network: ARC_TESTNET.network,
    walletAddress: walletAddress.toLowerCase(),
    explorerUrl: `${ARC_TESTNET.explorerUrl}/address/${walletAddress}`,
    generatedAt: new Date().toISOString(),
    blockNumber: balances.blockNumber,
    provenance: "Balances are read directly from Arc testnet. Activity comes from persisted Current CoFi settlement records.",
    valuationBoundary: "Only USDC is included in the displayed portfolio total. Project tokens remain unpriced without a trustworthy market source.",
    totals: {
      verifiedUsd: totalVerifiedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6, useGrouping: false }),
      assets: balances.items.length,
      pricedAssets: balances.items.filter((item) => item.usdValue !== null).length,
      activity: activity.length,
    },
    assets: balances.items,
    activity,
  };
}
