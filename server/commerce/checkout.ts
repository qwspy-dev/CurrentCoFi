import { desc, eq } from "drizzle-orm";
import { getAddress, isAddress } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import { auditEvents, checkoutLinks, checkoutPayments, merchantAccounts } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { formatAtomic, projectAccess, resolveToken, toAtomic } from "../campaigns/repository.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 38) || "merchant";
}

function validUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; }
  catch { throw new ApiError(400, "INVALID_URL", "URLs must use http or https."); }
}

async function merchantForProject(projectId: string) {
  return getDb().query.merchantAccounts.findFirst({ where: eq(merchantAccounts.projectId, projectId) });
}

export async function upsertMerchant(input: { projectId: string; userId?: string; displayName: string; settlementAddress: string; description?: string; logoUrl?: string }) {
  if (input.userId) await projectAccess(input.userId, input.projectId);
  if (!isAddress(input.settlementAddress)) throw new ApiError(400, "INVALID_SETTLEMENT_ADDRESS", "Use a valid Arc settlement address.");
  const existing = await merchantForProject(input.projectId);
  const values = {
    displayName: input.displayName.trim().slice(0, 80), description: input.description?.trim().slice(0, 280) || null,
    logoUrl: validUrl(input.logoUrl), settlementAddress: getAddress(input.settlementAddress).toLowerCase(), updatedAt: new Date(),
  };
  if (!values.displayName) throw new ApiError(400, "INVALID_MERCHANT", "A merchant display name is required.");
  if (existing) {
    const [updated] = await getDb().update(merchantAccounts).set(values).where(eq(merchantAccounts.id, existing.id)).returning();
    return updated;
  }
  const [created] = await getDb().insert(merchantAccounts).values({
    projectId: input.projectId, ownerUserId: input.userId, ...values,
    slug: `${safeSlug(values.displayName)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 7)}`,
  }).returning();
  return created;
}

export async function createCheckoutLink(input: { projectId: string; userId?: string; actorKeyId?: string; title: string; description?: string; amount: string; expiresAt?: string; successUrl?: string; origin: string; settlementAddress?: string; merchantName?: string }) {
  if (input.userId) await projectAccess(input.userId, input.projectId);
  let merchant = await merchantForProject(input.projectId);
  if (!merchant) {
    if (!input.settlementAddress || !input.merchantName) throw new ApiError(409, "MERCHANT_SETUP_REQUIRED", "Create a merchant profile before publishing checkout links.");
    merchant = await upsertMerchant({ projectId: input.projectId, userId: input.userId, displayName: input.merchantName, settlementAddress: input.settlementAddress });
  }
  if (merchant.status !== "active") throw new ApiError(409, "MERCHANT_INACTIVE", "This merchant account is not active.");
  const token = await resolveToken(input.projectId);
  const amountAtomic = toAtomic(input.amount, token.decimals);
  const title = input.title.trim().slice(0, 100);
  if (!title) throw new ApiError(400, "INVALID_CHECKOUT_TITLE", "A checkout title is required.");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) throw new ApiError(400, "INVALID_EXPIRATION", "Checkout expiration must be in the future.");
  const slug = `${safeSlug(title)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const [created] = await getDb().insert(checkoutLinks).values({
    merchantId: merchant.id, title, description: input.description?.trim().slice(0, 500) || null,
    slug, amountAtomic, expiresAt, successUrl: validUrl(input.successUrl),
  }).returning();
  await getDb().insert(auditEvents).values({ actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId, projectId: input.projectId, action: "checkout.created", resourceType: "checkout", resourceId: created.id, metadata: { amountAtomic, currency: "USDC" } });
  await queueWebhookEvent(input.projectId, "checkout.created", { checkoutId: created.id, slug, amountAtomic, currency: "USDC" });
  await deliverQueuedWebhooks(10);
  return { ...formatCheckout(created, merchant), checkoutUrl: `${input.origin}/#/checkout/${slug}` };
}

function formatCheckout(link: typeof checkoutLinks.$inferSelect, merchant: typeof merchantAccounts.$inferSelect) {
  return {
    id: link.id, slug: link.slug, title: link.title, description: link.description, status: link.status,
    amount: formatAtomic(link.amountAtomic, 6), amountAtomic: link.amountAtomic, currency: link.currency,
    expiresAt: link.expiresAt?.toISOString() ?? null, successUrl: link.successUrl,
    merchant: { id: merchant.id, name: merchant.displayName, slug: merchant.slug, description: merchant.description, logoUrl: merchant.logoUrl, settlementAddress: merchant.settlementAddress },
    createdAt: link.createdAt.toISOString(),
  };
}

