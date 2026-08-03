import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { allocations, auditEvents, distributions, giveawayEntries, giveaways, projects, tokens } from "../db/schema.js";
import { ApiError } from "../http.js";
import { createCampaign, formatAtomic, projectAccess } from "../campaigns/repository.js";
import { normalizeBoundIdentity } from "../claims/identity-binding.js";
import { openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type GiveawayIdentityType = "email" | "wallet" | "x" | "game" | "custom";

function clean(value: string, label: string, min: number, max: number) {
  const text = value.trim();
  if (text.length < min || text.length > max) throw new ApiError(400, "INVALID_GIVEAWAY", `${label} must contain ${min}–${max} characters.`);
  return text;
}

function createSlug(title: string) {
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 44) || "giveaway";
  return `${stem}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function maskIdentity(type: GiveawayIdentityType, value: string) {
  if (type === "email") { const [local, domain] = value.split("@"); return `${local.slice(0, 1)}***@${domain}`; }
  if (type === "wallet") return `${value.slice(0, 8)}…${value.slice(-6)}`;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function giveawayStatus(status: string, funding: string, deadline: Date, count: number, maxEntries: number, now = Date.now()) {
  if (["drawn", "cancelled"].includes(status)) return status;
  if (["cancelled", "refunded"].includes(funding)) return "cancelled";
  if (funding !== "active" && funding !== "completed") return "awaiting_funding";
  if (deadline.getTime() <= now || count >= maxEntries) return "ready_to_draw";
  return "open";
}

export async function deterministicGiveawayDraw(randomness: string, giveawayId: string, entryDigests: string[]) {
  if (entryDigests.length < 2) throw new ApiError(409, "NOT_ENOUGH_ENTRIES", "At least two unique entries are required.");
  const sortedEntryDigests = [...entryDigests].sort();
  const entrySetDigest = await sha256(sortedEntryDigests.join(":"));
  const drawDigest = await sha256(`${randomness}:${giveawayId}:${entrySetDigest}`);
  const digestInteger = BigInt(`0x${Buffer.from(drawDigest, "base64url").toString("hex")}`);
  const winnerIndex = Number(digestInteger % BigInt(sortedEntryDigests.length));
  return { sortedEntryDigests, entrySetDigest, drawDigest, winnerIndex, winnerEntryDigest: sortedEntryDigests[winnerIndex] };
}

export async function createGiveaway(input: { userId: string; displayName: string; projectId: string; refundAddress: string; origin: string; title: string; description: string; amount: string; tokenAddress?: string; entryDeadline: Date; maxEntries: number }) {
  await projectAccess(input.userId, input.projectId);
  const title = clean(input.title, "Title", 3, 100);
  const description = clean(input.description, "Description", 20, 1_000);
  const now = Date.now();
  if (!Number.isFinite(input.entryDeadline.getTime()) || input.entryDeadline.getTime() < now + 3_600_000 || input.entryDeadline.getTime() > now + 21 * 86_400_000) throw new ApiError(400, "INVALID_DEADLINE", "Entry deadline must be 1 hour–21 days from now.");
  if (!Number.isInteger(input.maxEntries) || input.maxEntries < 2 || input.maxEntries > 100_000) throw new ApiError(400, "INVALID_ENTRY_LIMIT", "Entry limit must be between 2 and 100,000.");
  const id = crypto.randomUUID();
  const randomness = randomSecret(32);
  const commitment = await sha256(`current-giveaway:${id}:${randomness}`);
  const campaign = await createCampaign({ userId: input.userId, displayName: input.displayName, projectId: input.projectId, refundAddress: input.refundAddress, origin: input.origin, name: `Giveaway · ${title}`, tokenAddress: input.tokenAddress, recipients: [{ identityType: "custom", identity: `giveaway:${commitment}`, amount: input.amount }], expiresInHours: Math.min(720, Math.ceil((input.entryDeadline.getTime() - now) / 3_600_000) + 168), activationEvent: "giveaway.won", claimMode: "allowlist" });
  const claimToken = new URL(campaign.links[0].claimUrl).searchParams.get("claim");
  if (!claimToken) throw new ApiError(500, "GIVEAWAY_CLAIM_FAILED", "The encrypted winner claim could not be created.");
  const [created] = await getDb().insert(giveaways).values({ id, projectId: input.projectId, creatorUserId: input.userId, distributionId: campaign.id, publicSlug: createSlug(title), title, description, entryDeadline: input.entryDeadline, maxEntries: input.maxEntries, claimTokenCiphertext: await sealSecret(claimToken), randomnessCiphertext: await sealSecret(randomness), randomnessCommitment: commitment, metadata: { selection: "commit-reveal-sha256", commitmentAnchoredByCampaignAllocation: true, oneEntryPerIdentity: true } }).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "giveaway.created", resourceType: "giveaway", resourceId: id, metadata: { distributionId: campaign.id, randomnessCommitment: commitment, maxEntries: input.maxEntries } });
  await queueWebhookEvent(input.projectId, "giveaway.created", { giveawayId: id, distributionId: campaign.id, publicSlug: created.publicSlug, randomnessCommitment: commitment, entryDeadline: input.entryDeadline.toISOString(), maxEntries: input.maxEntries });
  await deliverQueuedWebhooks(10);
  return { ...created, campaign, publicUrl: `${input.origin}/?giveaway=${encodeURIComponent(created.publicSlug)}#/giveaway` };
}

