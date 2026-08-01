import { and, desc, eq, inArray } from "drizzle-orm";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { getDb } from "../db/client.js";
import { auditEvents, merchantAccounts, subscriptionNotices, subscriptionPayments, subscriptionPlans, subscriptions } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { formatAtomic, projectAccess, resolveToken, toAtomic } from "../campaigns/repository.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";
import { resolveSubscriptionNotices } from "./subscription-lifecycle.js";

const ALLOWED_INTERVALS = new Set([7, 30, 90, 365]);
const renewalWindowMs = 3 * 86_400_000;

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 38) || "membership";
}

function validUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; }
  catch { throw new ApiError(400, "INVALID_URL", "URLs must use http or https."); }
}

async function merchantForProject(projectId: string) {
  return getDb().query.merchantAccounts.findFirst({ where: eq(merchantAccounts.projectId, projectId) });
}

async function planRow(slug: string, requireActive = true) {
  const [row] = await getDb().select({ plan: subscriptionPlans, merchant: merchantAccounts }).from(subscriptionPlans)
    .innerJoin(merchantAccounts, eq(merchantAccounts.id, subscriptionPlans.merchantId)).where(eq(subscriptionPlans.slug, slug)).limit(1);
  if (!row || row.merchant.status !== "active" || (requireActive && row.plan.status !== "active")) throw new ApiError(404, "PLAN_NOT_FOUND", "This subscription plan is not available.");
  return row;
}

function formatPlan(plan: typeof subscriptionPlans.$inferSelect, merchant: typeof merchantAccounts.$inferSelect, origin?: string) {
  return {
    id: plan.id, slug: plan.slug, title: plan.title, description: plan.description, status: plan.status,
    amount: formatAtomic(plan.amountAtomic, 6), amountAtomic: plan.amountAtomic, currency: plan.currency,
    intervalDays: plan.intervalDays, successUrl: plan.successUrl,
    subscribeUrl: origin ? `${origin}/#/subscribe/${plan.slug}` : undefined,
    merchant: { id: merchant.id, name: merchant.displayName, slug: merchant.slug, description: merchant.description, settlementAddress: merchant.settlementAddress },
    createdAt: plan.createdAt.toISOString(),
  };
}

function formatPayment(payment: typeof subscriptionPayments.$inferSelect) {
  return { id: payment.id, periodNumber: payment.periodNumber, amount: formatAtomic(payment.amountAtomic, 6), amountAtomic: payment.amountAtomic, status: payment.status, receiptNumber: payment.receiptNumber, transactionHash: payment.transactionHash, dueAt: payment.dueAt.toISOString(), paidAt: payment.paidAt?.toISOString() ?? null };
}

function formatNotice(notice: typeof subscriptionNotices.$inferSelect) {
  return { id: notice.id, kind: notice.kind, status: notice.status, periodNumber: notice.periodNumber, dueAt: notice.dueAt.toISOString(), acknowledgedAt: notice.acknowledgedAt?.toISOString() ?? null, createdAt: notice.createdAt.toISOString() };
}

function formatSubscription(subscription: typeof subscriptions.$inferSelect, plan: typeof subscriptionPlans.$inferSelect, merchant: typeof merchantAccounts.$inferSelect, payments: Array<typeof subscriptionPayments.$inferSelect> = [], notices: Array<typeof subscriptionNotices.$inferSelect> = []) {
  const periodEnd = subscription.currentPeriodEnd?.getTime() ?? null;
  return {
    id: subscription.id, status: subscription.status, cycleCount: subscription.cycleCount,
    subscriberAddress: subscription.subscriberAddress, merchantAddress: subscription.merchantAddress,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    renewalDue: subscription.status === "active" && Boolean(periodEnd && Date.now() >= periodEnd - renewalWindowMs),
    pastDue: subscription.status === "active" && Boolean(periodEnd && Date.now() > periodEnd),
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    plan: formatPlan(plan, merchant), payments: payments.map(formatPayment), notices: notices.map(formatNotice), createdAt: subscription.createdAt.toISOString(),
  };
}

