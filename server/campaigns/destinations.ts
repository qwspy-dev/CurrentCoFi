import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  allocations,
  auditEvents,
  campaignDestinationClicks,
  claims,
  distributions,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type ActivationDestination = { url: string; label: string };

export function parseActivationDestination(value: unknown): ActivationDestination | null {
  if (value === undefined || value === null || value === "") return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_ACTIVATION_DESTINATION", "Activation destination must include an HTTPS URL and button label.");
  }
  const record = value as Record<string, unknown>;
  const rawUrl = typeof record.url === "string" ? record.url.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!rawUrl || rawUrl.length > 500 || !label || label.length > 50) {
    throw new ApiError(400, "INVALID_ACTIVATION_DESTINATION", "Use an HTTPS URL up to 500 characters and a label from 1 to 50 characters.");
  }
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new ApiError(400, "INVALID_ACTIVATION_DESTINATION", "Enter a valid HTTPS destination URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new ApiError(400, "UNSAFE_ACTIVATION_DESTINATION", "Destinations must use HTTPS and cannot contain credentials or URL fragments.");
  }
  return { url: url.toString(), label };
}

export async function openActivationDestination(userId: string, allocationId: string) {
  const db = getDb();
  const [row] = await db.select({
    allocationId: allocations.id,
    distributionId: distributions.id,
    projectId: distributions.projectId,
    rules: distributions.rules,
  }).from(allocations)
    .innerJoin(distributions, eq(distributions.id, allocations.distributionId))
    .innerJoin(claims, and(
      eq(claims.allocationId, allocations.id),
      eq(claims.claimantUserId, userId),
      eq(claims.status, "confirmed"),
    ))
    .where(eq(allocations.id, allocationId))
    .limit(1);
  if (!row) throw new ApiError(403, "DESTINATION_ACCESS_DENIED", "Settle this claim into your Current wallet before continuing.");
  const rules = row.rules as Record<string, unknown>;
  const destination = parseActivationDestination(rules.activationDestination);
  if (!destination) throw new ApiError(404, "DESTINATION_NOT_CONFIGURED", "This campaign does not have a post-claim destination.");
  const now = new Date();
  const [click] = await db.insert(campaignDestinationClicks).values({
    projectId: row.projectId,
    distributionId: row.distributionId,
    allocationId: row.allocationId,
    userId,
    destinationOrigin: new URL(destination.url).origin,
  }).onConflictDoUpdate({
    target: campaignDestinationClicks.allocationId,
    set: {
      openCount: sql`${campaignDestinationClicks.openCount} + 1`,
      lastOpenedAt: now,
    },
  }).returning();
  await db.insert(auditEvents).values({
    actorType: "user",
    actorId: userId,
    projectId: row.projectId,
    action: "campaign.destination_opened",
    resourceType: "distribution",
    resourceId: row.distributionId,
    metadata: { allocationId: row.allocationId, destinationOrigin: click.destinationOrigin, evidenceType: "authenticated-clickthrough" },
  });
  await queueWebhookEvent(row.projectId, "campaign.destination_opened", {
    distributionId: row.distributionId,
    allocationId: row.allocationId,
    evidenceType: "authenticated-clickthrough",
    openCount: click.openCount,
  });
  await deliverQueuedWebhooks(10);
  return {
    ...destination,
    evidence: {
      type: "authenticated-clickthrough",
      recordedAt: click.lastOpenedAt.toISOString(),
      openCount: click.openCount,
      boundary: "A destination open proves an authenticated recipient continued from Current. It is not a project-verified activation event.",
    },
  };
}