export async function listMerchantCommerce(input: { userId?: string; projectId: string; origin: string }) {
  if (input.userId) await projectAccess(input.userId, input.projectId);
  const merchant = await merchantForProject(input.projectId);
  if (!merchant) return { merchant: null, checkouts: [], payments: [], totals: { checkouts: 0, payments: 0, volume: "0", refunds: 0 } };
  const links = await getDb().select().from(checkoutLinks).where(eq(checkoutLinks.merchantId, merchant.id)).orderBy(desc(checkoutLinks.createdAt));
  const payments = await getDb().select({ payment: checkoutPayments, checkout: checkoutLinks }).from(checkoutPayments).innerJoin(checkoutLinks, eq(checkoutLinks.id, checkoutPayments.checkoutId)).where(eq(checkoutLinks.merchantId, merchant.id)).orderBy(desc(checkoutPayments.createdAt)).limit(100);
  const confirmed = payments.filter((row) => row.payment.status === "confirmed" || row.payment.status === "refunded");
  const volumeAtomic = confirmed.reduce((total, row) => total + BigInt(row.payment.amountAtomic), BigInt(0));
  return {
    merchant,
    checkouts: links.map((link) => ({ ...formatCheckout(link, merchant), checkoutUrl: `${input.origin}/#/checkout/${link.slug}` })),
    payments: payments.map(({ payment, checkout }) => formatPayment(payment, checkout, merchant)),
    totals: { checkouts: links.length, payments: confirmed.length, volume: formatAtomic(volumeAtomic.toString(), 6), refunds: payments.filter((row) => row.payment.status === "refunded").length },
  };
}

async function checkoutRow(slug: string, allowExpired = false) {
  const [row] = await getDb().select({ checkout: checkoutLinks, merchant: merchantAccounts }).from(checkoutLinks).innerJoin(merchantAccounts, eq(merchantAccounts.id, checkoutLinks.merchantId)).where(eq(checkoutLinks.slug, slug)).limit(1);
  if (!row || row.checkout.status !== "active" || row.merchant.status !== "active") throw new ApiError(404, "CHECKOUT_NOT_FOUND", "This checkout link is not available.");
  if (!allowExpired && row.checkout.expiresAt && row.checkout.expiresAt.getTime() <= Date.now()) throw new ApiError(410, "CHECKOUT_EXPIRED", "This checkout link has expired.");
  return row;
}

export async function publicCheckout(slug: string) { const row = await checkoutRow(slug); return formatCheckout(row.checkout, row.merchant); }

function formatPayment(payment: typeof checkoutPayments.$inferSelect, checkout: typeof checkoutLinks.$inferSelect, merchant: typeof merchantAccounts.$inferSelect) {
  return { id: payment.id, receiptNumber: payment.receiptNumber, status: payment.status, amount: formatAtomic(payment.amountAtomic, 6), currency: checkout.currency, customerAddress: payment.customerAddress, merchantAddress: payment.merchantAddress, paymentTransactionHash: payment.paymentTransactionHash, refundTransactionHash: payment.refundTransactionHash, paidAt: payment.paidAt?.toISOString() ?? null, refundedAt: payment.refundedAt?.toISOString() ?? null, checkout: { id: checkout.id, title: checkout.title, slug: checkout.slug }, merchant: { name: merchant.displayName, slug: merchant.slug }, createdAt: payment.createdAt.toISOString() };
}

export async function checkoutPaymentChallenge(request: Request, session: CurrentSession, input: { userId: string; slug: string; paymentId?: string; challengeId?: string }) {
  const wallet = arcWallet(session);
  const row = await checkoutRow(input.slug, Boolean(input.challengeId));
  const db = getDb();
  let payment = input.paymentId ? await db.query.checkoutPayments.findFirst({ where: eq(checkoutPayments.id, input.paymentId) }) : null;
  if (input.challengeId) {
    if (!payment || payment.checkoutId !== row.checkout.id || payment.customerUserId !== input.userId || payment.paymentChallengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This checkout payment does not belong to this checkout and wallet.");
    const result = await circleChallengeResult(request, session, input.challengeId);
    if (result.pending) return { ...result, paymentId: payment.id };
    const [confirmed] = await db.update(checkoutPayments).set({ status: "confirmed", paymentTransactionHash: result.transactionHash, paidAt: new Date(), updatedAt: new Date() }).where(eq(checkoutPayments.id, payment.id)).returning();
    await queueWebhookEvent(row.merchant.projectId, "checkout.paid", { checkoutId: row.checkout.id, paymentId: payment.id, receiptNumber: payment.receiptNumber, amountAtomic: payment.amountAtomic, transactionHash: result.transactionHash });
    await deliverQueuedWebhooks(10);
    return { ...result, complete: true, payment: formatPayment(confirmed, row.checkout, row.merchant) };
  }
  if (payment?.status === "confirmed") return { complete: true, payment: formatPayment(payment, row.checkout, row.merchant) };
  if (!payment) {
    [payment] = await db.insert(checkoutPayments).values({ checkoutId: row.checkout.id, customerUserId: input.userId, customerWalletId: wallet.id, customerAddress: wallet.address.toLowerCase(), merchantAddress: row.merchant.settlementAddress, amountAtomic: row.checkout.amountAtomic, receiptNumber: `CUR-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}` }).returning();
  }
  const usdc = await resolveToken(row.merchant.projectId);
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, { walletId: wallet.id, contractAddress: usdc.contractAddress, abiFunctionSignature: "transfer(address,uint256)", abiParameters: [row.merchant.settlementAddress, row.checkout.amountAtomic], refId: `checkout-${payment.id}`.slice(0, 100) });
  await db.update(checkoutPayments).set({ status: "authorizing", paymentChallengeId: challengeId, updatedAt: new Date() }).where(eq(checkoutPayments.id, payment.id));
  return { complete: false, paymentId: payment.id, challengeId };
}

