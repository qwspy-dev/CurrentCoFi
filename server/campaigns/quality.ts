import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  activationEvents,
  allocations,
  auditEvents,
  campaignQualityPolicies,
  claims,
  distributions,
  participantQualityAssessments,
  projectMembers,
  referrals,
  users,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type QualityPolicy = {
  reviewThreshold: number;
  holdThreshold: number;
  burstWindowMinutes: number;
  burstReferralCount: number;
  minimumAccountAgeMinutes: number;
  minimumActivationDelaySeconds: number;
  action: "monitor" | "review" | "hold-referral-reward";
};

export const DEFAULT_QUALITY_POLICY: QualityPolicy = {
  reviewThreshold: 45,
  holdThreshold: 70,
  burstWindowMinutes: 10,
  burstReferralCount: 8,
  minimumAccountAgeMinutes: 60,
  minimumActivationDelaySeconds: 30,
  action: "review",
};

export function evaluateQualitySignals(input: {
  accountAgeMinutes: number;
  activationDelaySeconds: number | null;
  referralsInBurstWindow: number;
  distinctActivationTypes: number;
  ageSinceClaimHours: number;
  policy?: QualityPolicy;
}) {
  const policy = input.policy ?? DEFAULT_QUALITY_POLICY;
  const signals: Array<{ id: string; weight: number; evidence: string }> = [];
  if (input.accountAgeMinutes < policy.minimumAccountAgeMinutes) signals.push({
    id: "fresh-account", weight: 25,
    evidence: `Account was ${Math.max(0, Math.round(input.accountAgeMinutes))} minutes old at referral claim.`,
  });
  if (input.referralsInBurstWindow >= policy.burstReferralCount) signals.push({
    id: "referral-burst", weight: 35,
    evidence: `${input.referralsInBurstWindow} referrals arrived inside ${policy.burstWindowMinutes} minutes from one source.`,
  });
  if (input.activationDelaySeconds !== null && input.activationDelaySeconds < policy.minimumActivationDelaySeconds) signals.push({
    id: "instant-activation", weight: 25,
    evidence: `Activation followed the claim in ${Math.max(0, Math.round(input.activationDelaySeconds))} seconds.`,
  });
  if (input.distinctActivationTypes === 1 && input.ageSinceClaimHours >= 24) signals.push({
    id: "single-action-only", weight: 10,
    evidence: "The participant has only one activation type after at least 24 hours.",
  });
  if (input.distinctActivationTypes === 0 && input.ageSinceClaimHours >= 168) signals.push({
    id: "no-seven-day-activation", weight: 15,
    evidence: "No verified activation was recorded within the first seven days.",
  });
  const score = Math.min(100, signals.reduce((sum, signal) => sum + signal.weight, 0));
  const band = score >= policy.holdThreshold ? "high" : score >= policy.reviewThreshold ? "review" : "low";
  const decision = band === "high" && policy.action === "hold-referral-reward"
    ? "hold-referral-reward"
    : band === "low" ? "allow" : "manual-review";
  return { score, band, decision, signals } as const;
}

