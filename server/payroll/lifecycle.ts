import { and, eq, lte } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { auditEvents, payrollMembers, payrollRuns, payrollSchedules } from "../db/schema.js";
import { queueWebhookEvent, deliverQueuedWebhooks } from "../developer/webhooks.js";
import { addDays } from "./repository.js";

export async function reconcilePayrollLifecycle(now = new Date()) {
  const db = getDb();
  const due = await db.select().from(payrollSchedules).where(and(eq(payrollSchedules.status, "active"), lte(payrollSchedules.nextRunAt, now)));
  let created = 0;
  for (const schedule of due) {
    const members = await db.select({ amountAtomic: payrollMembers.amountAtomic }).from(payrollMembers).where(and(eq(payrollMembers.scheduleId, schedule.id), eq(payrollMembers.status, "active")));
    if (!members.length) continue;
    const totalAmountAtomic = members.reduce((sum, member) => sum + BigInt(member.amountAtomic), BigInt(0)).toString();
    const [run] = await db.insert(payrollRuns).values({ scheduleId: schedule.id, cycleAt: schedule.nextRunAt, memberCount: members.length, totalAmountAtomic }).onConflictDoNothing().returning();
    if (!run) continue;
    created += 1;
    await db.update(payrollSchedules).set({ nextRunAt: addDays(schedule.nextRunAt, schedule.cadenceDays), updatedAt: now }).where(and(eq(payrollSchedules.id, schedule.id), eq(payrollSchedules.nextRunAt, schedule.nextRunAt)));
    await db.insert(auditEvents).values({ actorType: "system", projectId: schedule.projectId, action: "payroll.run_due", resourceType: "payroll_run", resourceId: run.id, metadata: { memberCount: members.length, totalAmountAtomic, cycleAt: schedule.nextRunAt.toISOString() } });
    await queueWebhookEvent(schedule.projectId, "payroll.run_due", { scheduleId: schedule.id, runId: run.id, memberCount: members.length, totalAmountAtomic, cycleAt: schedule.nextRunAt.toISOString() });
  }
  const webhookDeliveries = await deliverQueuedWebhooks(50);
  return { scanned: due.length, created, webhookDeliveries, reconciledAt: now.toISOString() };
}