export async function refundPaymentChallenge(request: Request, session: CurrentSession, input: { userId: string; paymentId: string; challengeId?: string }) {
  const wallet = arcWallet(session); const db = getDb();
  const [row] = await db.select({ payment: checkoutPayments, checkout: checkoutLinks, merchant: merchantAccounts }).from(checkoutPayments).innerJoin(checkoutLinks, eq(checkoutLinks.id, checkoutPayments.checkoutId)).innerJoin(merchantAccounts, eq(merchantAccounts.id, checkoutLinks.merchantId)).where(eq(checkoutPayments.id, input.paymentId)).limit(1);
  if (!row) throw new ApiError(404, "PAYMENT_NOT_FOUND", "This payment was not found.");
  await projectAccess(input.userId, row.merchant.projectId);
  if (wallet.address.toLowerCase() !== row.merchant.settlementAddress) throw new ApiError(403, "MERCHANT_WALLET_REQUIRED", "Refunds must be signed by the merchant settlement wallet.");
  if (row.payment.status === "refunded") return { complete: true, payment: formatPayment(row.payment, row.checkout, row.merchant) };
  if (row.payment.status !== "confirmed") throw new ApiError(409, "PAYMENT_NOT_REFUNDABLE", "Only confirmed payments can be refunded.");
  if (input.challengeId) {
    if (row.payment.refundChallengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This refund does not belong to the payment.");
    const result = await circleChallengeResult(request, session, input.challengeId); if (result.pending) return result;
    const [refunded] = await db.update(checkoutPayments).set({ status: "refunded", refundTransactionHash: result.transactionHash, refundedAt: new Date(), updatedAt: new Date() }).where(eq(checkoutPayments.id, row.payment.id)).returning();
    await queueWebhookEvent(row.merchant.projectId, "checkout.refunded", { checkoutId: row.checkout.id, paymentId: row.payment.id, receiptNumber: row.payment.receiptNumber, amountAtomic: row.payment.amountAtomic, transactionHash: result.transactionHash }); await deliverQueuedWebhooks(10);
    return { ...result, complete: true, payment: formatPayment(refunded, row.checkout, row.merchant) };
  }
  const usdc = await resolveToken(row.merchant.projectId); const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, { walletId: wallet.id, contractAddress: usdc.contractAddress, abiFunctionSignature: "transfer(address,uint256)", abiParameters: [row.payment.customerAddress, row.payment.amountAtomic], refId: `refund-${row.payment.id}`.slice(0, 100) });
  await db.update(checkoutPayments).set({ status: "refunding", refundChallengeId: challengeId, updatedAt: new Date() }).where(eq(checkoutPayments.id, row.payment.id));
  return { complete: false, challengeId };
}

export async function publicReceipt(receiptNumber: string) {
  const [row] = await getDb().select({ payment: checkoutPayments, checkout: checkoutLinks, merchant: merchantAccounts }).from(checkoutPayments).innerJoin(checkoutLinks, eq(checkoutLinks.id, checkoutPayments.checkoutId)).innerJoin(merchantAccounts, eq(merchantAccounts.id, checkoutLinks.merchantId)).where(eq(checkoutPayments.receiptNumber, receiptNumber)).limit(1);
  if (!row || !["confirmed", "refunded"].includes(row.payment.status)) throw new ApiError(404, "RECEIPT_NOT_FOUND", "This receipt was not found.");
  return { ...formatPayment(row.payment, row.checkout, row.merchant), network: ARC_TESTNET.network, explorerUrl: ARC_TESTNET.explorerUrl };
}
