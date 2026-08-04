import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { allocations, auditEvents, distributions, projects, publicDrops, publicDropSlots, tokens } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { ApiError } from "../http.js";
import { createCampaign, formatAtomic, projectAccess, toAtomic } from "../campaigns/repository.js";
import { parseClaimCondition } from "../campaigns/conditions.js";
import { normalizeBoundIdentity } from "../claims/identity-binding.js";
import { openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { publicProjectBrand } from "../branding/repository.js";

function clean(value: string, label: string, min: number, max: number) {
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ApiError(400, "INVALID_PUBLIC_DROP", `${label} must contain ${min}–${max} characters.`);
  return result;
}

function slug(title: string) {
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "drop";
  return `${stem}-${randomSecret(6).toLowerCase()}`;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
}

export function publicDropState(funding: string, expiresAt: Date | null, reserved: number, maxClaims: number) {
  if (["cancelled", "refunded"].includes(funding)) return "cancelled";
  if (funding === "completed" || reserved >= maxClaims) return "full";
  if (expiresAt && expiresAt.getTime() <= Date.now()) return "expired";
  if (funding !== "active") return "awaiting_funding";
  return "open";
}

export async function createPublicDrop(input: {
  userId: string; displayName: string; projectId: string; refundAddress: string; origin: string;
  title: string; description: string; claimAmount: string; maxClaims: number; expiresInHours: number; tokenAddress?: string; claimCondition?: unknown;
}) {
  await projectAccess(input.userId, input.projectId);
  const title = clean(input.title, "Title", 3, 100);
  const description = clean(input.description, "Description", 12, 1_000);
  if (!Number.isInteger(input.maxClaims) || input.maxClaims < 2 || input.maxClaims > 500) throw new ApiError(400, "INVALID_DROP_CAP", "Public drops require 2–500 claim slots.");
  if (!Number.isInteger(input.expiresInHours) || input.expiresInHours < 1 || input.expiresInHours > 720) throw new ApiError(400, "INVALID_DROP_EXPIRY", "Public drops may remain open for 1–720 hours.");
  const id = crypto.randomUUID();
  const claimCondition = parseClaimCondition(input.claimCondition);
  const campaign = await createCampaign({
    userId: input.userId, displayName: input.displayName, projectId: input.projectId, refundAddress: input.refundAddress,
    origin: input.origin, name: `Public drop · ${title}`, tokenAddress: input.tokenAddress, expiresInHours: input.expiresInHours,
    activationEvent: "public_drop.claimed", claimMode: "identity-bound",
    claimCondition,
    recipients: Array.from({ length: input.maxClaims }, (_, position) => ({ identityType: "custom" as const, identity: `public-drop:${id}:slot:${position}`, amount: input.claimAmount })),
  });
  const claimAmountAtomic = toAtomic(input.claimAmount, campaign.asset.decimals);
  const [drop] = await getDb().insert(publicDrops).values({
    id, projectId: input.projectId, creatorUserId: input.userId, distributionId: campaign.id, publicSlug: slug(title), title, description,
    claimAmountAtomic, maxClaims: input.maxClaims, metadata: { mode: "first-come", identityBinding: "verified-email", fullyFundedBeforeOpen: true, actionGated: Boolean(claimCondition) },
  }).returning();
  await getDb().insert(publicDropSlots).values(await Promise.all(campaign.links.map(async (link, position) => {
    const claimToken = new URL(link.claimUrl).searchParams.get("claim");
    if (!claimToken) throw new ApiError(500, "DROP_LINK_FAILED", "A protected public-drop allocation could not be prepared.");
    return { dropId: id, allocationId: link.allocationId, position, claimTokenCiphertext: await sealSecret(claimToken), metadata: { reserved: false } };
  })));
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "public_drop.created", resourceType: "public_drop", resourceId: id, metadata: { distributionId: campaign.id, maxClaims: input.maxClaims, claimAmountAtomic } });
  await queueWebhookEvent(input.projectId, "public_drop.created", { dropId: id, distributionId: campaign.id, publicSlug: drop.publicSlug, maxClaims: input.maxClaims, claimAmountAtomic });
  await deliverQueuedWebhooks(10);
  return { ...drop, campaign, publicUrl: `${input.origin}/?drop=${encodeURIComponent(drop.publicSlug)}#/drop` };
}

