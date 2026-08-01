import { and, eq, lte } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  auditEvents,
  merchantAccounts,
  subscriptionNotices,
  subscriptionPlans,
  subscriptions,
} from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

const renewalWindowMs = 3 * 86_400_000;

export function subscriptionLifecycleKind(periodEnd: Date, now = new Date()) {
  if (periodEnd <= now) return "past_due" as const;
  if (periodEnd.getTime() <= now.getTime() + renewalWindowMs) return "renewal_due" as const;
  return null;
}

export async function reconcileSubscriptionLifecycle(now = new Date()) {
  const db = getDb();
  const renewalCutoff = new Date(now.getTime() + renewalWindowMs);
  const rows = await db.select({
    subscription: subscriptions,
    plan: subscriptionPlans,
    merchant: merchantAccounts,
  }).from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
    .innerJoin(merchantAccounts, eq(merchantAccounts.id, subscriptionPlans.merchantId))
    .where(and(
      eq(subscriptions.status, "active"),
      lte(subscriptions.currentPeriodEnd, renewalCutoff),
    ));

  let renewalDue = 0;
  let pastDue = 0;
  for (const row of rows) {
    if (!row.subscription.currentPeriodEnd) continue;
    const kind = subscriptionLifecycleKind(row.subscription.currentPeriodEnd, now);
    if (!kind) continue;
    const periodNumber = row.subscription.cycleCount + 1;
    if (kind === "past_due") {
      await db.update(subscriptionNotices).set({ status: "superseded", acknowledgedAt: now, updatedAt: now }).where(and(
        eq(subscriptionNotices.subscriptionId, row.subscription.id),
        eq(subscriptionNotices.periodNumber, periodNumber),
        eq(subscriptionNotices.kind, "renewal_due"),
        eq(subscriptionNotices.status, "open"),
      ));
    }
    const [notice] = await db.insert(subscriptionNotices).values({
      subscriptionId: row.subscription.id,
      periodNumber,
      kind,
      dueAt: row.subscription.currentPeriodEnd,
      metadata: {
        planId: row.plan.id,
        planTitle: row.plan.title,
        amountAtomic: row.plan.amountAtomic,
        subscriberAddress: row.subscription.subscriberAddress,
      },
    }).onConflictDoNothing().returning();
    if (!notice) continue;
    if (kind === "past_due") pastDue += 1;
    else renewalDue += 1;
    await db.insert(auditEvents).values({
      actorType: "system",
      projectId: row.merchant.projectId,
      action: `subscription.${kind}`,
      resourceType: "subscription",
      resourceId: row.subscription.id,
      metadata: { noticeId: notice.id, periodNumber, dueAt: notice.dueAt.toISOString() },
    });
    await queueWebhookEvent(
      row.merchant.projectId,
      kind === "past_due" ? "subscription.past_due" : "subscription.renewal_due",
      {
        noticeId: notice.id,
        subscriptionId: row.subscription.id,
        planId: row.plan.id,
        periodNumber,
        amountAtomic: row.plan.amountAtomic,
        dueAt: row.subscription.currentPeriodEnd.toISOString(),
      },
    );
  }
  const delivery = await deliverQueuedWebhooks(50);
  return {
    scanned: rows.length,
    created: renewalDue + pastDue,
    renewalDue,
    pastDue,
    webhookDeliveries: delivery,
    reconciledAt: now.toISOString(),
  };
}

export async function resolveSubscriptionNotices(subscriptionId: string, periodNumber?: number) {
  const conditions = [
    eq(subscriptionNotices.subscriptionId, subscriptionId),
    eq(subscriptionNotices.status, "open"),
  ];
  if (periodNumber !== undefined) conditions.push(eq(subscriptionNotices.periodNumber, periodNumber));
  const resolvedAt = new Date();
  const rows = await getDb().update(subscriptionNotices).set({
    status: "resolved",
    acknowledgedAt: resolvedAt,
    updatedAt: resolvedAt,
  }).where(and(...conditions)).returning({ id: subscriptionNotices.id });
  return rows.length;
}