export async function createSubscriptionPlan(input: { projectId: string; userId?: string; actorKeyId?: string; title: string; description?: string; amount: string; intervalDays: number; successUrl?: string; origin: string }) {
  if (input.userId) await projectAccess(input.userId, input.projectId);
  const merchant = await merchantForProject(input.projectId);
  if (!merchant || merchant.status !== "active") throw new ApiError(409, "MERCHANT_SETUP_REQUIRED", "Create an active merchant profile before publishing subscription plans.");
  if (!ALLOWED_INTERVALS.has(input.intervalDays)) throw new ApiError(400, "INVALID_INTERVAL", "Use a 7, 30, 90, or 365 day billing interval.");
  const token = await resolveToken(input.projectId); const amountAtomic = toAtomic(input.amount, token.decimals);
  const title = input.title.trim().slice(0, 100); if (!title) throw new ApiError(400, "INVALID_PLAN_TITLE", "A plan title is required.");
  const slug = `${safeSlug(title)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const [created] = await getDb().insert(subscriptionPlans).values({ merchantId: merchant.id, title, description: input.description?.trim().slice(0, 500) || null, slug, amountAtomic, intervalDays: input.intervalDays, successUrl: validUrl(input.successUrl) }).returning();
  await getDb().insert(auditEvents).values({ actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId, projectId: input.projectId, action: "subscription.plan.created", resourceType: "subscription-plan", resourceId: created.id, metadata: { amountAtomic, intervalDays: input.intervalDays } });
  await queueWebhookEvent(input.projectId, "subscription.plan.created", { planId: created.id, slug, amountAtomic, intervalDays: input.intervalDays }); await deliverQueuedWebhooks(10);
  return formatPlan(created, merchant, input.origin);
}

export async function publicSubscriptionPlan(slug: string) { const row = await planRow(slug); return formatPlan(row.plan, row.merchant); }

export async function listSubscriptionWorkspace(input: { userId?: string; projectId?: string; origin: string }) {
  const db = getDb(); let merchant = null as typeof merchantAccounts.$inferSelect | null;
  if (input.projectId) { if (input.userId) await projectAccess(input.userId, input.projectId); merchant = await merchantForProject(input.projectId) ?? null; }
  const plans = merchant ? await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptionPlans.createdAt)) : [];
  const merchantSubscriptions = merchant ? await db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).where(eq(subscriptionPlans.merchantId, merchant.id)).orderBy(desc(subscriptions.createdAt)).limit(100) : [];
  const subscriberRows = input.userId ? await db.select({ subscription: subscriptions, plan: subscriptionPlans, merchant: merchantAccounts }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).innerJoin(merchantAccounts, eq(merchantAccounts.id, subscriptionPlans.merchantId)).where(eq(subscriptions.subscriberUserId, input.userId)).orderBy(desc(subscriptions.createdAt)).limit(100) : [];
  const allIds = [...new Set([...merchantSubscriptions.map(row => row.subscription.id), ...subscriberRows.map(row => row.subscription.id)])];
  const paymentRows = allIds.length ? await db.select().from(subscriptionPayments).where(inArray(subscriptionPayments.subscriptionId, allIds)).orderBy(desc(subscriptionPayments.createdAt)).limit(500) : [];
  const noticeRows = allIds.length ? await db.select().from(subscriptionNotices).where(inArray(subscriptionNotices.subscriptionId, allIds)).orderBy(desc(subscriptionNotices.createdAt)).limit(500) : [];
  const bySubscription = new Map<string, Array<typeof subscriptionPayments.$inferSelect>>();
  for (const payment of paymentRows) if (allIds.includes(payment.subscriptionId)) bySubscription.set(payment.subscriptionId, [...(bySubscription.get(payment.subscriptionId) ?? []), payment]);
  const noticesBySubscription = new Map<string, Array<typeof subscriptionNotices.$inferSelect>>();
  for (const notice of noticeRows) noticesBySubscription.set(notice.subscriptionId, [...(noticesBySubscription.get(notice.subscriptionId) ?? []), notice]);
  const merchantFormatted = merchantSubscriptions.map(row => formatSubscription(row.subscription, row.plan, merchant!, bySubscription.get(row.subscription.id), noticesBySubscription.get(row.subscription.id)));
  const merchantSubscriptionIds = new Set(merchantSubscriptions.map(row => row.subscription.id));
  const confirmed = paymentRows.filter(payment => merchantSubscriptionIds.has(payment.subscriptionId) && payment.status === "confirmed");
  const collectedAtomic = confirmed.reduce((sum, payment) => sum + BigInt(payment.amountAtomic), BigInt(0));
  return {
    merchant, plans: merchant ? plans.map(plan => formatPlan(plan, merchant!, input.origin)) : [], merchantSubscriptions: merchantFormatted,
    subscriberSubscriptions: subscriberRows.map(row => formatSubscription(row.subscription, row.plan, row.merchant, bySubscription.get(row.subscription.id), noticesBySubscription.get(row.subscription.id))),
    totals: { plans: plans.length, activeSubscriptions: merchantFormatted.filter(item => item.status === "active").length, payments: confirmed.length, collected: formatAtomic(collectedAtomic.toString(), 6), openRenewals: noticeRows.filter(notice => notice.status === "open" && notice.kind === "renewal_due").length, pastDue: noticeRows.filter(notice => notice.status === "open" && notice.kind === "past_due").length },
  };
}

async function subscriptionRow(subscriptionId: string) {
  const [row] = await getDb().select({ subscription: subscriptions, plan: subscriptionPlans, merchant: merchantAccounts }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).innerJoin(merchantAccounts, eq(merchantAccounts.id, subscriptionPlans.merchantId)).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!row) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "This subscription was not found."); return row;
}

async function preparePayment(request: Request, session: CurrentSession, row: Awaited<ReturnType<typeof subscriptionRow>>, payment: typeof subscriptionPayments.$inferSelect) {
  const wallet = arcWallet(session); const token = await resolveToken(row.merchant.projectId);
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, { walletId: wallet.id, contractAddress: token.contractAddress, abiFunctionSignature: "transfer(address,uint256)", abiParameters: [row.merchant.settlementAddress, row.plan.amountAtomic], refId: `subscription-${payment.id}`.slice(0, 100) });
  await getDb().update(subscriptionPayments).set({ status: "authorizing", challengeId, updatedAt: new Date() }).where(eq(subscriptionPayments.id, payment.id));
  return { complete: false, subscriptionId: row.subscription.id, paymentId: payment.id, challengeId };
}

export async function startSubscriptionChallenge(request: Request, session: CurrentSession, input: { userId: string; slug: string; subscriptionId?: string; paymentId?: string; challengeId?: string }) {
  const wallet = arcWallet(session); const plan = await planRow(input.slug, !input.challengeId); const db = getDb();
  let subscription = input.subscriptionId ? await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, input.subscriptionId) }) : await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.planId, plan.plan.id), eq(subscriptions.subscriberAddress, wallet.address.toLowerCase())) });
  if (subscription && subscription.subscriberUserId !== input.userId) throw new ApiError(403, "SUBSCRIPTION_OWNER_REQUIRED", "This subscription belongs to another account.");
  let payment = input.paymentId ? await db.query.subscriptionPayments.findFirst({ where: eq(subscriptionPayments.id, input.paymentId) }) : subscription ? await db.query.subscriptionPayments.findFirst({ where: and(eq(subscriptionPayments.subscriptionId, subscription.id), eq(subscriptionPayments.periodNumber, 1)) }) : null;
  if (input.challengeId) {
    if (!subscription || !payment || payment.subscriptionId !== subscription.id || payment.challengeId !== input.challengeId || subscription.subscriberAddress !== wallet.address.toLowerCase()) throw new ApiError(403, "CHALLENGE_MISMATCH", "This subscription payment does not belong to this plan and wallet.");
    const result = await circleChallengeResult(request, session, input.challengeId); if (result.pending) return { ...result, subscriptionId: subscription.id, paymentId: payment.id };
    const paidAt = new Date(); const periodEnd = new Date(paidAt.getTime() + plan.plan.intervalDays * 86_400_000);
    const [confirmed] = await db.update(subscriptionPayments).set({ status: "confirmed", transactionHash: result.transactionHash, paidAt, updatedAt: paidAt }).where(eq(subscriptionPayments.id, payment.id)).returning();
    const [active] = await db.update(subscriptions).set({ status: "active", cycleCount: payment.periodNumber, currentPeriodStart: paidAt, currentPeriodEnd: periodEnd, updatedAt: paidAt }).where(eq(subscriptions.id, subscription.id)).returning();
    await resolveSubscriptionNotices(active.id, payment.periodNumber);
    await queueWebhookEvent(plan.merchant.projectId, payment.periodNumber === 1 ? "subscription.started" : "subscription.renewed", { subscriptionId: active.id, planId: plan.plan.id, paymentId: payment.id, periodNumber: payment.periodNumber, receiptNumber: payment.receiptNumber, transactionHash: result.transactionHash }); await deliverQueuedWebhooks(10);
    return { ...result, complete: true, subscription: formatSubscription(active, plan.plan, plan.merchant, [confirmed]) };
  }
  if (subscription?.status === "active") return { complete: true, subscription: formatSubscription(subscription, plan.plan, plan.merchant) };
  if (subscription?.status === "cancelled") throw new ApiError(409, "SUBSCRIPTION_CANCELLED", "This wallet previously cancelled the plan. Create a new plan or contact the merchant to re-enroll.");
  if (!subscription) [subscription] = await db.insert(subscriptions).values({ planId: plan.plan.id, subscriberUserId: input.userId, subscriberWalletId: wallet.id, subscriberAddress: wallet.address.toLowerCase(), merchantAddress: plan.merchant.settlementAddress }).returning();
  if (!payment) [payment] = await db.insert(subscriptionPayments).values({ subscriptionId: subscription.id, periodNumber: 1, amountAtomic: plan.plan.amountAtomic, receiptNumber: `SUB-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, dueAt: new Date() }).returning();
  return preparePayment(request, session, { subscription, plan: plan.plan, merchant: plan.merchant }, payment);
}

