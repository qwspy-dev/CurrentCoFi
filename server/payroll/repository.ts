import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  auditEvents,
  distributions,
  payrollMembers,
  payrollRuns,
  payrollSchedules,
  projectMembers,
  tokens,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { createCampaign, formatAtomic, projectAccess, resolveToken, toAtomic, type CampaignRecipientInput } from "../campaigns/repository.js";
import { normalizeBoundIdentity } from "../claims/identity-binding.js";
import { openSecret, sealSecret, sha256 } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type PayrollMemberInput = CampaignRecipientInput & { displayName?: string; role?: string };

const supportedCadences = new Set([7, 14, 30]);

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

function mask(type: PayrollMemberInput["identityType"], value: string) {
  if (type === "email") {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
  }
  if (type === "wallet") return `${value.slice(0, 7)}…${value.slice(-5)}`;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function validName(value: string, label: string, max = 100) {
  const result = value.trim();
  if (!result || result.length > max) throw new ApiError(400, "INVALID_PAYROLL", `${label} must contain 1–${max} characters.`);
  return result;
}

async function payrollProjectForUser(userId: string) {
  const row = await getDb().select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))
    .orderBy(asc(projectMembers.createdAt))
    .limit(1);
  if (!row[0]) throw new ApiError(409, "PROJECT_REQUIRED", "Create a project before setting up community payroll.");
  return row[0].projectId;
}

export async function createPayrollSchedule(input: {
  userId: string;
  name: string;
  tokenAddress?: string;
  cadenceDays: number;
  nextRunAt: Date;
  claimExpiresHours: number;
  refundAddress: string;
  members: PayrollMemberInput[];
}) {
  const projectId = await payrollProjectForUser(input.userId);
  await projectAccess(input.userId, projectId);
  if (!supportedCadences.has(input.cadenceDays)) throw new ApiError(400, "INVALID_CADENCE", "Payroll cadence must be weekly, biweekly, or monthly.");
  if (!input.members.length || input.members.length > 1_000) throw new ApiError(400, "INVALID_ROSTER", "Payroll requires 1–1,000 contributors.");
  if (!Number.isInteger(input.claimExpiresHours) || input.claimExpiresHours < 24 || input.claimExpiresHours > 720) {
    throw new ApiError(400, "INVALID_EXPIRATION", "Payroll claims must remain open for 24–720 hours.");
  }
  const token = await resolveToken(projectId, input.tokenAddress);
  const prepared = await Promise.all(input.members.map(async (member, index) => {
    const identity = normalizeBoundIdentity(member.identityType, member.identity);
    const identityHash = await sha256(`${member.identityType}:${identity}`);
    return {
      identityType: member.identityType,
      identityHash,
      identityCiphertext: await sealSecret(identity),
      maskedIdentity: mask(member.identityType, identity),
      displayName: validName(member.displayName || `Contributor ${index + 1}`, "Contributor name", 80),
      role: member.role?.trim().slice(0, 80) || null,
      amountAtomic: toAtomic(member.amount, token.decimals),
    };
  }));
  if (new Set(prepared.map((member) => member.identityHash)).size !== prepared.length) {
    throw new ApiError(400, "DUPLICATE_RECIPIENT", "Each payroll identity may appear only once.");
  }
  const db = getDb();
  const [schedule] = await db.insert(payrollSchedules).values({
    projectId,
    creatorUserId: input.userId,
    tokenId: token.id,
    name: validName(input.name, "Payroll name"),
    cadenceDays: input.cadenceDays,
    nextRunAt: input.nextRunAt,
    claimExpiresHours: input.claimExpiresHours,
    refundAddress: input.refundAddress.toLowerCase(),
    metadata: { rosterEncrypted: true, settlement: "walletless-campaign", network: "ARC-TESTNET" },
  }).returning();
  await db.insert(payrollMembers).values(prepared.map((member) => ({ ...member, scheduleId: schedule.id })));
  await db.insert(auditEvents).values({
    actorType: "user", actorId: input.userId, projectId, action: "payroll.schedule_created",
    resourceType: "payroll_schedule", resourceId: schedule.id,
    metadata: { cadenceDays: input.cadenceDays, memberCount: prepared.length, asset: token.symbol },
  });
  await queueWebhookEvent(projectId, "payroll.schedule_created", { scheduleId: schedule.id, memberCount: prepared.length, asset: token.symbol, nextRunAt: input.nextRunAt.toISOString() });
  await deliverQueuedWebhooks(10);
  return { id: schedule.id, name: schedule.name, status: schedule.status };
}