async function giveawayRow(idOrSlug: string, bySlug = false) {
  const rows = await getDb().select({ giveaway: giveaways, distribution: distributions, token: tokens, project: projects })
    .from(giveaways).innerJoin(distributions, eq(distributions.id, giveaways.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, giveaways.projectId))
    .where(bySlug ? eq(giveaways.publicSlug, idOrSlug) : eq(giveaways.id, idOrSlug)).limit(1);
  if (!rows[0]) throw new ApiError(404, "GIVEAWAY_NOT_FOUND", "This giveaway does not exist.");
  return rows[0];
}

async function serialize(row: Awaited<ReturnType<typeof giveawayRow>>, origin: string, owner: boolean) {
  const entries = await getDb().select().from(giveawayEntries).where(eq(giveawayEntries.giveawayId, row.giveaway.id)).orderBy(desc(giveawayEntries.createdAt));
  const allocation = await getDb().query.allocations.findFirst({ where: eq(allocations.distributionId, row.distribution.id) });
  const status = giveawayStatus(row.giveaway.status, row.distribution.status, row.giveaway.entryDeadline, entries.length, row.giveaway.maxEntries);
  const winner = row.giveaway.winnerEntryId ? entries.find((entry) => entry.id === row.giveaway.winnerEntryId) : null;
  return {
    id: row.giveaway.id, slug: row.giveaway.publicSlug, title: row.giveaway.title, description: row.giveaway.description, status,
    entryDeadline: row.giveaway.entryDeadline.toISOString(), maxEntries: row.giveaway.maxEntries, entryCount: entries.length,
    project: { name: row.project.name, logoUrl: row.project.logoUrl }, distributionId: row.distribution.id,
    prize: { amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals), amountAtomic: row.distribution.totalAmountAtomic, symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress },
    funding: { status: row.distribution.status, fullyFunded: ["active", "completed"].includes(row.distribution.status), transactionHash: row.distribution.fundingTxHash, merkleRoot: row.distribution.merkleRoot },
    proof: { method: "SHA-256 commit-reveal", randomnessCommitment: row.giveaway.randomnessCommitment, allocationIdentityHash: allocation?.identityHash ?? null, entrySetDigest: row.giveaway.entrySetDigest, drawDigest: row.giveaway.drawDigest, revealedRandomness: row.giveaway.revealedRandomness, deterministic: Boolean(row.giveaway.drawDigest && row.giveaway.revealedRandomness), boundary: "The random secret is committed before the prize campaign is funded. After entries close, Current reveals it and deterministically selects one entry from the sorted entry-digest set." },
    winner: winner ? { displayName: winner.displayName, maskedIdentity: winner.maskedIdentity, entryDigest: winner.entryDigest } : null,
    entries: owner ? entries.map((entry) => ({ id: entry.id, displayName: entry.displayName, identityType: entry.identityType, maskedIdentity: entry.maskedIdentity, referralCode: entry.referralCode, referredByCode: entry.referredByCode, entryDigest: entry.entryDigest, status: entry.status, createdAt: entry.createdAt.toISOString() })) : undefined,
    referrals: entries.filter((entry) => Boolean(entry.referredByCode)).length,
    publicUrl: `${origin}/?giveaway=${encodeURIComponent(row.giveaway.publicSlug)}#/giveaway`,
  };
}