export async function subscriptionActionChallenge(request: Request, session: CurrentSession, input: { userId: string; action: "renew" | "cancel"; subscriptionId: string; paymentId?: string; challengeId?: string }) {
  const row = await subscriptionRow(input.subscriptionId); const wallet = arcWallet(session); const db = getDb();
  if (row.subscription.subscriberUserId !== input.userId || row.subscription.subscriberAddress !== wallet.address.toLowerCase()) throw new ApiError(403, "SUBSCRIPTION_OWNER_REQUIRED", "Only the subscriber can manage this subscription.");
  if (input.action === "cancel") {
    if (row.subscription.status === "cancelled") return { complete: true, subscription: formatSubscription(row.subscription, row.plan, row.merchant) };
    const [cancelled] = await db.update(subscriptions).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(subscriptions.id, row.subscription.id)).returning();
    await resolveSubscriptionNotices(cancelled.id);
    await queueWebhookEvent(row.merchant.projectId, "subscription.cancelled", { subscriptionId: row.subscription.id, planId: row.plan.id, cycleCount: row.subscription.cycleCount }); await deliverQueuedWebhooks(10);
    return { complete: true, subscription: formatSubscription(cancelled, row.plan, row.merchant) };
  }
  if (row.subscription.status !== "active") throw new ApiError(409, "SUBSCRIPTION_INACTIVE", "Only active subscriptions can renew.");
  if (!row.subscription.currentPeriodEnd || Date.now() < row.subscription.currentPeriodEnd.getTime() - renewalWindowMs) throw new ApiError(409, "RENEWAL_NOT_DUE", "Renewal opens three days before the current period ends.");
  const periodNumber = row.subscription.cycleCount + 1;
  let payment = input.paymentId ? await db.query.subscriptionPayments.findFirst({ where: eq(subscriptionPayments.id, input.paymentId) }) : await db.query.subscriptionPayments.findFirst({ where: and(eq(subscriptionPayments.subscriptionId, row.subscription.id), eq(subscriptionPayments.periodNumber, periodNumber)) });
  if (input.challengeId) {
    if (!payment || payment.subscriptionId !== row.subscription.id || payment.challengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This renewal does not belong to the subscription.");
    const result = await circleChallengeResult(request, session, input.challengeId); if (result.pending) return { ...result, subscriptionId: row.subscription.id, paymentId: payment.id };
    const paidAt = new Date(); const periodStart = row.subscription.currentPeriodEnd > paidAt ? row.subscription.currentPeriodEnd : paidAt; const periodEnd = new Date(periodStart.getTime() + row.plan.intervalDays * 86_400_000);
    const [confirmed] = await db.update(subscriptionPayments).set({ status: "confirmed", transactionHash: result.transactionHash, paidAt, updatedAt: paidAt }).where(eq(subscriptionPayments.id, payment.id)).returning();
    const [renewed] = await db.update(subscriptions).set({ cycleCount: periodNumber, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, updatedAt: paidAt }).where(eq(subscriptions.id, row.subscription.id)).returning();
    await resolveSubscriptionNotices(renewed.id, periodNumber);
    await queueWebhookEvent(row.merchant.projectId, "subscription.renewed", { subscriptionId: row.subscription.id, planId: row.plan.id, paymentId: payment.id, periodNumber, receiptNumber: payment.receiptNumber, transactionHash: result.transactionHash }); await deliverQueuedWebhooks(10);
    return { ...result, complete: true, subscription: formatSubscription(renewed, row.plan, row.merchant, [confirmed]) };
  }
  if (payment?.status === "confirmed") return { complete: true, subscription: formatSubscription(row.subscription, row.plan, row.merchant, [payment]) };
  if (!payment) [payment] = await db.insert(subscriptionPayments).values({ subscriptionId: row.subscription.id, periodNumber, amountAtomic: row.plan.amountAtomic, receiptNumber: `SUB-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, dueAt: row.subscription.currentPeriodEnd }).returning();
  return preparePayment(request, session, row, payment);
}

export async function pauseSubscriptionPlan(input: { userId: string; projectId: string; planId: string; status: "active" | "paused" }) {
  await projectAccess(input.userId, input.projectId); const merchant = await merchantForProject(input.projectId); if (!merchant) throw new ApiError(404, "MERCHANT_NOT_FOUND", "Merchant profile not found.");
  const [updated] = await getDb().update(subscriptionPlans).set({ status: input.status, updatedAt: new Date() }).where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.merchantId, merchant.id))).returning();
  if (!updated) throw new ApiError(404, "PLAN_NOT_FOUND", "Subscription plan not found."); return formatPlan(updated, merchant);
}
