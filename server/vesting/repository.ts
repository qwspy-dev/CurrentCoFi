import { timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { allocations, claims, distributions, tokens, vestingBatches, vestingSchedules, vestingTranches } from "../db/schema.js";
import { getDb } from "../db/client.js";
import { ApiError } from "../http.js";
import { createCampaign, formatAtomic, projectAccess, resolveToken, toAtomic, type CampaignRecipientInput } from "../campaigns/repository.js";
import { normalizeBoundIdentity } from "../claims/identity-binding.js";
import { openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type VestingIdentityType = CampaignRecipientInput["identityType"];
export type VestingRecipientInput = { displayName: string; identityType: VestingIdentityType; identity: string; totalAmount: string };

function clean(value: string, label: string, min: number, max: number) {
  const text = value.trim();
  if (text.length < min || text.length > max) throw new ApiError(400, "INVALID_VESTING", `${label} must contain ${min}–${max} characters.`);
  return text;
}

function maskIdentity(type: VestingIdentityType, value: string) {
  if (type === "email") { const [local, domain] = value.split("@"); return `${local.slice(0, 1)}***@${domain}`; }
  if (type === "wallet") return `${value.slice(0, 8)}…${value.slice(-6)}`;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function slug(name: string) {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "launch-vesting";
  return `${stem}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export function splitVestingAmount(total: string, releases: number) {
  const value = BigInt(total); const count = BigInt(releases); const base = value / count; const remainder = value % count;
  if (base === BigInt(0)) throw new ApiError(400, "VESTING_AMOUNT_TOO_SMALL", "The allocation is too small for the selected number of releases.");
  return Array.from({ length: releases }, (_, index) => (base + (index === releases - 1 ? remainder : BigInt(0))).toString());
}

export function vestingState(fundingStatus: string, total: number, unlocked: number, claimed: number) {
  if (["cancelled", "refunded"].includes(fundingStatus)) return "cancelled";
  if (!["active", "completed"].includes(fundingStatus)) return "awaiting_funding";
  if (claimed === total && total > 0) return "completed";
  if (unlocked > claimed) return "claimable";
  return "vesting";
}

export async function createVestingBatch(input: { userId: string; displayName: string; projectId: string; refundAddress: string; origin: string; name: string; description: string; tokenAddress?: string; cliffAt: Date; releaseCount: number; intervalDays: number; recipients: VestingRecipientInput[] }) {
  await projectAccess(input.userId, input.projectId);
  const name = clean(input.name, "Name", 3, 100); const description = clean(input.description, "Description", 20, 1_000);
  const now = Date.now();
  if (!Number.isFinite(input.cliffAt.getTime()) || input.cliffAt.getTime() < now + 3_600_000 || input.cliffAt.getTime() > now + 365 * 86_400_000) throw new ApiError(400, "INVALID_VESTING_CLIFF", "The first unlock must be 1 hour–365 days from now.");
  if (!Number.isInteger(input.releaseCount) || input.releaseCount < 2 || input.releaseCount > 24) throw new ApiError(400, "INVALID_RELEASE_COUNT", "Choose 2–24 releases.");
  if (!Number.isInteger(input.intervalDays) || input.intervalDays < 1 || input.intervalDays > 90) throw new ApiError(400, "INVALID_RELEASE_INTERVAL", "Release intervals must be 1–90 days.");
  if (!input.recipients.length || input.recipients.length > 100 || input.recipients.length * input.releaseCount > 1_000) throw new ApiError(400, "INVALID_VESTING_RECIPIENTS", "A vesting batch supports 1–100 recipients and at most 1,000 tranches.");
  const token = await resolveToken(input.projectId, input.tokenAddress);
  const prepared = await Promise.all(input.recipients.map(async (recipient, index) => {
    const displayName = clean(recipient.displayName, `Recipient ${index + 1} name`, 2, 80);
    const identity = normalizeBoundIdentity(recipient.identityType, recipient.identity);
    const identityHash = await sha256(`${recipient.identityType}:${identity}`);
    const totalAtomic = toAtomic(recipient.totalAmount, token.decimals);
    const trancheAmounts = splitVestingAmount(totalAtomic, input.releaseCount);
    const scheduleId = crypto.randomUUID(); const accessToken = randomSecret(32);
    return { ...recipient, displayName, identity, identityHash, totalAtomic, trancheAmounts, scheduleId, accessToken, maskedIdentity: maskIdentity(recipient.identityType, identity) };
  }));
  if (new Set(prepared.map((recipient) => recipient.identityHash)).size !== prepared.length) throw new ApiError(400, "DUPLICATE_VESTING_RECIPIENT", "Each vesting recipient must be unique.");
  const lastUnlockAt = new Date(input.cliffAt.getTime() + (input.releaseCount - 1) * input.intervalDays * 86_400_000);
  const expanded = prepared.flatMap((recipient) => recipient.trancheAmounts.map((atomic, position) => ({
    identityType: recipient.identityType,
    identity: recipient.identity,
    amount: formatAtomic(atomic, token.decimals),
    availableAt: new Date(input.cliffAt.getTime() + position * input.intervalDays * 86_400_000),
    scheduleId: recipient.scheduleId,
    position,
    amountAtomic: atomic,
  })));
  const campaign = await createCampaign({ userId: input.userId, displayName: input.displayName, projectId: input.projectId, refundAddress: input.refundAddress, origin: input.origin, name: `Launch vesting · ${name}`, tokenAddress: token.contractAddress, recipients: expanded, expiresInHours: Math.ceil((lastUnlockAt.getTime() - now) / 3_600_000) + 24 * 30, activationEvent: "vesting.tranche_claimed", claimMode: "identity-bound", allowDuplicateIdentities: true });
  const batchId = crypto.randomUUID(); const publicSlug = slug(name);
  await getDb().insert(vestingBatches).values({ id: batchId, projectId: input.projectId, creatorUserId: input.userId, distributionId: campaign.id, publicSlug, name, description, cliffAt: input.cliffAt, releaseCount: input.releaseCount, intervalDays: input.intervalDays, metadata: { scheduleType: "equal-tranche", identityBound: true, walletlessClaims: true } });
  await getDb().insert(vestingSchedules).values(await Promise.all(prepared.map(async (recipient) => ({ id: recipient.scheduleId, batchId, displayName: recipient.displayName, identityType: recipient.identityType, identityHash: recipient.identityHash, identityCiphertext: await sealSecret(recipient.identity), maskedIdentity: recipient.maskedIdentity, accessTokenHash: await sha256(recipient.accessToken), accessTokenCiphertext: await sealSecret(recipient.accessToken), totalAmountAtomic: recipient.totalAtomic, metadata: { recipientIdentityEncrypted: true } }))));
  await getDb().insert(vestingTranches).values(await Promise.all(expanded.map(async (tranche, index) => {
    const claimToken = new URL(campaign.links[index].claimUrl).searchParams.get("claim");
    if (!claimToken) throw new ApiError(500, "VESTING_CLAIM_FAILED", "A vesting claim credential could not be created.");
    return { scheduleId: tranche.scheduleId, allocationId: campaign.links[index].allocationId, position: tranche.position, unlockAt: tranche.availableAt, amountAtomic: tranche.amountAtomic, claimTokenCiphertext: await sealSecret(claimToken), metadata: { availableAtEnforcedByClaimAuthorizer: true } };
  })));
  await queueWebhookEvent(input.projectId, "vesting.created", { batchId, distributionId: campaign.id, recipientCount: prepared.length, trancheCount: expanded.length, cliffAt: input.cliffAt.toISOString(), lastUnlockAt: lastUnlockAt.toISOString() }); await deliverQueuedWebhooks(10);
  return { id: batchId, campaign, publicProofUrl: `${input.origin}/?vestingProof=${encodeURIComponent(publicSlug)}#/vesting-claim`, recipientLinks: prepared.map((recipient) => ({ displayName: recipient.displayName, maskedIdentity: recipient.maskedIdentity, url: `${input.origin}/?vesting=${recipient.scheduleId}&access=${encodeURIComponent(recipient.accessToken)}#/vesting-claim` })) };
}

async function batchRows(projectId: string) {
  return getDb().select({ batch: vestingBatches, distribution: distributions, token: tokens }).from(vestingBatches).innerJoin(distributions, eq(distributions.id, vestingBatches.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).where(eq(vestingBatches.projectId, projectId)).orderBy(desc(vestingBatches.createdAt));
}

async function serializeBatch(row: Awaited<ReturnType<typeof batchRows>>[number], origin: string, includePrivateLinks: boolean) {
  const schedules = await getDb().select().from(vestingSchedules).where(eq(vestingSchedules.batchId, row.batch.id));
  const scheduleIds = new Set(schedules.map((schedule) => schedule.id));
  const tranches = (await getDb().select({ tranche: vestingTranches, allocation: allocations, claim: claims }).from(vestingTranches).innerJoin(allocations, eq(allocations.id, vestingTranches.allocationId)).leftJoin(claims, eq(claims.allocationId, allocations.id))).filter((row) => scheduleIds.has(row.tranche.scheduleId));
  const unlocked = tranches.filter((row) => row.tranche.unlockAt.getTime() <= Date.now()).length; const claimed = tranches.filter((row) => row.claim?.status === "confirmed").length;
  return { id: row.batch.id, name: row.batch.name, description: row.batch.description, status: vestingState(row.distribution.status, tranches.length, unlocked, claimed), distributionId: row.distribution.id, cliffAt: row.batch.cliffAt.toISOString(), releaseCount: row.batch.releaseCount, intervalDays: row.batch.intervalDays, lastUnlockAt: new Date(row.batch.cliffAt.getTime() + (row.batch.releaseCount - 1) * row.batch.intervalDays * 86_400_000).toISOString(), asset: { symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress, decimals: row.token.decimals }, funding: { status: row.distribution.status, fullyFunded: ["active", "completed"].includes(row.distribution.status), merkleRoot: row.distribution.merkleRoot, transactionHash: row.distribution.fundingTxHash }, totals: { recipients: schedules.length, tranches: tranches.length, unlocked, claimed, amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals) }, publicProofUrl: `${origin}/?vestingProof=${encodeURIComponent(row.batch.publicSlug)}#/vesting-claim`, schedules: await Promise.all(schedules.map(async (schedule) => ({ id: schedule.id, displayName: schedule.displayName, identityType: schedule.identityType, maskedIdentity: schedule.maskedIdentity, totalAmount: formatAtomic(schedule.totalAmountAtomic, row.token.decimals), claimed: tranches.filter((item) => item.tranche.scheduleId === schedule.id && item.claim?.status === "confirmed").length, recipientUrl: includePrivateLinks ? `${origin}/?vesting=${schedule.id}&access=${encodeURIComponent(await openSecret(schedule.accessTokenCiphertext))}#/vesting-claim` : undefined }))) };
}

export async function listVestingBatches(userId: string, projectId: string, origin: string) {
  await projectAccess(userId, projectId); const rows = await batchRows(projectId); const batches = await Promise.all(rows.map((row) => serializeBatch(row, origin, true)));
  return { batches, totals: { batches: batches.length, recipients: batches.reduce((sum, item) => sum + item.totals.recipients, 0), tranches: batches.reduce((sum, item) => sum + item.totals.tranches, 0), claimed: batches.reduce((sum, item) => sum + item.totals.claimed, 0) }, privacy: "Recipient identities and claim credentials are encrypted. Project views expose masked identities and private recipient links only to authorized operators." };
}

export async function publicVestingSchedule(scheduleId: string, accessToken: string, origin: string) {
  const schedule = await getDb().query.vestingSchedules.findFirst({ where: eq(vestingSchedules.id, scheduleId) });
  const presentedHash = await sha256(accessToken); const expectedHash = schedule?.accessTokenHash ?? "0".repeat(64);
  if (!schedule || !timingSafeEqual(Buffer.from(presentedHash, "hex"), Buffer.from(expectedHash, "hex"))) throw new ApiError(404, "VESTING_NOT_FOUND", "This vesting link is invalid.");
  const [row] = await getDb().select({ batch: vestingBatches, distribution: distributions, token: tokens }).from(vestingBatches).innerJoin(distributions, eq(distributions.id, vestingBatches.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).where(eq(vestingBatches.id, schedule.batchId)).limit(1);
  if (!row) throw new ApiError(404, "VESTING_NOT_FOUND", "This vesting schedule does not exist.");
  const trancheRows = await getDb().select({ tranche: vestingTranches, allocation: allocations, claim: claims }).from(vestingTranches).innerJoin(allocations, eq(allocations.id, vestingTranches.allocationId)).leftJoin(claims, eq(claims.allocationId, allocations.id)).where(eq(vestingTranches.scheduleId, schedule.id)).orderBy(vestingTranches.position);
  return { id: schedule.id, batch: { name: row.batch.name, description: row.batch.description }, recipient: { displayName: schedule.displayName, maskedIdentity: schedule.maskedIdentity }, asset: { symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress }, funding: { status: row.distribution.status, fullyFunded: ["active", "completed"].includes(row.distribution.status), merkleRoot: row.distribution.merkleRoot, transactionHash: row.distribution.fundingTxHash }, totalAmount: formatAtomic(schedule.totalAmountAtomic, row.token.decimals), claimedAmount: formatAtomic(trancheRows.filter((item) => item.claim?.status === "confirmed").reduce((sum, item) => sum + BigInt(item.tranche.amountAtomic), BigInt(0)).toString(), row.token.decimals), tranches: await Promise.all(trancheRows.map(async (item) => { const unlocked = item.tranche.unlockAt.getTime() <= Date.now(); const confirmed = item.claim?.status === "confirmed"; return { id: item.tranche.id, position: item.tranche.position + 1, unlockAt: item.tranche.unlockAt.toISOString(), amount: formatAtomic(item.tranche.amountAtomic, row.token.decimals), status: confirmed ? "claimed" : unlocked && row.distribution.status === "active" ? "claimable" : unlocked ? "awaiting_funding" : "locked", claimUrl: unlocked && !confirmed && row.distribution.status === "active" ? `${origin}/?claim=${encodeURIComponent(await openSecret(item.tranche.claimTokenCiphertext))}#/claim` : null, transactionHash: item.claim?.transactionHash ?? null }; })), proof: { method: "Merkle allocation with authorizer-enforced unlock timestamps", merkleRoot: row.distribution.merkleRoot, boundary: "Every tranche is committed in the funded campaign Merkle root. Current's claim authorizer refuses to sign settlement before the published allocation unlock time." } };
}

export async function publicVestingProof(publicSlug: string, origin: string) {
  const [row] = await getDb().select({ batch: vestingBatches, distribution: distributions, token: tokens }).from(vestingBatches).innerJoin(distributions, eq(distributions.id, vestingBatches.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).where(eq(vestingBatches.publicSlug, publicSlug)).limit(1);
  if (!row) throw new ApiError(404, "VESTING_NOT_FOUND", "This vesting proof does not exist.");
  const item = await serializeBatch(row, origin, false); return { ...item, schedules: item.schedules.map((schedule) => ({ id: schedule.id, displayName: schedule.displayName, identityType: schedule.identityType, maskedIdentity: schedule.maskedIdentity, totalAmount: schedule.totalAmount, claimed: schedule.claimed })) };
}