async function scheduleForUser(userId: string, scheduleId: string) {
  const row = await getDb().select({ schedule: payrollSchedules, token: tokens })
    .from(payrollSchedules)
    .innerJoin(tokens, eq(tokens.id, payrollSchedules.tokenId))
    .where(eq(payrollSchedules.id, scheduleId)).limit(1);
  if (!row[0]) throw new ApiError(404, "PAYROLL_NOT_FOUND", "Payroll schedule not found.");
  await projectAccess(userId, row[0].schedule.projectId);
  return row[0];
}

export async function setPayrollStatus(userId: string, scheduleId: string, status: "active" | "paused") {
  const { schedule } = await scheduleForUser(userId, scheduleId);
  const [updated] = await getDb().update(payrollSchedules).set({ status, updatedAt: new Date() }).where(eq(payrollSchedules.id, scheduleId)).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: userId, projectId: schedule.projectId, action: `payroll.${status}`, resourceType: "payroll_schedule", resourceId: scheduleId });
  return { id: updated.id, status: updated.status };
}

export async function preparePayrollRun(input: { userId: string; displayName: string; scheduleId: string; origin: string }) {
  const { schedule, token } = await scheduleForUser(input.userId, input.scheduleId);
  if (schedule.status !== "active") throw new ApiError(409, "PAYROLL_PAUSED", "Resume this payroll before preparing a run.");
  const members = await getDb().select().from(payrollMembers).where(and(eq(payrollMembers.scheduleId, schedule.id), eq(payrollMembers.status, "active"))).orderBy(asc(payrollMembers.createdAt));
  if (!members.length) throw new ApiError(409, "EMPTY_ROSTER", "Add an active contributor before preparing payroll.");
  const dueRun = await getDb().query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.scheduleId, schedule.id), eq(payrollRuns.status, "ready")),
    orderBy: asc(payrollRuns.cycleAt),
  });
  const cycleAt = dueRun?.cycleAt ?? schedule.nextRunAt;
  const totalAmountAtomic = members.reduce((sum, member) => sum + BigInt(member.amountAtomic), BigInt(0)).toString();
  let run = dueRun ?? await getDb().query.payrollRuns.findFirst({ where: and(eq(payrollRuns.scheduleId, schedule.id), eq(payrollRuns.cycleAt, cycleAt)) });
  if (run?.distributionId) return { runId: run.id, distributionId: run.distributionId, status: run.status, reused: true };
  if (!run) {
    [run] = await getDb().insert(payrollRuns).values({ scheduleId: schedule.id, cycleAt, memberCount: members.length, totalAmountAtomic }).onConflictDoNothing().returning();
    if (!run) run = await getDb().query.payrollRuns.findFirst({ where: and(eq(payrollRuns.scheduleId, schedule.id), eq(payrollRuns.cycleAt, cycleAt)) });
  }
  if (!run) throw new ApiError(409, "PAYROLL_RUN_CONFLICT", "This pay cycle is already being prepared.");
  const recipients = await Promise.all(members.map(async (member) => ({
    identityType: member.identityType as CampaignRecipientInput["identityType"],
    identity: await openSecret(member.identityCiphertext),
    amount: formatAtomic(member.amountAtomic, token.decimals),
  })));
  const campaign = await createCampaign({
    userId: input.userId,
    displayName: input.displayName,
    projectId: schedule.projectId,
    refundAddress: schedule.refundAddress,
    origin: input.origin,
    name: `${schedule.name} · ${cycleAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`,
    tokenAddress: token.contractAddress,
    recipients,
    expiresInHours: schedule.claimExpiresHours,
    activationEvent: "payroll.claimed",
    claimMode: "identity-bound",
  });
  const now = new Date();
  await getDb().update(payrollRuns).set({ distributionId: campaign.id, status: "awaiting_funding", preparedAt: now, updatedAt: now }).where(eq(payrollRuns.id, run.id));
  await getDb().update(payrollSchedules).set({ nextRunAt: addDays(cycleAt, schedule.cadenceDays), updatedAt: now }).where(and(eq(payrollSchedules.id, schedule.id), eq(payrollSchedules.nextRunAt, cycleAt)));
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: schedule.projectId, action: "payroll.run_prepared", resourceType: "payroll_run", resourceId: run.id, metadata: { distributionId: campaign.id, memberCount: members.length, totalAmountAtomic } });
  await queueWebhookEvent(schedule.projectId, "payroll.run_prepared", { scheduleId: schedule.id, runId: run.id, distributionId: campaign.id, memberCount: members.length, totalAmountAtomic });
  await deliverQueuedWebhooks(10);
  return { runId: run.id, distributionId: campaign.id, status: "awaiting_funding", campaign, reused: false };
}