async function dropRow(idOrSlug: string, bySlug = false) {
  const [row] = await getDb().select({ drop: publicDrops, distribution: distributions, token: tokens, project: projects })
    .from(publicDrops).innerJoin(distributions, eq(distributions.id, publicDrops.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, publicDrops.projectId))
    .where(bySlug ? eq(publicDrops.publicSlug, idOrSlug) : eq(publicDrops.id, idOrSlug)).limit(1);
  if (!row) throw new ApiError(404, "PUBLIC_DROP_NOT_FOUND", "This public drop does not exist.");
  return row;
}

async function serialize(row: Awaited<ReturnType<typeof dropRow>>, origin: string, owner: boolean) {
  const slots = await getDb().select({ slot: publicDropSlots, allocationStatus: allocations.status })
    .from(publicDropSlots).innerJoin(allocations, eq(allocations.id, publicDropSlots.allocationId))
    .where(eq(publicDropSlots.dropId, row.drop.id)).orderBy(asc(publicDropSlots.position));
  const reserved = slots.filter(({ slot }) => Boolean(slot.identityHash));
  const claimed = slots.filter(({ allocationStatus }) => allocationStatus === "confirmed");
  const status = publicDropState(row.distribution.status, row.distribution.expiresAt, reserved.length, row.drop.maxClaims);
  const claimCondition = parseClaimCondition((row.distribution.rules as Record<string, unknown>).claimCondition);
  return {
    id: row.drop.id, slug: row.drop.publicSlug, title: row.drop.title, description: row.drop.description, status,
    project: publicProjectBrand(row.project), distributionId: row.distribution.id,
    reward: { amount: formatAtomic(row.drop.claimAmountAtomic, row.token.decimals), amountAtomic: row.drop.claimAmountAtomic, symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress },
    capacity: { maximum: row.drop.maxClaims, reserved: reserved.length, claimed: claimed.length, remaining: Math.max(0, row.drop.maxClaims - reserved.length), percentReserved: Math.round((reserved.length / row.drop.maxClaims) * 10_000) / 100 },
    funding: { status: row.distribution.status, fullyFunded: ["active", "completed"].includes(row.distribution.status), transactionHash: row.distribution.fundingTxHash, merkleRoot: row.distribution.merkleRoot, totalAmount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals) },
    expiresAt: row.distribution.expiresAt?.toISOString() ?? null,
    claimCondition,
    proof: { mode: claimCondition ? "proof-gated-first-come" : "first-come", identityBinding: "verified-email", oneClaimPerIdentity: true, recipientPaysGas: false, boundary: claimCondition ? `Every reward is committed before opening. A verified email can reserve once, but settlement remains locked until “${claimCondition.label}” is proven by a fresh project-signed, wallet-bound authorization.` : "Every reward slot is committed in the campaign Merkle root before the drop opens. A verified email can reserve once; settlement still requires the matching Current account." },
    recipients: owner ? reserved.map(({ slot, allocationStatus }) => ({ displayName: slot.displayName, maskedIdentity: slot.maskedIdentity, referralCode: slot.referralCode, referredByCode: slot.referredByCode, status: allocationStatus, reservedAt: slot.reservedAt?.toISOString() ?? null })) : undefined,
    referrals: reserved.filter(({ slot }) => Boolean(slot.referredByCode)).length,
    publicUrl: `${origin}/?drop=${encodeURIComponent(row.drop.publicSlug)}#/drop`, canReserve: status === "open",
  };
}

export async function listPublicDrops(userId: string, projectId: string, origin: string) {
  await projectAccess(userId, projectId);
  const rows = await getDb().select({ id: publicDrops.id }).from(publicDrops).where(eq(publicDrops.projectId, projectId)).orderBy(desc(publicDrops.createdAt));
  const items = await Promise.all(rows.map(async ({ id }) => serialize(await dropRow(id), origin, true)));
  return { drops: items, totals: { drops: items.length, open: items.filter((item) => item.status === "open").length, reserved: items.reduce((sum, item) => sum + item.capacity.reserved, 0), claimed: items.reduce((sum, item) => sum + item.capacity.claimed, 0), referrals: items.reduce((sum, item) => sum + item.referrals, 0) }, privacy: "Raw recipient email addresses are encrypted at rest. Project views receive masked identities only." };
}

export async function publicDrop(publicSlug: string, origin: string) {
  return serialize(await dropRow(publicSlug, true), origin, false);
}