function boundedInteger(value: unknown, field: string, minimum: number, maximum: number, fallback: number) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new ApiError(400, "INVALID_QUALITY_POLICY", `${field} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

function policyFromRow(row?: typeof campaignQualityPolicies.$inferSelect | null): QualityPolicy {
  return row ? {
    reviewThreshold: row.reviewThreshold,
    holdThreshold: row.holdThreshold,
    burstWindowMinutes: row.burstWindowMinutes,
    burstReferralCount: row.burstReferralCount,
    minimumAccountAgeMinutes: row.minimumAccountAgeMinutes,
    minimumActivationDelaySeconds: row.minimumActivationDelaySeconds,
    action: row.action as QualityPolicy["action"],
  } : DEFAULT_QUALITY_POLICY;
}

async function requireProjectAccess(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({
    where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)),
  });
  if (!membership || !["owner", "admin", "operator", "analyst"].includes(membership.role)) {
    throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot inspect campaign quality for this project.");
  }
}

async function requireCampaign(projectId: string, distributionId: string) {
  const campaign = await getDb().query.distributions.findFirst({
    where: and(eq(distributions.id, distributionId), eq(distributions.projectId, projectId)),
  });
  if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign is unavailable.");
  return campaign;
}

export async function updateQualityPolicy(input: {
  projectId: string; userId?: string; actorKeyId?: string; distributionId: string; body: Record<string, unknown>;
}) {
  if (input.userId) await requireProjectAccess(input.userId, input.projectId);
  const campaign = await requireCampaign(input.projectId, input.distributionId);
  const action = String(input.body.enforcementAction ?? DEFAULT_QUALITY_POLICY.action);
  if (!["monitor", "review", "hold-referral-reward"].includes(action)) {
    throw new ApiError(400, "INVALID_QUALITY_POLICY", "action must be monitor, review, or hold-referral-reward.");
  }
  const policy: QualityPolicy = {
    reviewThreshold: boundedInteger(input.body.reviewThreshold, "reviewThreshold", 1, 99, 45),
    holdThreshold: boundedInteger(input.body.holdThreshold, "holdThreshold", 2, 100, 70),
    burstWindowMinutes: boundedInteger(input.body.burstWindowMinutes, "burstWindowMinutes", 1, 1_440, 10),
    burstReferralCount: boundedInteger(input.body.burstReferralCount, "burstReferralCount", 2, 10_000, 8),
    minimumAccountAgeMinutes: boundedInteger(input.body.minimumAccountAgeMinutes, "minimumAccountAgeMinutes", 0, 43_200, 60),
    minimumActivationDelaySeconds: boundedInteger(input.body.minimumActivationDelaySeconds, "minimumActivationDelaySeconds", 0, 86_400, 30),
    action: action as QualityPolicy["action"],
  };
  if (policy.holdThreshold <= policy.reviewThreshold) throw new ApiError(400, "INVALID_QUALITY_POLICY", "holdThreshold must be greater than reviewThreshold.");
  const [row] = await getDb().insert(campaignQualityPolicies).values({
    projectId: input.projectId, distributionId: input.distributionId, updatedByUserId: input.userId, ...policy,
  }).onConflictDoUpdate({
    target: campaignQualityPolicies.distributionId,
    set: { ...policy, updatedByUserId: input.userId, updatedAt: new Date() },
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId,
    projectId: input.projectId, action: "quality.policy-updated", resourceType: "distribution",
    resourceId: input.distributionId, metadata: policy,
  });
  return {
    distributionId: row.distributionId,
    campaignName: campaign.name,
    configured: true,
    ...policyFromRow(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function evaluateCampaignQuality(input: {
  projectId: string; userId?: string; actorKeyId?: string; distributionId: string;
}) {
  if (input.userId) await requireProjectAccess(input.userId, input.projectId);
  await requireCampaign(input.projectId, input.distributionId);
  const db = getDb();
  const [policyRow, referralRows] = await Promise.all([
    db.query.campaignQualityPolicies.findFirst({ where: eq(campaignQualityPolicies.distributionId, input.distributionId) }),
    db.select().from(referrals).where(eq(referrals.distributionId, input.distributionId)).orderBy(desc(referrals.createdAt)),
  ]);
  const policy = policyFromRow(policyRow);
  const userIds = [...new Set(referralRows.flatMap((row) => [row.referrerUserId, row.referredUserId]).filter((id): id is string => Boolean(id)))];
  const [userRows, eventRows] = await Promise.all([
    userIds.length ? db.select({ id: users.id, createdAt: users.createdAt }).from(users).where(inArray(users.id, userIds)) : [],
    db.select().from(activationEvents).where(eq(activationEvents.distributionId, input.distributionId)),
  ]);
  const usersById = new Map(userRows.map((row) => [row.id, row]));
  const eventsByUser = new Map<string, typeof eventRows>();
  for (const event of eventRows) if (event.userId) eventsByUser.set(event.userId, [...(eventsByUser.get(event.userId) ?? []), event]);
  const assessments = [];
  for (const referral of referralRows) {
    if (!referral.referredUserId) continue;
    const createdAt = referral.createdAt.getTime();
    const accountCreatedAt = usersById.get(referral.referredUserId)?.createdAt.getTime() ?? createdAt;
    const relatedEvents = eventsByUser.get(referral.referredUserId) ?? [];
    const firstActivation = relatedEvents.toSorted((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())[0];
    const windowMs = policy.burstWindowMinutes * 60_000;
    const referralsInBurstWindow = referralRows.filter((candidate) =>
      candidate.referrerUserId === referral.referrerUserId && Math.abs(candidate.createdAt.getTime() - createdAt) <= windowMs,
    ).length;
    const result = evaluateQualitySignals({
      accountAgeMinutes: (createdAt - accountCreatedAt) / 60_000,
      activationDelaySeconds: firstActivation ? (firstActivation.occurredAt.getTime() - createdAt) / 1_000 : null,
      referralsInBurstWindow,
      distinctActivationTypes: new Set(relatedEvents.map((event) => event.eventType)).size,
      ageSinceClaimHours: (Date.now() - createdAt) / 3_600_000,
      policy,
    });
    const [assessment] = await db.insert(participantQualityAssessments).values({
      projectId: input.projectId, distributionId: input.distributionId, referralId: referral.id,
      subjectUserId: referral.referredUserId, ...result, policySnapshot: policy, evaluatedAt: new Date(),
    }).onConflictDoUpdate({
      target: participantQualityAssessments.referralId,
      set: { ...result, policySnapshot: policy, evaluatedAt: new Date(), updatedAt: new Date() },
    }).returning();
    assessments.push(assessment);
  }
  const totals = {
    evaluated: assessments.length,
    allowed: assessments.filter((row) => row.decision === "allow").length,
    review: assessments.filter((row) => row.decision === "manual-review").length,
    held: assessments.filter((row) => row.decision === "hold-referral-reward").length,
  };
  await db.insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId,
    projectId: input.projectId, action: "quality.campaign-evaluated", resourceType: "distribution",
    resourceId: input.distributionId, metadata: totals,
  });
  await queueWebhookEvent(input.projectId, "quality.assessed", { distributionId: input.distributionId, totals });
  await deliverQueuedWebhooks(10);
  return totals;
}

function retentionWindow(claimedAt: Date, events: Array<{ occurredAt: Date }>, days: number, now: number) {
  const threshold = claimedAt.getTime() + days * 86_400_000;
  if (now < threshold) return { eligible: false, retained: false };
  return { eligible: true, retained: events.some((event) => event.occurredAt.getTime() >= threshold) };
}

export async function campaignQualitySnapshot(projectId: string) {
  const db = getDb();
  const campaignRows = await db.select({ id: distributions.id, name: distributions.name }).from(distributions).where(eq(distributions.projectId, projectId));
  const campaignIds = campaignRows.map((row) => row.id);
  if (!campaignIds.length) return { totals: { evaluated: 0, allowed: 0, review: 0, held: 0 }, retention: { day1: 0, day7: 0, day30: 0, returning: 0 }, cohorts: [], policies: [], reviewQueue: [] };
  const [assessmentRows, policyRows, claimRows, eventRows] = await Promise.all([
    db.select().from(participantQualityAssessments).where(inArray(participantQualityAssessments.distributionId, campaignIds)).orderBy(desc(participantQualityAssessments.evaluatedAt)),
    db.select().from(campaignQualityPolicies).where(inArray(campaignQualityPolicies.distributionId, campaignIds)),
    db.select({ userId: claims.claimantUserId, confirmedAt: claims.confirmedAt, distributionId: allocations.distributionId })
      .from(claims).innerJoin(allocations, eq(allocations.id, claims.allocationId))
      .where(and(inArray(allocations.distributionId, campaignIds), eq(claims.status, "confirmed"))),
    db.select({ userId: activationEvents.userId, occurredAt: activationEvents.occurredAt, eventType: activationEvents.eventType })
      .from(activationEvents).where(inArray(activationEvents.distributionId, campaignIds)),
  ]);
  const eventsByUser = new Map<string, typeof eventRows>();
  for (const event of eventRows) if (event.userId) eventsByUser.set(event.userId, [...(eventsByUser.get(event.userId) ?? []), event]);
  const now = Date.now();
  const windows = { day1: { eligible: 0, retained: 0 }, day7: { eligible: 0, retained: 0 }, day30: { eligible: 0, retained: 0 } };
  const cohortMap = new Map<string, { claimed: number; eligibleDay7: number; retainedDay7: number }>();
  let returning = 0;
  for (const claim of claimRows) {
    if (!claim.userId || !claim.confirmedAt) continue;
    const events = (eventsByUser.get(claim.userId) ?? []).toSorted((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    if (events.length >= 2 && events.at(-1)!.occurredAt.getTime() - events[0].occurredAt.getTime() >= 86_400_000) returning += 1;
    for (const [key, days] of [["day1", 1], ["day7", 7], ["day30", 30]] as const) {
      const result = retentionWindow(claim.confirmedAt, events, days, now);
      if (result.eligible) windows[key].eligible += 1;
      if (result.retained) windows[key].retained += 1;
    }
    const monday = new Date(claim.confirmedAt); monday.setUTCHours(0, 0, 0, 0); monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const cohort = cohortMap.get(key) ?? { claimed: 0, eligibleDay7: 0, retainedDay7: 0 };
    cohort.claimed += 1; const day7 = retentionWindow(claim.confirmedAt, events, 7, now);
    if (day7.eligible) cohort.eligibleDay7 += 1; if (day7.retained) cohort.retainedDay7 += 1; cohortMap.set(key, cohort);
  }
  const rate = (value: { eligible: number; retained: number }) => value.eligible ? Math.round(value.retained / value.eligible * 10_000) / 100 : 0;
  const campaignNames = new Map(campaignRows.map((row) => [row.id, row.name]));
  return {
    totals: {
      evaluated: assessmentRows.length,
      allowed: assessmentRows.filter((row) => row.decision === "allow").length,
      review: assessmentRows.filter((row) => row.decision === "manual-review").length,
      held: assessmentRows.filter((row) => row.decision === "hold-referral-reward").length,
    },
    retention: { day1: rate(windows.day1), day7: rate(windows.day7), day30: rate(windows.day30), returning },
    cohorts: [...cohortMap.entries()].map(([week, cohort]) => ({ week, ...cohort, day7Rate: cohort.eligibleDay7 ? Math.round(cohort.retainedDay7 / cohort.eligibleDay7 * 10_000) / 100 : 0 })).toSorted((left, right) => right.week.localeCompare(left.week)).slice(0, 8),
    policies: campaignRows.map((campaign) => {
      const row = policyRows.find((candidate) => candidate.distributionId === campaign.id);
      return { distributionId: campaign.id, campaignName: campaign.name, configured: Boolean(row), ...policyFromRow(row) };
    }),
    reviewQueue: assessmentRows.filter((row) => row.decision !== "allow").slice(0, 100).map((row) => ({
      id: row.id, distributionId: row.distributionId, campaignName: campaignNames.get(row.distributionId) ?? "Campaign",
      score: row.score, band: row.band, decision: row.decision, signals: row.signals, evaluatedAt: row.evaluatedAt.toISOString(),
    })),
  };
}

export async function userCampaignQuality(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId);
  return campaignQualitySnapshot(projectId);
}
