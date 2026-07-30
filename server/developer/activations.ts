import { and, count, eq, gte } from "drizzle-orm";
import type { AuthenticatedDeveloperKey } from "./keys.js";
import { getDb } from "../db/client.js";
import {
  activationEvents,
  allocations,
  claims,
  distributions,
  wallets,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { markReferralActivated } from "./referrals.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "./webhooks.js";

type ActivationInput = {
  externalEventId?: unknown;
  eventType?: unknown;
  distributionId?: unknown;
  walletAddress?: unknown;
  occurredAt?: unknown;
  payload?: unknown;
};

function stringField(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, "INVALID_ACTIVATION", `${field} is required and invalid.`);
  }
  return value.trim();
}

export async function ingestActivationEvent(key: AuthenticatedDeveloperKey, input: ActivationInput) {
  const externalEventId = stringField(input.externalEventId, "externalEventId", 160);
  const eventType = stringField(input.eventType, "eventType", 100);
  const distributionId = stringField(input.distributionId, "distributionId", 80);
  const walletAddress = stringField(input.walletAddress, "walletAddress", 80).toLowerCase();
  if (!/^[a-z][a-z0-9_.-]{2,99}$/i.test(eventType)) {
    throw new ApiError(400, "INVALID_EVENT_TYPE", "eventType must use a stable dotted identifier.");
  }
  if (!/^0x[0-9a-f]{40}$/i.test(walletAddress)) {
    throw new ApiError(400, "INVALID_WALLET", "walletAddress must be an Arc EVM address.");
  }
  const occurredAt = input.occurredAt ? new Date(String(input.occurredAt)) : new Date();
  if (
    Number.isNaN(occurredAt.getTime()) ||
    Math.abs(Date.now() - occurredAt.getTime()) > 30 * 24 * 60 * 60 * 1_000
  ) {
    throw new ApiError(400, "INVALID_OCCURRED_AT", "occurredAt must be within 30 days of the current time.");
  }
  const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
    ? input.payload as Record<string, unknown>
    : {};
  const [campaign] = await getDb().select({
    id: distributions.id,
    projectId: distributions.projectId,
    name: distributions.name,
  }).from(distributions).where(eq(distributions.id, distributionId)).limit(1);
  if (!campaign || campaign.projectId !== key.projectId) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign is not available to the API key.");
  }
  const allowedEventTypes = Array.isArray(key.policies.allowedEventTypes)
    ? key.policies.allowedEventTypes.map(String)
    : [];
  if (allowedEventTypes.length && !allowedEventTypes.includes(eventType)) {
    throw new ApiError(403, "EVENT_TYPE_BLOCKED", "This key is not permitted to submit that activation event.");
  }
  const dailyEventLimit = Math.min(Math.max(Number(key.policies.dailyEventLimit ?? 1_000), 1), 100_000);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [usage] = await getDb().select({ total: count() }).from(activationEvents)
    .where(and(eq(activationEvents.projectId, key.projectId), gte(activationEvents.createdAt, dayStart)));
  if (Number(usage.total) >= dailyEventLimit) {
    throw new ApiError(429, "EVENT_LIMIT_REACHED", "This key reached its daily activation-event limit.");
  }
  const [recipient] = await getDb().select({
    userId: wallets.userId,
  }).from(wallets)
    .innerJoin(claims, eq(claims.claimantUserId, wallets.userId))
    .innerJoin(allocations, eq(allocations.id, claims.allocationId))
    .where(and(
      eq(wallets.address, walletAddress),
      eq(wallets.chainCode, "ARC-TESTNET"),
      eq(claims.status, "confirmed"),
      eq(allocations.distributionId, distributionId),
    ))
    .limit(1);
  if (!recipient) {
    throw new ApiError(
      409,
      "RECIPIENT_NOT_VERIFIED",
      "Activation requires a wallet with a confirmed claim in this campaign.",
    );
  }
  const [created] = await getDb().insert(activationEvents).values({
    projectId: key.projectId,
    distributionId,
    userId: recipient.userId,
    externalEventId,
    eventType,
    occurredAt,
    payload: { ...payload, sourceKeyId: key.id },
  }).onConflictDoNothing().returning({ id: activationEvents.id, createdAt: activationEvents.createdAt });
  if (!created) {
    const existing = await getDb().query.activationEvents.findFirst({
      where: and(
        eq(activationEvents.projectId, key.projectId),
        eq(activationEvents.externalEventId, externalEventId),
      ),
    });
    return { id: existing?.id, duplicate: true, status: "accepted" };
  }
  const attributedReferrals = await markReferralActivated(distributionId, recipient.userId);
  await queueWebhookEvent(key.projectId, "activation.completed", {
    activationId: created.id,
    externalEventId,
    eventType,
    distributionId,
    campaignName: campaign.name,
    walletAddress,
    occurredAt: occurredAt.toISOString(),
  });
  if (attributedReferrals.length) {
    await queueWebhookEvent(key.projectId, "referral.attributed", {
      distributionId,
      referredUserId: recipient.userId,
      stage: "activated",
      referralIds: attributedReferrals.map((referral) => referral.id),
    });
  }
  const delivery = await deliverQueuedWebhooks(10);
  return {
    id: created.id,
    duplicate: false,
    status: "accepted",
    attributedReferrals: attributedReferrals.length,
    webhookDeliveries: delivery,
    createdAt: created.createdAt.toISOString(),
  };
}