export async function reservePublicDrop(input: { publicSlug: string; displayName: string; email: string; referredByCode?: string; origin: string }) {
  const row = await dropRow(input.publicSlug, true);
  const snapshot = await serialize(row, input.origin, false);
  const email = normalizeBoundIdentity("email", input.email);
  const identityHash = await sha256(`email:${email}`);
  const displayName = clean(input.displayName, "Display name", 2, 80);
  const existing = await getDb().query.publicDropSlots.findFirst({ where: and(eq(publicDropSlots.dropId, row.drop.id), eq(publicDropSlots.identityHash, identityHash)) });
  if (existing) return reservedResult(existing, row.drop.publicSlug, input.origin);
  if (!snapshot.canReserve) throw new ApiError(409, "PUBLIC_DROP_CLOSED", snapshot.status === "awaiting_funding" ? "This public drop will open after its reward pool is fully funded." : "This public drop is no longer accepting claims.");
  const referredByCode = input.referredByCode?.trim().slice(0, 20) || null;
  if (referredByCode) {
    const referrer = await getDb().query.publicDropSlots.findFirst({ where: and(eq(publicDropSlots.dropId, row.drop.id), eq(publicDropSlots.referralCode, referredByCode)) });
    if (!referrer) throw new ApiError(400, "INVALID_REFERRAL", "This public-drop referral code does not exist.");
    if (referrer.identityHash === identityHash) throw new ApiError(409, "SELF_REFERRAL", "A recipient cannot refer itself.");
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slot = await getDb().query.publicDropSlots.findFirst({ where: and(eq(publicDropSlots.dropId, row.drop.id), isNull(publicDropSlots.identityHash)), orderBy: asc(publicDropSlots.position) });
    if (!slot) throw new ApiError(409, "PUBLIC_DROP_FULL", "Every reward in this public drop has been reserved.");
    const referralCode = randomSecret(8).slice(0, 10).toLowerCase();
    try {
      const [reserved] = await getDb().update(publicDropSlots).set({ displayName, identityType: "email", identityHash, identityCiphertext: await sealSecret(email), maskedIdentity: maskEmail(email), referralCode, referredByCode, reservedAt: new Date(), updatedAt: new Date(), metadata: { reserved: true, identityEncrypted: true } }).where(and(eq(publicDropSlots.id, slot.id), isNull(publicDropSlots.identityHash))).returning();
      if (!reserved) continue;
      await getDb().update(allocations).set({ identityType: "email", identityHash, updatedAt: new Date() }).where(eq(allocations.id, reserved.allocationId));
      await getDb().insert(auditEvents).values({ actorType: "public", projectId: row.drop.projectId, action: "public_drop.reserved", resourceType: "public_drop_slot", resourceId: reserved.id, metadata: { dropId: row.drop.id, allocationId: reserved.allocationId, referred: Boolean(referredByCode) } });
      await queueWebhookEvent(row.drop.projectId, "public_drop.reserved", { dropId: row.drop.id, slotId: reserved.id, allocationId: reserved.allocationId, referredByCode }); await deliverQueuedWebhooks(10);
      return reservedResult(reserved, row.drop.publicSlug, input.origin);
    } catch (error) {
      if ((error as { code?: string })?.code === "23505" || String(error).toLowerCase().includes("unique")) {
        const duplicate = await getDb().query.publicDropSlots.findFirst({ where: and(eq(publicDropSlots.dropId, row.drop.id), eq(publicDropSlots.identityHash, identityHash)) });
        if (duplicate) return reservedResult(duplicate, row.drop.publicSlug, input.origin);
        continue;
      }
      throw error;
    }
  }
  throw new ApiError(409, "DROP_RESERVATION_BUSY", "The final reward slots are being reserved. Please try again.");
}

async function reservedResult(slot: typeof publicDropSlots.$inferSelect, publicSlug: string, origin: string) {
  const token = await openSecret(slot.claimTokenCiphertext);
  return { id: slot.id, status: "reserved", displayName: slot.displayName, maskedIdentity: slot.maskedIdentity, referralCode: slot.referralCode, claimUrl: `${origin}/?claim=${encodeURIComponent(token)}&ref=${encodeURIComponent(slot.referralCode ?? "")}#/claim`, referralUrl: `${origin}/?drop=${encodeURIComponent(publicSlug)}&ref=${encodeURIComponent(slot.referralCode ?? "")}#/drop`, reservedAt: slot.reservedAt?.toISOString() ?? null };
}
