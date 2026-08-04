import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  activationEvents,
  allocations,
  bounties,
  bountySubmissions,
  claims,
  discoveryInteractions,
  giveawayEntries,
  giveaways,
  projectMembers,
  publicDrops,
  publicDropSlots,
} from "../db/schema.js";
import { getDb } from "../db/client.js";

export type DiscoveryFunnelTotals = {
  impressions: number;
  opens: number;
  participation: number;
  claims: number;
  activations: number;
};

export function discoveryFunnelRates(totals: DiscoveryFunnelTotals) {
  const rate = (value: number, base: number) => base ? Math.round((value / base) * 10_000) / 100 : 0;
  return {
    openRate: rate(totals.opens, totals.impressions),
    participationRate: rate(totals.participation, totals.opens),
    claimRate: rate(totals.claims, totals.participation),
    activationRate: rate(totals.activations, totals.claims),
    impressionToActivationRate: rate(totals.activations, totals.impressions),
  };
}

type Resource = {
  id: string;
  kind: "drop" | "bounty" | "giveaway";
  distributionId: string;
  title: string;
  createdAt: Date;
};

const resourceKey = (kind: Resource["kind"] | string, id: string) => `${kind}:${id}`;

export async function projectDiscoveryAnalytics(projectIds: string[]) {
  const uniqueProjectIds = [...new Set(projectIds)];
  if (!uniqueProjectIds.length) return emptyDiscoveryAnalytics();
  const db = getDb();
  const [dropRows, bountyRows, giveawayRows] = await Promise.all([
    db.select({ id: publicDrops.id, distributionId: publicDrops.distributionId, title: publicDrops.title, createdAt: publicDrops.createdAt })
      .from(publicDrops).where(inArray(publicDrops.projectId, uniqueProjectIds)),
    db.select({ id: bounties.id, distributionId: bounties.distributionId, title: bounties.title, createdAt: bounties.createdAt })
      .from(bounties).where(inArray(bounties.projectId, uniqueProjectIds)),
    db.select({ id: giveaways.id, distributionId: giveaways.distributionId, title: giveaways.title, createdAt: giveaways.createdAt })
      .from(giveaways).where(inArray(giveaways.projectId, uniqueProjectIds)),
  ]);
  const resources: Resource[] = [
    ...dropRows.map(row => ({ ...row, kind: "drop" as const })),
    ...bountyRows.map(row => ({ ...row, kind: "bounty" as const })),
    ...giveawayRows.map(row => ({ ...row, kind: "giveaway" as const })),
  ];
  if (!resources.length) return emptyDiscoveryAnalytics();

  const dropIds = dropRows.map(row => row.id);
  const bountyIds = bountyRows.map(row => row.id);
  const giveawayIds = giveawayRows.map(row => row.id);
  const distributionIds = resources.map(row => row.distributionId);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  const sinceBucket = since.toISOString().slice(0, 10);

  const [interactionRows, dailyRows, dropParticipation, bountyParticipation, giveawayParticipation, claimRows, activationRows] = await Promise.all([
    db.select({ resourceType: discoveryInteractions.resourceType, resourceId: discoveryInteractions.resourceId, eventType: discoveryInteractions.eventType, total: count() })
      .from(discoveryInteractions).where(inArray(discoveryInteractions.projectId, uniqueProjectIds))
      .groupBy(discoveryInteractions.resourceType, discoveryInteractions.resourceId, discoveryInteractions.eventType),
    db.select({ day: discoveryInteractions.dayBucket, eventType: discoveryInteractions.eventType, total: count() })
      .from(discoveryInteractions).where(and(inArray(discoveryInteractions.projectId, uniqueProjectIds), gte(discoveryInteractions.dayBucket, sinceBucket)))
      .groupBy(discoveryInteractions.dayBucket, discoveryInteractions.eventType),
    dropIds.length ? db.select({ id: publicDropSlots.dropId, total: count() }).from(publicDropSlots)
      .where(and(inArray(publicDropSlots.dropId, dropIds), isNotNull(publicDropSlots.identityHash))).groupBy(publicDropSlots.dropId) : [],
    bountyIds.length ? db.select({ id: bountySubmissions.bountyId, total: count() }).from(bountySubmissions)
      .where(inArray(bountySubmissions.bountyId, bountyIds)).groupBy(bountySubmissions.bountyId) : [],
    giveawayIds.length ? db.select({ id: giveawayEntries.giveawayId, total: count() }).from(giveawayEntries)
      .where(inArray(giveawayEntries.giveawayId, giveawayIds)).groupBy(giveawayEntries.giveawayId) : [],
    db.select({ distributionId: allocations.distributionId, total: count() }).from(claims)
      .innerJoin(allocations, eq(allocations.id, claims.allocationId))
      .where(and(inArray(allocations.distributionId, distributionIds), eq(claims.status, "confirmed")))
      .groupBy(allocations.distributionId),
    db.select({ distributionId: activationEvents.distributionId, total: count() }).from(activationEvents)
      .where(inArray(activationEvents.distributionId, distributionIds)).groupBy(activationEvents.distributionId),
  ]);

  const interactionMap = new Map<string, { impressions: number; opens: number }>();
  for (const row of interactionRows) {
    const key = resourceKey(row.resourceType, row.resourceId);
    const current = interactionMap.get(key) ?? { impressions: 0, opens: 0 };
    current[row.eventType === "open" ? "opens" : "impressions"] += Number(row.total);
    interactionMap.set(key, current);
  }
  const participationMap = new Map<string, number>([
    ...dropParticipation.map(row => [resourceKey("drop", row.id), Number(row.total)] as const),
    ...bountyParticipation.map(row => [resourceKey("bounty", row.id), Number(row.total)] as const),
    ...giveawayParticipation.map(row => [resourceKey("giveaway", row.id), Number(row.total)] as const),
  ]);
  const claimsMap = new Map(claimRows.map(row => [row.distributionId, Number(row.total)]));
  const activationsMap = new Map(activationRows.map(row => [row.distributionId, Number(row.total)]));
  const opportunities = resources.map(resource => {
    const interactions = interactionMap.get(resourceKey(resource.kind, resource.id)) ?? { impressions: 0, opens: 0 };
    const totals = {
      ...interactions,
      participation: participationMap.get(resourceKey(resource.kind, resource.id)) ?? 0,
      claims: claimsMap.get(resource.distributionId) ?? 0,
      activations: activationsMap.get(resource.distributionId) ?? 0,
    };
    return { id: resource.id, distributionId: resource.distributionId, kind: resource.kind, title: resource.title, ...totals, rates: discoveryFunnelRates(totals), createdAt: resource.createdAt.toISOString() };
  }).toSorted((left, right) => right.activations - left.activations || right.opens - left.opens || Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const totals = opportunities.reduce<DiscoveryFunnelTotals>((sum, row) => ({
    impressions: sum.impressions + row.impressions,
    opens: sum.opens + row.opens,
    participation: sum.participation + row.participation,
    claims: sum.claims + row.claims,
    activations: sum.activations + row.activations,
  }), { impressions: 0, opens: 0, participation: 0, claims: 0, activations: 0 });
  const dailyMap = new Map<string, { impressions: number; opens: number }>();
  for (const row of dailyRows) {
    const current = dailyMap.get(row.day) ?? { impressions: 0, opens: 0 };
    current[row.eventType === "open" ? "opens" : "impressions"] += Number(row.total);
    dailyMap.set(row.day, current);
  }
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return { day, ...(dailyMap.get(day) ?? { impressions: 0, opens: 0 }) };
  });
  return {
    schemaVersion: "current-discovery-acquisition-v1" as const,
    period: { days: 30, startsAt: `${sinceBucket}T00:00:00.000Z`, generatedAt: new Date().toISOString() },
    totals,
    rates: discoveryFunnelRates(totals),
    daily,
    opportunities,
    boundary: "Anonymous impressions and opens are daily-deduplicated attention signals. Participation, confirmed Arc claims, and signed project activations are separate product outcomes. Current never presents attention as adoption.",
  };
}

export async function userDiscoveryAnalytics(userId: string) {
  const memberships = await getDb().select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, userId));
  return projectDiscoveryAnalytics(memberships.map(row => row.projectId));
}

function emptyDiscoveryAnalytics() {
  const totals: DiscoveryFunnelTotals = { impressions: 0, opens: 0, participation: 0, claims: 0, activations: 0 };
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  return {
    schemaVersion: "current-discovery-acquisition-v1" as const,
    period: { days: 30, startsAt: `${since.toISOString().slice(0, 10)}T00:00:00.000Z`, generatedAt: new Date().toISOString() },
    totals,
    rates: discoveryFunnelRates(totals),
    daily: Array.from({ length: 30 }, (_, index) => { const date = new Date(since); date.setUTCDate(since.getUTCDate() + index); return { day: date.toISOString().slice(0, 10), impressions: 0, opens: 0 }; }),
    opportunities: [],
    boundary: "Anonymous impressions and opens are daily-deduplicated attention signals. Participation, confirmed Arc claims, and signed project activations are separate product outcomes. Current never presents attention as adoption.",
  };
}