export async function listGiveaways(userId: string, projectId: string, origin: string) {
  await projectAccess(userId, projectId);
  const rows = await getDb().select({ id: giveaways.id }).from(giveaways).where(eq(giveaways.projectId, projectId)).orderBy(desc(giveaways.createdAt));
  const items = await Promise.all(rows.map(async ({ id }) => serialize(await giveawayRow(id), origin, true)));
  return { giveaways: items, totals: { giveaways: items.length, open: items.filter((item) => item.status === "open").length, entries: items.reduce((sum, item) => sum + item.entryCount, 0), referrals: items.reduce((sum, item) => sum + item.referrals, 0), drawn: items.filter((item) => item.status === "drawn").length }, privacy: "Entry identities are encrypted at rest and only masked labels reach project dashboards." };
}

export async function publicGiveaway(publicSlug: string, origin: string) {
  const item = await serialize(await giveawayRow(publicSlug, true), origin, false);
  return { ...item, canEnter: item.status === "open" && item.entryCount < item.maxEntries };
}

export async function enterGiveaway(input: { publicSlug: string; displayName: string; identityType: GiveawayIdentityType; identity: string; referredByCode?: string }) {
  const row = await giveawayRow(input.publicSlug, true);
  const countRows = await getDb().select({ id: giveawayEntries.id }).from(giveawayEntries).where(eq(giveawayEntries.giveawayId, row.giveaway.id));
  if (giveawayStatus(row.giveaway.status, row.distribution.status, row.giveaway.entryDeadline, countRows.length, row.giveaway.maxEntries) !== "open") throw new ApiError(409, "GIVEAWAY_CLOSED", "This giveaway is not accepting entries.");
  const identity = normalizeBoundIdentity(input.identityType, input.identity);
  const identityHash = await sha256(`${input.identityType}:${identity}`);
  const displayName = clean(input.displayName, "Display name", 2, 80);
  const id = crypto.randomUUID();
  const referralCode = id.replaceAll("-", "").slice(0, 10);
  const referredByCode = input.referredByCode?.trim().slice(0, 20) || null;
  if (referredByCode) {
    const referrer = await getDb().query.giveawayEntries.findFirst({ where: and(eq(giveawayEntries.giveawayId, row.giveaway.id), eq(giveawayEntries.referralCode, referredByCode)) });
    if (!referrer) throw new ApiError(400, "INVALID_REFERRAL", "This giveaway referral code does not exist.");
    if (referrer.identityHash === identityHash) throw new ApiError(409, "SELF_REFERRAL", "An entry cannot refer itself.");
  }
  const entryDigest = await sha256(`${row.giveaway.id}:${id}:${identityHash}:${referredByCode ?? "direct"}`);
  let entry: typeof giveawayEntries.$inferSelect;
  try { [entry] = await getDb().insert(giveawayEntries).values({ id, giveawayId: row.giveaway.id, displayName, identityType: input.identityType, identityHash, identityCiphertext: await sealSecret(identity), maskedIdentity: maskIdentity(input.identityType, identity), referralCode, referredByCode, entryDigest, metadata: { identityEncrypted: true } }).returning(); }
  catch (error) { if ((error as { code?: string })?.code === "23505" || String(error).toLowerCase().includes("unique")) throw new ApiError(409, "ALREADY_ENTERED", "This identity already entered the giveaway."); throw error; }
  await getDb().insert(auditEvents).values({ actorType: "public", projectId: row.giveaway.projectId, action: "giveaway.entered", resourceType: "giveaway_entry", resourceId: entry.id, metadata: { giveawayId: row.giveaway.id, entryDigest, referred: Boolean(referredByCode) } });
  await queueWebhookEvent(row.giveaway.projectId, "giveaway.entered", { giveawayId: row.giveaway.id, entryId: entry.id, entryDigest, referredByCode }); await deliverQueuedWebhooks(10);
  return { id: entry.id, status: entry.status, entryDigest, referralCode, referralUrl: `${input.publicSlug}?ref=${referralCode}`, enteredAt: entry.createdAt.toISOString() };
}

