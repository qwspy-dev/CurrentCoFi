import { createHash } from "node:crypto";
import { and, count, countDistinct, eq, gte, sql } from "drizzle-orm";
import { getDb, hasDatabaseConfig } from "../db/client.js";
import { activationEvents, claims, distributions, projects, tokens } from "../db/schema.js";

export type NetworkProofTotals = {
  projects: number;
  campaigns: number;
  recipientsTargeted: number;
  confirmedClaims: number;
  fundedWallets: number;
  activatedUsers: number;
  activationEvents: number;
  usdcClaimedAtomic: string;
  projectTokenCampaigns: number;
};

export type NetworkProof = {
  schemaVersion: "current-network-proof-v1";
  product: "Current CoFi";
  network: "Arc testnet";
  configured: boolean;
  valueStatus: "Test assets have no monetary value";
  dataMode: "verified-records-only";
  asOf: string;
  totals: NetworkProofTotals;
  rates: { claimRate: number; activationRate: number };
  activity: Array<{ date: string; campaigns: number; claims: number; activations: number }>;
  sources: Array<{ metric: string; record: string; rule: string }>;
  privacy: string;
  digest: string;
};

type ActivityRows = {
  campaigns: Array<{ at: Date }>;
  claims: Array<{ at: Date | null }>;
  activations: Array<{ at: Date }>;
};

const sources = [
  { metric: "Projects and campaigns", record: "projects + distributions", rule: "Count persisted Arc testnet records only." },
  { metric: "Recipients targeted", record: "distributions.recipient_count", rule: "Sum funded or created distribution allocations; never infer audience size." },
  { metric: "Claims and funded wallets", record: "claims", rule: "Count confirmed claims and distinct destination wallet IDs only." },
  { metric: "Activated users", record: "activation_events", rule: "Count distinct linked user IDs; repeat events do not inflate the user total." },
  { metric: "USDC test volume", record: "distributions + tokens", rule: "Sum confirmed distribution claim accounting only when the token symbol is USDC." },
] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function networkProofDigest(value: Omit<NetworkProof, "digest">) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function formatUsdcAtomic(value: string) {
  const atomic = BigInt(value || "0");
  const scale = BigInt(1_000_000);
  const whole = atomic / scale;
  const fraction = (atomic % scale).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function assembleNetworkProof(input: {
  configured: boolean;
  asOf: Date;
  totals: NetworkProofTotals;
  activityRows?: ActivityRows;
}): NetworkProof {
  const activity = new Map<string, { date: string; campaigns: number; claims: number; activations: number }>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(input.asOf);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = dateKey(date);
    activity.set(key, { date: key, campaigns: 0, claims: 0, activations: 0 });
  }
  for (const row of input.activityRows?.campaigns ?? []) activity.get(dateKey(row.at))!.campaigns += 1;
  for (const row of input.activityRows?.claims ?? []) if (row.at) activity.get(dateKey(row.at))!.claims += 1;
  for (const row of input.activityRows?.activations ?? []) activity.get(dateKey(row.at))!.activations += 1;

  const body: Omit<NetworkProof, "digest"> = {
    schemaVersion: "current-network-proof-v1",
    product: "Current CoFi",
    network: "Arc testnet",
    configured: input.configured,
    valueStatus: "Test assets have no monetary value",
    dataMode: "verified-records-only",
    asOf: input.asOf.toISOString(),
    totals: input.totals,
    rates: {
      claimRate: percent(input.totals.confirmedClaims, input.totals.recipientsTargeted),
      activationRate: percent(input.totals.activatedUsers, input.totals.confirmedClaims),
    },
    activity: [...activity.values()],
    sources: [...sources],
    privacy: "Only aggregate counts leave the service. No wallet address, social identity, email, recipient, or project-private record is exposed.",
  };
  return { ...body, digest: networkProofDigest(body) };
}

const zeroTotals: NetworkProofTotals = {
  projects: 0, campaigns: 0, recipientsTargeted: 0, confirmedClaims: 0, fundedWallets: 0,
  activatedUsers: 0, activationEvents: 0, usdcClaimedAtomic: "0", projectTokenCampaigns: 0,
};

export async function getNetworkProof(): Promise<NetworkProof> {
  const asOf = new Date();
  if (!hasDatabaseConfig()) return assembleNetworkProof({ configured: false, asOf, totals: zeroTotals });
  const db = getDb();
  const since = new Date(asOf);
  since.setUTCDate(since.getUTCDate() - 13);
  since.setUTCHours(0, 0, 0, 0);

  const [projectRows, campaignRows, recipientRows, claimRows, walletRows, activatedRows, activationRows, usdcRows, projectTokenRows, campaignActivity, claimActivity, activationActivity] = await Promise.all([
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(distributions),
    db.select({ value: sql<number>`coalesce(sum(${distributions.recipientCount}), 0)::int` }).from(distributions),
    db.select({ value: count() }).from(claims).where(eq(claims.status, "confirmed")),
    db.select({ value: countDistinct(claims.destinationWalletId) }).from(claims).where(and(eq(claims.status, "confirmed"), sql`${claims.destinationWalletId} is not null`)),
    db.select({ value: countDistinct(activationEvents.userId) }).from(activationEvents).where(sql`${activationEvents.userId} is not null`),
    db.select({ value: count() }).from(activationEvents),
    db.select({ value: sql<string>`coalesce(sum(${distributions.claimedAmountAtomic}), 0)::text` }).from(distributions).innerJoin(tokens, eq(distributions.tokenId, tokens.id)).where(eq(tokens.symbol, "USDC")),
    db.select({ value: count() }).from(distributions).innerJoin(tokens, eq(distributions.tokenId, tokens.id)).where(sql`upper(${tokens.symbol}) <> 'USDC'`),
    db.select({ at: distributions.createdAt }).from(distributions).where(gte(distributions.createdAt, since)),
    db.select({ at: claims.confirmedAt }).from(claims).where(and(eq(claims.status, "confirmed"), gte(claims.confirmedAt, since))),
    db.select({ at: activationEvents.occurredAt }).from(activationEvents).where(gte(activationEvents.occurredAt, since)),
  ]);

  return assembleNetworkProof({
    configured: true,
    asOf,
    totals: {
      projects: projectRows[0]?.value ?? 0,
      campaigns: campaignRows[0]?.value ?? 0,
      recipientsTargeted: recipientRows[0]?.value ?? 0,
      confirmedClaims: claimRows[0]?.value ?? 0,
      fundedWallets: walletRows[0]?.value ?? 0,
      activatedUsers: activatedRows[0]?.value ?? 0,
      activationEvents: activationRows[0]?.value ?? 0,
      usdcClaimedAtomic: usdcRows[0]?.value ?? "0",
      projectTokenCampaigns: projectTokenRows[0]?.value ?? 0,
    },
    activityRows: { campaigns: campaignActivity, claims: claimActivity, activations: activationActivity },
  });
}
