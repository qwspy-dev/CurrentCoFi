import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys, auditEvents, projectMembers, users } from "../db/schema.js";
import { ApiError } from "../http.js";

export type ActivityCategory = "access" | "distribution" | "settlement" | "commerce" | "developer" | "evidence" | "protocol" | "operations";
export type ActivityTone = "success" | "attention" | "neutral";

const CATEGORIES = new Set<ActivityCategory>(["access", "distribution", "settlement", "commerce", "developer", "evidence", "protocol", "operations"]);
const SAFE_METADATA_KEYS = new Set([
  "role", "previousRole", "status", "kind", "channel", "asset", "assetAddress", "amountAtomic", "totalAmountAtomic",
  "distributionId", "campaignId", "allocationId", "transactionHash", "refundTransactionHash", "resourceId", "count",
  "memberCount", "recipientCount", "milestoneCount", "shares", "digest", "proofDigest", "expiresAt", "maskedEmail",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function activityCategory(action: string): ActivityCategory {
  const root = action.toLowerCase();
  if (/^(workspace|project|identity\.)/.test(root)) return "access";
  if (/^(campaign|public_drop|drop|giveaway|bounty|payroll|vesting)/.test(root)) return "distribution";
  if (/^(claim|funding|gateway|crosschain|transfer)/.test(root)) return "settlement";
  if (/^(social_payment|checkout|subscription|escrow|treasury)/.test(root)) return "commerce";
  if (/^(developer|api|webhook|agent)/.test(root)) return "developer";
  if (/^(evidence|pilot|grant)/.test(root)) return "evidence";
  if (/^(token|security|release|liquidity|venue|partner)/.test(root)) return "protocol";
  return "operations";
}

export function activityTone(action: string): ActivityTone {
  if (/(failed|rejected|revoked|removed|disputed|cancelled|expired|refunded|paused|blocked)/i.test(action)) return "attention";
  if (/(created|accepted|confirmed|claimed|completed|executed|funded|approved|settled|linked|updated|recorded|prepared|reserved|drawn|awarded)/i.test(action)) return "success";
  return "neutral";
}

export function activityLabel(action: string) {
  return action.replaceAll("_", " ").replaceAll(".", " · ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => SAFE_METADATA_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof value)).slice(0, 8));
}

function actorFallback(actorType: string, actorId: string | null) {
  if (actorType === "system") return "Current system";
  if (actorType === "public") return "Public participant";
  if (actorType === "api-key") return "Project integration";
  if (actorType === "user") return "Project member";
  if (actorId?.startsWith("0x")) return `${actorId.slice(0, 7)}…${actorId.slice(-5)}`;
  return actorType.replaceAll("-", " ");
}

async function requireMembership(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({ where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)) });
  if (!membership) throw new ApiError(403, "PROJECT_ACTIVITY_ACCESS_DENIED", "Project membership is required to review this activity.");
  return membership;
}

export async function listProjectActivity(input: { userId: string; projectId: string; days?: number; category?: string; query?: string; limit?: number }) {
  const membership = await requireMembership(input.userId, input.projectId);
  const requestedDays = Number.isFinite(input.days) ? Number(input.days) : 30;
  const requestedLimit = Number.isFinite(input.limit) ? Number(input.limit) : 100;
  const days = Math.min(Math.max(Math.round(requestedDays), 1), 90);
  const limit = Math.min(Math.max(Math.round(requestedLimit), 1), 500);
  const category = CATEGORIES.has(input.category as ActivityCategory) ? input.category as ActivityCategory : null;
  const query = (input.query ?? "").trim().toLowerCase().slice(0, 100);
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await getDb().select().from(auditEvents)
    .where(and(eq(auditEvents.projectId, input.projectId), gte(auditEvents.createdAt, since)))
    .orderBy(desc(auditEvents.createdAt)).limit(1_000);

  const userIds = [...new Set(rows.filter((row) => row.actorType === "user" && row.actorId && isUuid(row.actorId)).map((row) => row.actorId!))];
  const keyIds = [...new Set(rows.filter((row) => row.actorType === "api-key" && row.actorId && isUuid(row.actorId)).map((row) => row.actorId!))];
  const [actorUsers, actorKeys] = await Promise.all([
    userIds.length ? getDb().select({ id: users.id, displayName: users.displayName, username: users.username }).from(users).where(inArray(users.id, userIds)) : [],
    keyIds.length ? getDb().select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix }).from(apiKeys).where(and(eq(apiKeys.projectId, input.projectId), inArray(apiKeys.id, keyIds))) : [],
  ]);
  const userMap = new Map(actorUsers.map((actor) => [actor.id, { name: actor.displayName ?? actor.username, detail: `@${actor.username}` }]));
  const keyMap = new Map(actorKeys.map((actor) => [actor.id, { name: actor.name, detail: `${actor.prefix}…` }]));
  const prepared = rows.map((row) => {
    const categoryValue = activityCategory(row.action);
    const resolved = row.actorId ? (row.actorType === "user" ? userMap.get(row.actorId) : row.actorType === "api-key" ? keyMap.get(row.actorId) : undefined) : undefined;
    return {
      id: row.id,
      action: row.action,
      label: activityLabel(row.action),
      category: categoryValue,
      tone: activityTone(row.action),
      actor: { type: row.actorType, name: resolved?.name ?? actorFallback(row.actorType, row.actorId), detail: resolved?.detail ?? null },
      resource: { type: row.resourceType, id: row.resourceId ? `${row.resourceId.slice(0, 12)}${row.resourceId.length > 12 ? "…" : ""}` : null },
      metadata: safeMetadata(row.metadata),
      requestId: row.requestId ? `${row.requestId.slice(0, 12)}…` : null,
      createdAt: row.createdAt.toISOString(),
    };
  });
  const filtered = prepared.filter((event) => (!category || event.category === category) && (!query || `${event.label} ${event.actor.name} ${event.resource.type}`.toLowerCase().includes(query)));
  const categoryCounts = prepared.reduce<Record<ActivityCategory, number>>((counts, event) => ({ ...counts, [event.category]: counts[event.category] + 1 }), { access: 0, distribution: 0, settlement: 0, commerce: 0, developer: 0, evidence: 0, protocol: 0, operations: 0 });
  return {
    projectId: input.projectId,
    viewerRole: membership.role,
    range: { days, since: since.toISOString(), cappedAt: 1_000 },
    totals: {
      events: prepared.length,
      filtered: filtered.length,
      actors: new Set(prepared.map((event) => `${event.actor.type}:${event.actor.name}`)).size,
      attention: prepared.filter((event) => event.tone === "attention").length,
      financial: prepared.filter((event) => ["distribution", "settlement", "commerce"].includes(event.category)).length,
      categories: categoryCounts,
    },
    filters: { category, query },
    events: filtered.slice(0, limit),
    privacy: "Only project members may read this ledger. Raw identities, secrets, signatures, email addresses, IP hashes, and complete actor identifiers are excluded.",
  };
}

function csvCell(value: unknown) {
  const rawValue = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const stringValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function projectActivityCsv(input: { userId: string; projectId: string; days?: number; category?: string; query?: string }) {
  const activity = await listProjectActivity({ ...input, limit: 500 });
  const header = ["timestamp", "category", "action", "actor", "actor_type", "resource_type", "resource_id", "metadata"];
  const lines = activity.events.map((event) => [event.createdAt, event.category, event.action, event.actor.name, event.actor.type, event.resource.type, event.resource.id, event.metadata].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\r\n");
}