export async function drawGiveaway(userId: string, giveawayId: string, origin: string) {
  const row = await giveawayRow(giveawayId); await projectAccess(userId, row.giveaway.projectId);
  const entries = await getDb().select().from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId)).orderBy(giveawayEntries.entryDigest);
  if (row.giveaway.status === "drawn") return winningGiveawayClaim(userId, giveawayId, origin);
  if (row.distribution.status !== "active") throw new ApiError(409, "GIVEAWAY_NOT_FUNDED", "Fund the prize on Arc before drawing a winner.");
  if (entries.length < 2) throw new ApiError(409, "NOT_ENOUGH_ENTRIES", "At least two unique entries are required.");
  if (row.giveaway.entryDeadline.getTime() > Date.now() && entries.length < row.giveaway.maxEntries) throw new ApiError(409, "GIVEAWAY_STILL_OPEN", "The giveaway can be drawn after its deadline or entry limit is reached.");
  const randomness = await openSecret(row.giveaway.randomnessCiphertext);
  if (await sha256(`current-giveaway:${row.giveaway.id}:${randomness}`) !== row.giveaway.randomnessCommitment) throw new ApiError(500, "RANDOMNESS_COMMITMENT_MISMATCH", "The committed giveaway randomness failed verification.");
  const proof = await deterministicGiveawayDraw(randomness, row.giveaway.id, entries.map((entry) => entry.entryDigest));
  const { entrySetDigest, drawDigest } = proof;
  const winner = entries.find((entry) => entry.entryDigest === proof.winnerEntryDigest)!;
  const now = new Date();
  await getDb().update(giveawayEntries).set({ status: "not_selected", updatedAt: now }).where(eq(giveawayEntries.giveawayId, giveawayId));
  await getDb().update(giveawayEntries).set({ status: "winner", updatedAt: now }).where(eq(giveawayEntries.id, winner.id));
  await getDb().update(giveaways).set({ status: "drawn", winnerEntryId: winner.id, entrySetDigest, drawDigest, revealedRandomness: randomness, drawnAt: now, updatedAt: now }).where(eq(giveaways.id, giveawayId));
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: userId, projectId: row.giveaway.projectId, action: "giveaway.drawn", resourceType: "giveaway", resourceId: giveawayId, metadata: { winnerEntryId: winner.id, entrySetDigest, drawDigest, randomnessCommitment: row.giveaway.randomnessCommitment } });
  await queueWebhookEvent(row.giveaway.projectId, "giveaway.drawn", { giveawayId, distributionId: row.giveaway.distributionId, winnerEntryId: winner.id, entrySetDigest, drawDigest }); await deliverQueuedWebhooks(10);
  return { giveawayId, status: "drawn", winner: { displayName: winner.displayName, maskedIdentity: winner.maskedIdentity, entryDigest: winner.entryDigest }, proof: { randomnessCommitment: row.giveaway.randomnessCommitment, revealedRandomness: randomness, entrySetDigest, drawDigest }, claimUrl: `${origin}/?claim=${encodeURIComponent(await openSecret(row.giveaway.claimTokenCiphertext))}#/claim` };
}

export async function winningGiveawayClaim(userId: string, giveawayId: string, origin: string) {
  const row = await giveawayRow(giveawayId); await projectAccess(userId, row.giveaway.projectId);
  if (row.giveaway.status !== "drawn") throw new ApiError(409, "GIVEAWAY_NOT_DRAWN", "Draw a winner before opening the winning claim.");
  return { giveawayId, status: "drawn", claimUrl: `${origin}/?claim=${encodeURIComponent(await openSecret(row.giveaway.claimTokenCiphertext))}#/claim` };
}
