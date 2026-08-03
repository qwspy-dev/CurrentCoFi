import { and, desc, eq, sql } from "drizzle-orm";
import { getAddress, isAddress } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import { auditEvents, socialPaymentRequests, socialPaymentShares, users } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { sha256 } from "../security/crypto.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";
import { formatAtomic, resolveToken, toAtomic } from "../campaigns/repository.js";

export type SocialPaymentKind = "send" | "request" | "tip" | "split";
const KINDS = new Set<SocialPaymentKind>(["send", "request", "tip", "split"]);

function shortId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function secret() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
}

function cleanTitle(value: string) {
  const title = value.trim().slice(0, 100);
  if (!title) throw new ApiError(400, "INVALID_TITLE", "Add a short title for this payment.");
  return title;
}

export function prepareSocialPaymentShares(kind: SocialPaymentKind, amount?: string, shares?: Array<{ label?: string; amount: string }>, decimals = 6) {
  if (!KINDS.has(kind)) throw new ApiError(400, "INVALID_PAYMENT_KIND", "Choose send, request, tip, or split.");
  const input = kind === "split" ? shares ?? [] : [{ amount: amount ?? "", label: kind === "send" ? "Direct payment" : "Open payment" }];
  if (kind === "split" && (input.length < 2 || input.length > 50)) throw new ApiError(400, "INVALID_SPLIT", "A split bill needs between 2 and 50 shares.");
  const prepared = input.map((share, index) => ({ label: (share.label?.trim() || `Share ${index + 1}`).slice(0, 60), amountAtomic: toAtomic(share.amount, decimals) }));
  return { prepared, totalAmountAtomic: prepared.reduce((sum, item) => sum + BigInt(item.amountAtomic), BigInt(0)).toString() };
}

function expiry(value?: string) {
  if (!value) return new Date(Date.now() + 7 * 86_400_000);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now() || date.getTime() > Date.now() + 30 * 86_400_000) {
    throw new ApiError(400, "INVALID_EXPIRATION", "Payment links may expire between now and 30 days from now.");
  }
  return date;
}

function paymentAsset(request: typeof socialPaymentRequests.$inferSelect) {
  const metadata = request.metadata as Record<string, unknown>;
  const stored = metadata.asset && typeof metadata.asset === "object" && !Array.isArray(metadata.asset)
    ? metadata.asset as Record<string, unknown>
    : {};
  const decimals = typeof stored.decimals === "number" && stored.decimals >= 0 && stored.decimals <= 18 ? stored.decimals : 6;
  const symbol = typeof stored.symbol === "string" && stored.symbol ? stored.symbol : request.currency;
  const address = typeof stored.address === "string" && isAddress(stored.address)
    ? getAddress(stored.address).toLowerCase()
    : ARC_TESTNET.usdcAddress.toLowerCase();
  return {
    address,
    symbol,
    name: typeof stored.name === "string" && stored.name ? stored.name : symbol === "USDC" ? "USD Coin" : symbol,
    decimals,
    verified: stored.verified === true || address === ARC_TESTNET.usdcAddress.toLowerCase(),
  };
}

