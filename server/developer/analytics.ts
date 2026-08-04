import { and, count, eq, inArray } from "drizzle-orm";
import { activationEvents, allocations, claims, distributions } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { projectDiscoveryAnalytics } from "../discovery/analytics.js";

export async function developerAnalytics(projectId: string) {
  const campaigns = await getDb().select({
    id: distributions.id,
    name: distributions.name,
    status: distributions.status,
    recipientCount: distributions.recipientCount,
  }).from(distributions).where(eq(distributions.projectId, projectId));
  const campaignIds = campaigns.map((campaign) => campaign.id);
  if (!campaignIds.length) return { totals: { campaigns: 0, recipients: 0, claims: 0, activations: 0 }, campaigns: [], discovery: await projectDiscoveryAnalytics([projectId]) };
  const [claimRows, activationRows] = await Promise.all([
    getDb().select({ distributionId: allocations.distributionId, total: count() })
      .from(claims)
      .innerJoin(allocations, eq(allocations.id, claims.allocationId))
      .where(and(inArray(allocations.distributionId, campaignIds), eq(claims.status, "confirmed")))
      .groupBy(allocations.distributionId),
    getDb().select({ distributionId: activationEvents.distributionId, total: count() })
      .from(activationEvents)
      .where(inArray(activationEvents.distributionId, campaignIds))
      .groupBy(activationEvents.distributionId),
  ]);
  const claimsByCampaign = new Map(claimRows.map((row) => [row.distributionId, Number(row.total)]));
  const activationsByCampaign = new Map(activationRows.map((row) => [row.distributionId, Number(row.total)]));
  const rows = campaigns.map((campaign) => ({
    ...campaign,
    claims: claimsByCampaign.get(campaign.id) ?? 0,
    activations: activationsByCampaign.get(campaign.id) ?? 0,
  }));
  return {
    totals: {
      campaigns: campaigns.length,
      recipients: campaigns.reduce((sum, campaign) => sum + campaign.recipientCount, 0),
      claims: rows.reduce((sum, campaign) => sum + campaign.claims, 0),
      activations: rows.reduce((sum, campaign) => sum + campaign.activations, 0),
    },
    campaigns: rows,
    discovery: await projectDiscoveryAnalytics([projectId]),
  };
}
