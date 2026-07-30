import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  distributions,
  projectMembers,
  referralCodes,
  referrals,
  users,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { randomSecret } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "./webhooks.js";

async function projectIdsForUser(userId: string) {
  const memberships = await getDb().select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  return memberships.map((membership) => membership.projectId);
}

export async function createReferralCode(userId: string, distributionId: string) {
  const [campaign] = await getDb().select({
    id: distributions.id,
    projectId: distributions.projectId,
    name: distributions.name,
  }).from(distributions).where(eq(distributions.id, distributionId)).limit(1);
  if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign does not exist.");
  const existing = await getDb().query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.distributionId, distributionId),
      eq(referralCodes.referrerUserId, userId),
    ),
  });
  if (existing) return { code: existing.code, distributionId, campaignName: campaign.name };
  const [created] = await getDb().insert(referralCodes).values({
    distributionId,
    referrerUserId: userId,
    code: `ref_${randomSecret(10)}`,
  }).onConflictDoNothing().returning({ code: referralCodes.code });
  if (created) return { code: created.code, distributionId, campaignName: campaign.name };
  const recovered = await getDb().query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.distributionId, distributionId),
      eq(referralCodes.referrerUserId, userId),
    ),
  });
  if (!recovered) throw new ApiError(409, "REFERRAL_CONFLICT", "The referral code could not be created.");
  return { code: recovered.code, distributionId, campaignName: campaign.name };
}

export async function recordReferralClaim(distributionId: string, code: string, referredUserId: string) {
  const referralCode = await getDb().query.referralCodes.findFirst({
    where: and(eq(referralCodes.distributionId, distributionId), eq(referralCodes.code, code)),
  });
  if (!referralCode || referralCode.referrerUserId === referredUserId) return null;
  const [record] = await getDb().insert(referrals).values({
    distributionId,
    referrerUserId: referralCode.referrerUserId,
    referredUserId,
    code,
    status: "claimed",
  }).onConflictDoUpdate({
    target: [referrals.distributionId, referrals.referrerUserId, referrals.referredUserId],
    set: { code, status: "claimed", updatedAt: new Date() },
  }).returning({ id: referrals.id });
  const campaign = await getDb().query.distributions.findFirst({ where: eq(distributions.id, distributionId) });
  if (campaign) {
    await queueWebhookEvent(campaign.projectId, "referral.attributed", {
      referralId: record.id,
      distributionId,
      referredUserId,
      code,
      stage: "claimed",
    });
    await deliverQueuedWebhooks(10);
  }
  return record;
}

export async function markReferralActivated(distributionId: string, referredUserId: string) {
  return getDb().update(referrals).set({ status: "activated", updatedAt: new Date() })
    .where(and(
      eq(referrals.distributionId, distributionId),
      eq(referrals.referredUserId, referredUserId),
    ))
    .returning({ id: referrals.id, referrerUserId: referrals.referrerUserId, code: referrals.code });
}

export async function referralAnalytics(userId: string) {
  const projectIds = await projectIdsForUser(userId);
  if (!projectIds.length) return { totals: { referrals: 0, claimed: 0, activated: 0, activationRate: 0 }, codes: [], sources: [] };
  const campaignRows = await getDb().select({
    id: distributions.id,
    name: distributions.name,
  }).from(distributions).where(inArray(distributions.projectId, projectIds));
  const campaignIds = campaignRows.map((campaign) => campaign.id);
  if (!campaignIds.length) return { totals: { referrals: 0, claimed: 0, activated: 0, activationRate: 0 }, codes: [], sources: [] };
  const [codeRows, referralRows] = await Promise.all([
    getDb().select({
      id: referralCodes.id,
      distributionId: referralCodes.distributionId,
      code: referralCodes.code,
      referrerUserId: referralCodes.referrerUserId,
      referrerName: users.displayName,
      createdAt: referralCodes.createdAt,
    }).from(referralCodes)
      .innerJoin(users, eq(users.id, referralCodes.referrerUserId))
      .where(inArray(referralCodes.distributionId, campaignIds))
      .orderBy(desc(referralCodes.createdAt)),
    getDb().select({
      id: referrals.id,
      distributionId: referrals.distributionId,
      referrerUserId: referrals.referrerUserId,
      referredUserId: referrals.referredUserId,
      code: referrals.code,
      status: referrals.status,
      createdAt: referrals.createdAt,
    }).from(referrals).where(inArray(referrals.distributionId, campaignIds)),
  ]);
  const campaignsById = new Map(campaignRows.map((campaign) => [campaign.id, campaign.name]));
  const sourceMap = new Map<string, {
    referrerUserId: string;
    name: string;
    code: string;
    claimed: number;
    activated: number;
  }>();
  for (const code of codeRows) {
    sourceMap.set(code.referrerUserId, {
      referrerUserId: code.referrerUserId,
      name: code.referrerName ?? "Current user",
      code: code.code,
      claimed: 0,
      activated: 0,
    });
  }
  for (const referral of referralRows) {
    if (!referral.referrerUserId) continue;
    const source = sourceMap.get(referral.referrerUserId);
    if (!source) continue;
    source.claimed += 1;
    if (referral.status === "activated") source.activated += 1;
  }
  const activated = referralRows.filter((referral) => referral.status === "activated").length;
  const claimed = referralRows.length;
  return {
    totals: {
      referrals: codeRows.length,
      claimed,
      activated,
      activationRate: claimed ? Math.round((activated / claimed) * 10_000) / 100 : 0,
    },
    codes: codeRows.map((code) => ({
      id: code.id,
      campaignId: code.distributionId,
      campaignName: campaignsById.get(code.distributionId) ?? "Campaign",
      code: code.code,
      referrerName: code.referrerName ?? "Current user",
      createdAt: code.createdAt.toISOString(),
    })),
    sources: [...sourceMap.values()]
      .map((source) => ({
        ...source,
        activationRate: source.claimed ? Math.round((source.activated / source.claimed) * 10_000) / 100 : 0,
      }))
      .sort((left, right) => right.activated - left.activated || right.claimed - left.claimed),
  };
}