export async function listPayroll(userId: string) {
  const projectId = await payrollProjectForUser(userId);
  await projectAccess(userId, projectId);
  const db = getDb();
  const scheduleRows = await db.select({ schedule: payrollSchedules, token: tokens }).from(payrollSchedules).innerJoin(tokens, eq(tokens.id, payrollSchedules.tokenId)).where(eq(payrollSchedules.projectId, projectId)).orderBy(desc(payrollSchedules.createdAt));
  const result = await Promise.all(scheduleRows.map(async ({ schedule, token }) => {
    const [members, runs] = await Promise.all([
      db.select().from(payrollMembers).where(eq(payrollMembers.scheduleId, schedule.id)).orderBy(asc(payrollMembers.createdAt)),
      db.select({ run: payrollRuns, distributionStatus: distributions.status }).from(payrollRuns).leftJoin(distributions, eq(distributions.id, payrollRuns.distributionId)).where(eq(payrollRuns.scheduleId, schedule.id)).orderBy(desc(payrollRuns.cycleAt)),
    ]);
    const active = members.filter((member) => member.status === "active");
    const totalAtomic = active.reduce((sum, member) => sum + BigInt(member.amountAtomic), BigInt(0)).toString();
    return {
      id: schedule.id, name: schedule.name, status: schedule.status, cadenceDays: schedule.cadenceDays,
      nextRunAt: schedule.nextRunAt.toISOString(), claimExpiresHours: schedule.claimExpiresHours,
      asset: { symbol: token.symbol, name: token.name, address: token.contractAddress, decimals: token.decimals },
      memberCount: active.length, totalAmount: formatAtomic(totalAtomic, token.decimals), totalAmountAtomic: totalAtomic,
      members: members.map((member) => ({ id: member.id, displayName: member.displayName, role: member.role, identityType: member.identityType, maskedIdentity: member.maskedIdentity, amount: formatAtomic(member.amountAtomic, token.decimals), status: member.status })),
      runs: runs.map(({ run, distributionStatus }) => ({ id: run.id, distributionId: run.distributionId, cycleAt: run.cycleAt.toISOString(), status: distributionStatus ?? run.status, memberCount: run.memberCount, totalAmount: formatAtomic(run.totalAmountAtomic, token.decimals), preparedAt: run.preparedAt?.toISOString() ?? null })),
    };
  }));
  return {
    schedules: result,
    totals: {
      schedules: result.length,
      activeSchedules: result.filter((item) => item.status === "active").length,
      contributors: result.reduce((sum, item) => sum + item.memberCount, 0),
      preparedRuns: result.reduce((sum, item) => sum + item.runs.length, 0),
    },
    privacy: "Contributor identities are encrypted at rest; only masked labels are returned to the workspace.",
  };
}

export { addDays };