function publicRequest(request: typeof socialPaymentRequests.$inferSelect, shares: Array<typeof socialPaymentShares.$inferSelect>, creator?: { username: string; displayName: string | null }) {
  const paid = shares.filter((share) => share.status === "confirmed");
  const asset = paymentAsset(request);
  return {
    id: request.id,
    slug: request.slug,
    kind: request.kind as SocialPaymentKind,
    title: request.title,
    note: request.note,
    status: request.expiresAt && request.expiresAt.getTime() <= Date.now() && request.status === "active" ? "expired" : request.status,
    amount: formatAtomic(request.amountAtomic, asset.decimals),
    paidAmount: formatAtomic(request.paidAmountAtomic, asset.decimals),
    currency: asset.symbol,
    asset,
    progress: { paid: paid.length, total: shares.length },
    creator: creator ? { username: creator.username, displayName: creator.displayName ?? creator.username } : undefined,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function createSocialPayment(input: {
  userId: string;
  creatorAddress: string;
  recipientUserId?: string;
  recipientAddress?: string;
  projectId: string;
  kind: SocialPaymentKind;
  title: string;
  note?: string;
  amount?: string;
  tokenAddress?: string;
  shares?: Array<{ label?: string; amount: string }>;
  expiresAt?: string;
  origin: string;
}) {
  const recipientAddress = input.kind === "send" ? input.recipientAddress : input.creatorAddress;
  if (!recipientAddress || !isAddress(recipientAddress)) throw new ApiError(400, "INVALID_RECIPIENT", "Choose a Current user with an active Arc wallet.");
  const token = await resolveToken(input.projectId, input.tokenAddress);
  const plan = prepareSocialPaymentShares(input.kind, input.amount, input.shares, token.decimals);
  const prepared = plan.prepared.map((share) => ({ ...share, token: secret() }));
  const totalAmountAtomic = plan.totalAmountAtomic;
  const slug = `${input.kind}-${shortId()}`;
  const db = getDb();
  const [created] = await db.insert(socialPaymentRequests).values({
    creatorUserId: input.userId,
    recipientUserId: input.kind === "send" ? input.recipientUserId : input.userId,
    slug,
    kind: input.kind,
    title: cleanTitle(input.title),
    note: input.note?.trim().slice(0, 280) || null,
    recipientAddress: getAddress(recipientAddress).toLowerCase(),
    amountAtomic: totalAmountAtomic,
    currency: token.symbol,
    expiresAt: expiry(input.expiresAt),
    metadata: {
      projectId: input.projectId,
      nonCustodial: true,
      asset: {
        address: token.contractAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        verified: token.verified,
      },
    },
  }).returning();
  const createdShares = [];
  for (const item of prepared) {
    const [share] = await db.insert(socialPaymentShares).values({
      requestId: created.id,
      publicTokenHash: await sha256(item.token),
      label: item.label,
      amountAtomic: item.amountAtomic,
      receiptNumber: `SOC-${shortId().toUpperCase()}`,
      metadata: input.kind === "send" ? { intendedPayerUserId: input.userId } : {},
    }).returning();
    createdShares.push({
      id: share.id,
      label: share.label,
      amount: formatAtomic(share.amountAtomic, token.decimals),
      payUrl: `${input.origin}/?payment=${encodeURIComponent(item.token)}#/pay/${slug}`,
    });
  }
  await db.insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "social_payment.created", resourceType: "social-payment", resourceId: created.id, metadata: { kind: input.kind, shares: prepared.length, amountAtomic: totalAmountAtomic, asset: token.symbol, assetAddress: token.contractAddress } });
  await queueWebhookEvent(input.projectId, "social-payment.created", { requestId: created.id, kind: input.kind, amountAtomic: totalAmountAtomic, asset: token.symbol, assetAddress: token.contractAddress, shareCount: prepared.length });
  await deliverQueuedWebhooks(10);
  return { ...publicRequest(created, []), shares: createdShares };
}

export async function listSocialPayments(userId: string, origin: string) {
  const db = getDb();
  const requests = await db.select().from(socialPaymentRequests).where(eq(socialPaymentRequests.creatorUserId, userId)).orderBy(desc(socialPaymentRequests.createdAt)).limit(100);
  const rows = [];
  for (const request of requests) {
    const shares = await db.select().from(socialPaymentShares).where(eq(socialPaymentShares.requestId, request.id)).orderBy(socialPaymentShares.createdAt);
    const asset = paymentAsset(request);
    rows.push({ ...publicRequest(request, shares), shares: shares.map((share) => ({ id: share.id, label: share.label, amount: formatAtomic(share.amountAtomic, asset.decimals), status: share.status, receiptNumber: share.receiptNumber, transactionHash: share.transactionHash, paidAt: share.paidAt?.toISOString() ?? null })), url: `${origin}/#/pay/${request.slug}` });
  }
  const payments = await db.select({ share: socialPaymentShares, request: socialPaymentRequests }).from(socialPaymentShares).innerJoin(socialPaymentRequests, eq(socialPaymentRequests.id, socialPaymentShares.requestId)).where(eq(socialPaymentShares.payerUserId, userId)).orderBy(desc(socialPaymentShares.createdAt)).limit(100);
  return {
    requests: rows,
    payments: payments.map(({ share, request }) => { const asset = paymentAsset(request); return ({ id: share.id, title: request.title, kind: request.kind, amount: formatAtomic(share.amountAtomic, asset.decimals), currency: asset.symbol, asset, status: share.status, receiptNumber: share.receiptNumber, transactionHash: share.transactionHash, createdAt: share.createdAt.toISOString() }); }),
  };
}

async function shareFromToken(token: string) {
  if (!token || token.length > 200) throw new ApiError(404, "PAYMENT_NOT_FOUND", "This payment link is not available.");
  const hash = await sha256(token);
  const [row] = await getDb().select({ share: socialPaymentShares, request: socialPaymentRequests, creator: users }).from(socialPaymentShares).innerJoin(socialPaymentRequests, eq(socialPaymentRequests.id, socialPaymentShares.requestId)).innerJoin(users, eq(users.id, socialPaymentRequests.creatorUserId)).where(eq(socialPaymentShares.publicTokenHash, hash)).limit(1);
  if (!row) throw new ApiError(404, "PAYMENT_NOT_FOUND", "This payment link is not available.");
  return row;
}

export async function publicSocialPayment(token: string) {
  const row = await shareFromToken(token);
  const expired = Boolean(row.request.expiresAt && row.request.expiresAt.getTime() <= Date.now());
  const asset = paymentAsset(row.request);
  return {
    ...publicRequest(row.request, [row.share], row.creator),
    share: { id: row.share.id, label: row.share.label, amount: formatAtomic(row.share.amountAtomic, asset.decimals), status: expired && row.share.status === "open" ? "expired" : row.share.status, receiptNumber: ["confirmed"].includes(row.share.status) ? row.share.receiptNumber : null, transactionHash: row.share.transactionHash },
    payable: !expired && row.request.status === "active" && row.share.status === "open",
    network: ARC_TESTNET.network,
    recipient: row.request.kind === "send" ? { username: row.creator.username, displayName: row.creator.displayName ?? row.creator.username } : undefined,
  };
}

