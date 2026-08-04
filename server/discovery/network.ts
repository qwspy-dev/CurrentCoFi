import { and, desc, eq, inArray } from "drizzle-orm";
import { bounties, bountySubmissions, discoveryInteractions, distributions, giveawayEntries, giveaways, projects, publicDrops, publicDropSlots, tokenEconomyActions, tokens } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { deriveBountyStatus } from "../bounties/repository.js";
import { giveawayStatus } from "../giveaways/repository.js";
import { publicDropState } from "../drops/repository.js";
import { formatAtomic } from "../campaigns/repository.js";
import { ApiError } from "../http.js";
import { sha256 } from "../security/crypto.js";

export type DiscoveryKind = "drop" | "bounty" | "giveaway";

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  description: string;
  category: string;
  project: { id: string; name: string; logoUrl: string | null; websiteUrl: string | null };
  reward: { amount: string; symbol: string; name: string };
  progress: { label: string; current: number; maximum: number | null };
  closesAt: string | null;
  publicUrl: string;
  funding: { fullyFunded: true; transactionHash: string | null; merkleRoot: string | null; network: "ARC-TESTNET" };
  placement: { tier: "current" | "surge" | "stream" | "standard"; label: string; rank: number; reason: string };
  metrics: { impressions: number; opens: number; openRate: number; participation: number; participationLabel: string; boundary: string };
  createdAt: string;
};

const placementRanks = { current: 3, surge: 2, stream: 1, standard: 0 } as const;
const placementLabels = { current: "Current access", surge: "Surge access", stream: "Stream access", standard: "Open network" } as const;

export function normalizeDiscoveryTier(value: unknown, expiresAt: unknown, now = Date.now()): keyof typeof placementRanks {
  if (typeof expiresAt === "number" && expiresAt <= now) return "standard";
  return value === "current" || value === "surge" || value === "stream" ? value : "standard";
}

export function rankDiscoveryItems(items: DiscoveryItem[]) {
  return [...items].sort((a, b) => b.placement.rank - a.placement.rank || Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
}

export function validateDiscoveryInteraction(input: { resourceType: unknown; resourceId: unknown; visitorId: unknown; eventType: unknown }) {
  if (input.resourceType !== "drop" && input.resourceType !== "bounty" && input.resourceType !== "giveaway") throw new ApiError(400, "INVALID_DISCOVERY_RESOURCE", "Choose a supported discovery resource type.");
  if (typeof input.resourceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.resourceId)) throw new ApiError(400, "INVALID_DISCOVERY_RESOURCE", "A valid discovery resource is required.");
  if (typeof input.visitorId !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.visitorId)) throw new ApiError(400, "INVALID_DISCOVERY_VISITOR", "A privacy-safe visitor identifier is required.");
  if (input.eventType !== "impression" && input.eventType !== "open") throw new ApiError(400, "INVALID_DISCOVERY_EVENT", "Choose impression or open.");
  return input as { resourceType: DiscoveryKind; resourceId: string; visitorId: string; eventType: "impression" | "open" };
}

async function projectTiers(projectIds: string[]) {
  if (!projectIds.length) return new Map<string, keyof typeof placementRanks>();
  const rows = await getDb().select().from(tokenEconomyActions).where(and(
    inArray(tokenEconomyActions.projectId, projectIds),
    eq(tokenEconomyActions.kind, "project-lock"),
    eq(tokenEconomyActions.status, "activated"),
  )).orderBy(desc(tokenEconomyActions.createdAt));
  const result = new Map<string, keyof typeof placementRanks>();
  for (const row of rows) {
    if (!row.projectId) continue;
    const metadata = row.metadata as Record<string, unknown>;
    const tier = normalizeDiscoveryTier(metadata.accessTier, metadata.accessExpiresAt);
    const current = result.get(row.projectId) ?? "standard";
    if (placementRanks[tier] > placementRanks[current]) result.set(row.projectId, tier);
  }
  return result;
}

function placement(tier: keyof typeof placementRanks) {
  return {
    tier,
    label: placementLabels[tier],
    rank: placementRanks[tier],
    reason: tier === "standard"
      ? "Listed because the opportunity is public, open, and fully funded."
      : `The project has an active ${placementLabels[tier]} $CURRENT lock. Funding and eligibility checks still apply equally.`,
  };
}

