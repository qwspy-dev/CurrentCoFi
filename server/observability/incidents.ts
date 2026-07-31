import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { incidentUpdates, serviceIncidents } from "../db/schema.js";
import { ApiError } from "../http.js";
import { randomSecret } from "../security/crypto.js";

export const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;
export const INCIDENT_SEVERITIES = ["minor", "major", "critical"] as const;
export type IncidentStatus = typeof INCIDENT_STATUSES[number];
export type IncidentSeverity = typeof INCIDENT_SEVERITIES[number];

export function isIncidentStatus(value: string): value is IncidentStatus {
  return INCIDENT_STATUSES.includes(value as IncidentStatus);
}

export function isIncidentSeverity(value: string): value is IncidentSeverity {
  return INCIDENT_SEVERITIES.includes(value as IncidentSeverity);
}

export async function listPublicIncidents(limit = 20) {
  const db = getDb();
  const incidents = await db.select().from(serviceIncidents)
    .orderBy(desc(serviceIncidents.startedAt)).limit(Math.min(Math.max(limit, 1), 100));
  if (!incidents.length) return [];
  const updates = await db.select().from(incidentUpdates)
    .where(inArray(incidentUpdates.incidentId, incidents.map((incident) => incident.id)))
    .orderBy(asc(incidentUpdates.createdAt));
  const grouped = new Map<string, typeof updates>();
  for (const update of updates) grouped.set(update.incidentId, [...(grouped.get(update.incidentId) ?? []), update]);
  return incidents.map((incident) => ({
    id: incident.id,
    key: incident.incidentKey,
    title: incident.title,
    summary: incident.summary,
    severity: incident.severity,
    status: incident.status,
    affectedComponents: incident.affectedComponents,
    startedAt: incident.startedAt,
    acknowledgedAt: incident.acknowledgedAt,
    resolvedAt: incident.resolvedAt,
    latestUpdateAt: incident.latestUpdateAt,
    updates: (grouped.get(incident.id) ?? []).map((update) => ({
      id: update.id,
      status: update.status,
      message: update.message,
      createdAt: update.createdAt,
    })),
  }));
}

export async function createIncident(input: {
  userId: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  affectedComponents: string[];
}) {
  const db = getDb();
  const now = new Date();
  const [incident] = await db.insert(serviceIncidents).values({
    incidentKey: `inc_${randomSecret(9).toLowerCase()}`,
    title: input.title,
    summary: input.summary,
    severity: input.severity,
    affectedComponents: [...new Set(input.affectedComponents)].slice(0, 12),
    createdByUserId: input.userId,
    acknowledgedAt: now,
    latestUpdateAt: now,
  }).returning();
  await db.insert(incidentUpdates).values({
    incidentId: incident.id,
    status: "investigating",
    message: input.summary,
    createdByUserId: input.userId,
  });
  return incident;
}

export async function updateIncident(input: {
  userId: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
}) {
  const db = getDb();
  const existing = await db.query.serviceIncidents.findFirst({ where: eq(serviceIncidents.id, input.incidentId) });
  if (!existing) throw new ApiError(404, "INCIDENT_NOT_FOUND", "The incident does not exist.");
  if (existing.status === "resolved" && input.status !== "resolved") {
    throw new ApiError(409, "INCIDENT_RESOLVED", "Resolved incidents cannot be reopened. Create a new incident instead.");
  }
  const now = new Date();
  const [incident] = await db.update(serviceIncidents).set({
    status: input.status,
    latestUpdateAt: now,
    resolvedAt: input.status === "resolved" ? now : null,
    updatedAt: now,
  }).where(eq(serviceIncidents.id, input.incidentId)).returning();
  await db.insert(incidentUpdates).values({
    incidentId: input.incidentId,
    status: input.status,
    message: input.message,
    createdByUserId: input.userId,
  });
  return incident;
}