export async function socialPaymentChallenge(request: Request, session: CurrentSession, input: { userId: string; token: string; shareId?: string; challengeId?: string }) {
  const row = await shareFromToken(input.token);
  const asset = paymentAsset(row.request);
  const wallet = arcWallet(session);
  if (row.request.expiresAt && row.request.expiresAt.getTime() <= Date.now()) throw new ApiError(410, "PAYMENT_EXPIRED", "This payment link has expired.");
  if (row.request.status !== "active") throw new ApiError(409, "PAYMENT_UNAVAILABLE", "This payment request is no longer active.");
  if (row.share.status === "confirmed") return { complete: true, payment: await publicSocialPayment(input.token) };
  const intendedPayer = (row.share.metadata as Record<string, unknown>).intendedPayerUserId;
  if (typeof intendedPayer === "string" && intendedPayer !== input.userId) throw new ApiError(403, "PAYER_MISMATCH", "This direct payment belongs to a different Current account.");
  if (input.challengeId) {
    if (row.share.id !== input.shareId || row.share.payerUserId !== input.userId || row.share.paymentChallengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet approval does not belong to this payment.");
    const result = await circleChallengeResult(request, session, input.challengeId);
    if (result.pending) return { ...result, shareId: row.share.id };
    const db = getDb();
    const [confirmed] = await db.update(socialPaymentShares).set({ status: "confirmed", transactionHash: result.transactionHash, paidAt: new Date(), updatedAt: new Date() }).where(and(eq(socialPaymentShares.id, row.share.id), eq(socialPaymentShares.status, "authorizing"))).returning();
    if (!confirmed) throw new ApiError(409, "PAYMENT_ALREADY_SETTLED", "This share was already settled or cancelled.");
    const totals = await db.select({ amount: sql<string>`coalesce(sum(${socialPaymentShares.amountAtomic}), 0)` }).from(socialPaymentShares).where(and(eq(socialPaymentShares.requestId, row.request.id), eq(socialPaymentShares.status, "confirmed")));
    const paidAmountAtomic = totals[0]?.amount ?? row.share.amountAtomic;
    const completed = BigInt(paidAmountAtomic) >= BigInt(row.request.amountAtomic);
    await db.update(socialPaymentRequests).set({ paidAmountAtomic, status: completed ? "completed" : "active", updatedAt: new Date() }).where(eq(socialPaymentRequests.id, row.request.id));
    const projectId = String((row.request.metadata as Record<string, unknown>).projectId ?? "");
    if (projectId) {
      await queueWebhookEvent(projectId, "social-payment.paid", { requestId: row.request.id, shareId: row.share.id, amountAtomic: row.share.amountAtomic, asset: asset.symbol, assetAddress: asset.address, transactionHash: result.transactionHash, completed });
      await deliverQueuedWebhooks(10);
    }
    return { ...result, complete: true, payment: await publicSocialPayment(input.token) };
  }
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, { walletId: wallet.id, contractAddress: asset.address, abiFunctionSignature: "transfer(address,uint256)", abiParameters: [row.request.recipientAddress, row.share.amountAtomic], refId: `social-${row.share.id}`.slice(0, 100) });
  const [reserved] = await getDb().update(socialPaymentShares).set({ status: "authorizing", payerUserId: input.userId, payerWalletId: wallet.id, payerAddress: wallet.address.toLowerCase(), paymentChallengeId: challengeId, updatedAt: new Date() }).where(and(eq(socialPaymentShares.id, row.share.id), eq(socialPaymentShares.status, "open"))).returning();
  if (!reserved) throw new ApiError(409, "PAYMENT_IN_PROGRESS", "This share is already being paid from another wallet.");
  return { complete: false, shareId: row.share.id, challengeId };
}

export async function cancelSocialPayment(userId: string, requestId: string) {
  const db = getDb();
  const request = await db.query.socialPaymentRequests.findFirst({ where: eq(socialPaymentRequests.id, requestId) });
  if (!request) throw new ApiError(404, "PAYMENT_NOT_FOUND", "This payment request was not found.");
  if (request.creatorUserId !== userId) throw new ApiError(403, "PAYMENT_ACCESS_DENIED", "Only the creator can cancel this request.");
  if (request.status !== "active") throw new ApiError(409, "PAYMENT_NOT_CANCELLABLE", "Only active payment requests can be cancelled.");
  await db.update(socialPaymentRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(socialPaymentRequests.id, requestId));
  await db.update(socialPaymentShares).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(socialPaymentShares.requestId, requestId), eq(socialPaymentShares.status, "open")));
  return { id: requestId, status: "cancelled" as const };
}