export async function currentDiscoveryNetwork(origin: string) {
  const db = getDb();
  const [dropRows, bountyRows, giveawayRows] = await Promise.all([
    db.select({ drop: publicDrops, distribution: distributions, token: tokens, project: projects })
      .from(publicDrops).innerJoin(distributions, eq(distributions.id, publicDrops.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, publicDrops.projectId))
      .where(eq(distributions.status, "active")).orderBy(desc(publicDrops.createdAt)).limit(100),
    db.select({ bounty: bounties, distribution: distributions, token: tokens, project: projects })
      .from(bounties).innerJoin(distributions, eq(distributions.id, bounties.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, bounties.projectId))
      .where(eq(distributions.status, "active")).orderBy(desc(bounties.createdAt)).limit(100),
    db.select({ giveaway: giveaways, distribution: distributions, token: tokens, project: projects })
      .from(giveaways).innerJoin(distributions, eq(distributions.id, giveaways.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, giveaways.projectId))
      .where(eq(distributions.status, "active")).orderBy(desc(giveaways.createdAt)).limit(100),
  ]);

  const [dropCounts, bountyCounts, giveawayCounts] = await Promise.all([
    Promise.all(dropRows.map(async ({ drop }) => ({ id: drop.id, count: (await db.select({ id: publicDropSlots.id }).from(publicDropSlots).where(and(eq(publicDropSlots.dropId, drop.id), eq(publicDropSlots.identityType, "email")))).length }))),
    Promise.all(bountyRows.map(async ({ bounty }) => ({ id: bounty.id, count: (await db.select({ id: bountySubmissions.id }).from(bountySubmissions).where(eq(bountySubmissions.bountyId, bounty.id))).length }))),
    Promise.all(giveawayRows.map(async ({ giveaway }) => ({ id: giveaway.id, count: (await db.select({ id: giveawayEntries.id }).from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveaway.id))).length }))),
  ]);
  const dropCount = new Map(dropCounts.map(row => [row.id, row.count]));
  const bountyCount = new Map(bountyCounts.map(row => [row.id, row.count]));
  const giveawayCount = new Map(giveawayCounts.map(row => [row.id, row.count]));
  const projectIds = [...new Set([...dropRows.map(row => row.project.id), ...bountyRows.map(row => row.project.id), ...giveawayRows.map(row => row.project.id)])];
  const tiers = await projectTiers(projectIds);
  const project = (row: typeof projects.$inferSelect) => ({ id: row.id, name: row.name, logoUrl: row.logoUrl, websiteUrl: row.websiteUrl });
  const reward = (amount: string, token: typeof tokens.$inferSelect) => ({ amount: formatAtomic(amount, token.decimals), symbol: token.symbol, name: token.name });
  const proof = (row: typeof distributions.$inferSelect) => ({ fullyFunded: true as const, transactionHash: row.fundingTxHash, merkleRoot: row.merkleRoot, network: "ARC-TESTNET" as const });

  const interactions = projectIds.length ? await db.select({ resourceId: discoveryInteractions.resourceId, eventType: discoveryInteractions.eventType }).from(discoveryInteractions).where(inArray(discoveryInteractions.projectId, projectIds)).limit(20_000) : [];
  const interactionTotals = new Map<string, { impressions: number; opens: number }>();
  for (const event of interactions) { const totals = interactionTotals.get(event.resourceId) ?? { impressions: 0, opens: 0 }; totals[event.eventType === "open" ? "opens" : "impressions"] += 1; interactionTotals.set(event.resourceId, totals); }
  const metrics = (resourceId: string, participation: number, participationLabel: string) => { const totals = interactionTotals.get(resourceId) ?? { impressions: 0, opens: 0 }; return { ...totals, openRate: totals.impressions ? Math.round((totals.opens / totals.impressions) * 10_000) / 100 : 0, participation, participationLabel, boundary: "Impressions and opens are unique per anonymous browser per UTC day. Participation is a product action, not a confirmed claim or retained-user count." }; };
  const items: DiscoveryItem[] = [];
  for (const row of dropRows) {
    const reserved = dropCount.get(row.drop.id) ?? 0;
    if (publicDropState(row.distribution.status, row.distribution.expiresAt, reserved, row.drop.maxClaims) !== "open") continue;
    items.push({ id: row.drop.id, kind: "drop", title: row.drop.title, description: row.drop.description, category: "Walletless drop", project: project(row.project), reward: reward(row.drop.claimAmountAtomic, row.token), progress: { label: "claims reserved", current: reserved, maximum: row.drop.maxClaims }, closesAt: row.distribution.expiresAt?.toISOString() ?? null, publicUrl: `${origin}/?drop=${encodeURIComponent(row.drop.publicSlug)}#/drop`, funding: proof(row.distribution), placement: placement(tiers.get(row.project.id) ?? "standard"), metrics: metrics(row.drop.id, reserved, "reservations"), createdAt: row.drop.createdAt.toISOString() });
  }
  for (const row of bountyRows) {
    if (deriveBountyStatus(row.bounty.status, row.distribution.status, row.bounty.submissionDeadline) !== "open") continue;
    const submissions = bountyCount.get(row.bounty.id) ?? 0;
    items.push({ id: row.bounty.id, kind: "bounty", title: row.bounty.title, description: row.bounty.summary, category: row.bounty.category, project: project(row.project), reward: reward(row.distribution.totalAmountAtomic, row.token), progress: { label: `${submissions} submission${submissions === 1 ? "" : "s"}`, current: submissions, maximum: null }, closesAt: row.bounty.submissionDeadline.toISOString(), publicUrl: `${origin}/?bounty=${encodeURIComponent(row.bounty.publicSlug)}#/bounty`, funding: proof(row.distribution), placement: placement(tiers.get(row.project.id) ?? "standard"), metrics: metrics(row.bounty.id, submissions, "submissions"), createdAt: row.bounty.createdAt.toISOString() });
  }
  for (const row of giveawayRows) {
    const entries = giveawayCount.get(row.giveaway.id) ?? 0;
    if (giveawayStatus(row.giveaway.status, row.distribution.status, row.giveaway.entryDeadline, entries, row.giveaway.maxEntries) !== "open") continue;
    items.push({ id: row.giveaway.id, kind: "giveaway", title: row.giveaway.title, description: row.giveaway.description, category: "Verifiable giveaway", project: project(row.project), reward: reward(row.distribution.totalAmountAtomic, row.token), progress: { label: "entries", current: entries, maximum: row.giveaway.maxEntries }, closesAt: row.giveaway.entryDeadline.toISOString(), publicUrl: `${origin}/?giveaway=${encodeURIComponent(row.giveaway.publicSlug)}#/giveaway`, funding: proof(row.distribution), placement: placement(tiers.get(row.project.id) ?? "standard"), metrics: metrics(row.giveaway.id, entries, "entries"), createdAt: row.giveaway.createdAt.toISOString() });
  }

  const ranked = rankDiscoveryItems(items).slice(0, 150);
  return {
    schemaVersion: "current-discovery-v1",
    generatedAt: new Date().toISOString(),
    items: ranked,
    totals: { opportunities: ranked.length, drops: ranked.filter(item => item.kind === "drop").length, bounties: ranked.filter(item => item.kind === "bounty").length, giveaways: ranked.filter(item => item.kind === "giveaway").length, fundedProjects: new Set(ranked.map(item => item.project.id)).size, impressions: ranked.reduce((sum, item) => sum + item.metrics.impressions, 0), opens: ranked.reduce((sum, item) => sum + item.metrics.opens, 0), participation: ranked.reduce((sum, item) => sum + item.metrics.participation, 0) },
    ranking: { order: "$CURRENT access tier, then recency", safetyGate: "Only open opportunities backed by an active, fully funded Arc campaign are eligible.", disclosure: "$CURRENT access can affect placement, never eligibility proof or endorsement. Every opportunity must pass the same funding and availability checks." },
    boundary: "Discovery is an index of verifiable Current opportunities, not an endorsement, investment recommendation, or guarantee of project quality. Review each campaign's public proof before participating.",
  };
}

export async function recordDiscoveryInteraction(raw: { resourceType: unknown; resourceId: unknown; visitorId: unknown; eventType: unknown }, origin: string) {
  const input = validateDiscoveryInteraction(raw);
  const network = await currentDiscoveryNetwork(origin);
  const item = network.items.find(candidate => candidate.kind === input.resourceType && candidate.id === input.resourceId);
  if (!item) throw new ApiError(404, "DISCOVERY_RESOURCE_UNAVAILABLE", "This opportunity is not currently eligible for discovery.");
  const visitorHash = await sha256(`current-discovery-v1:${input.visitorId}`);
  const dayBucket = new Date().toISOString().slice(0, 10);
  await getDb().insert(discoveryInteractions).values({ projectId: item.project.id, resourceType: input.resourceType, resourceId: input.resourceId, visitorHash, eventType: input.eventType, dayBucket }).onConflictDoNothing();
  return { accepted: true, deduplicatedBy: "anonymous-browser-resource-event-utc-day", eventType: input.eventType, resourceType: input.resourceType, privacy: "Current stores a one-way visitor digest and UTC day bucket. It does not store the browser identifier, IP address, wallet, email, or social identity." };
}
