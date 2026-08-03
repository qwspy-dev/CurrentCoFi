import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { auditEvents, bounties, bountySubmissions, distributions, projects, tokens } from "../db/schema.js";
import { ApiError } from "../http.js";
import { createCampaign, formatAtomic, projectAccess } from "../campaigns/repository.js";
import { normalizeBoundIdentity } from "../claims/identity-binding.js";
import { openSecret, sealSecret, sha256 } from "../security/crypto.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

export type BountyContactType = "email" | "wallet" | "x" | "game" | "custom";

function cleanText(value: string, label: string, min: number, max: number) {
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ApiError(400, "INVALID_BOUNTY", `${label} must contain ${min}–${max} characters.`);
  return result;
}

function publicSlug(title: string) {
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "bounty";
  return `${stem}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export function sanitizeBountyWorkUrl(value: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new ApiError(400, "INVALID_WORK_URL", "Submission proof must be a valid HTTPS URL."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new ApiError(400, "INVALID_WORK_URL", "Submission proof must use a public HTTPS URL without embedded credentials.");
  return parsed.toString().slice(0, 1000);
}

export function maskBountyContact(type: BountyContactType, value: string) {
  if (type === "email") {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
  }
  if (type === "wallet") return `${value.slice(0, 7)}…${value.slice(-5)}`;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function deriveBountyStatus(bountyStatus: string, distributionStatus: string, deadline: Date, now = Date.now()) {
  if (bountyStatus === "awarded" || bountyStatus === "cancelled") return bountyStatus;
  if (["cancelled", "refunded"].includes(distributionStatus)) return "cancelled";
  if (deadline.getTime() <= now) return distributionStatus === "active" ? "review" : "expired";
  return distributionStatus === "active" ? "open" : "awaiting_funding";
}

export async function createBounty(input: {
  userId: string; displayName: string; projectId: string; refundAddress: string; origin: string;
  title: string; summary: string; category: string; amount: string; tokenAddress?: string; submissionDeadline: Date;
}) {
  await projectAccess(input.userId, input.projectId);
  const title = cleanText(input.title, "Title", 3, 100);
  const summary = cleanText(input.summary, "Brief", 30, 2_000);
  const category = cleanText(input.category, "Category", 2, 50);
  const now = Date.now();
  if (input.submissionDeadline.getTime() < now + 86_400_000 || input.submissionDeadline.getTime() > now + 21 * 86_400_000) {
    throw new ApiError(400, "INVALID_DEADLINE", "Submission deadline must be 1–21 days from now.");
  }
  const bountyId = crypto.randomUUID();
  const claimExpiryHours = Math.min(720, Math.max(168, Math.ceil((input.submissionDeadline.getTime() - now) / 3_600_000) + 168));
  const campaign = await createCampaign({
    userId: input.userId,
    displayName: input.displayName,
    projectId: input.projectId,
    refundAddress: input.refundAddress,
    origin: input.origin,
    name: `Bounty · ${title}`,
    tokenAddress: input.tokenAddress,
    recipients: [{ identityType: "custom", identity: `bounty:${bountyId}`, amount: input.amount }],
    expiresInHours: claimExpiryHours,
    activationEvent: "bounty.awarded",
    claimMode: "allowlist",
  });
  const claimToken = new URL(campaign.links[0].claimUrl).searchParams.get("claim");
  if (!claimToken) throw new ApiError(500, "BOUNTY_CLAIM_FAILED", "The secure winning claim could not be created.");
  const slug = publicSlug(title);
  const [created] = await getDb().insert(bounties).values({
    id: bountyId,
    projectId: input.projectId,
    creatorUserId: input.userId,
    distributionId: campaign.id,
    publicSlug: slug,
    title,
    summary,
    category,
    submissionDeadline: input.submissionDeadline,
    claimTokenCiphertext: await sealSecret(claimToken),
    metadata: { claimCredentialEncrypted: true, prizeFullyFundedBeforeOpen: true, network: "ARC-TESTNET" },
  }).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "bounty.created", resourceType: "bounty", resourceId: created.id, metadata: { distributionId: campaign.id, category, asset: campaign.asset.symbol, amountAtomic: campaign.totalAmountAtomic } });
  await queueWebhookEvent(input.projectId, "bounty.created", { bountyId: created.id, distributionId: campaign.id, publicSlug: slug, asset: campaign.asset.symbol, amountAtomic: campaign.totalAmountAtomic, submissionDeadline: input.submissionDeadline.toISOString() });
  await deliverQueuedWebhooks(10);
  return { ...created, amount: campaign.totalAmount, asset: campaign.asset, campaign, publicUrl: `${input.origin}/?bounty=${encodeURIComponent(slug)}#/bounty` };
}

async function bountyForOwner(userId: string, bountyId: string) {
  const row = await getDb().select({ bounty: bounties, distribution: distributions, token: tokens, project: projects })
    .from(bounties)
    .innerJoin(distributions, eq(distributions.id, bounties.distributionId))
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .innerJoin(projects, eq(projects.id, bounties.projectId))
    .where(eq(bounties.id, bountyId)).limit(1);
  if (!row[0]) throw new ApiError(404, "BOUNTY_NOT_FOUND", "Bounty not found.");
  await projectAccess(userId, row[0].bounty.projectId);
  return row[0];
}

function serializeBounty(row: { bounty: typeof bounties.$inferSelect; distribution: typeof distributions.$inferSelect; token: typeof tokens.$inferSelect; project: typeof projects.$inferSelect }, submissions: Array<typeof bountySubmissions.$inferSelect>, origin: string, owner = false) {
  const status = deriveBountyStatus(row.bounty.status, row.distribution.status, row.bounty.submissionDeadline);
  return {
    id: row.bounty.id,
    slug: row.bounty.publicSlug,
    title: row.bounty.title,
    summary: row.bounty.summary,
    category: row.bounty.category,
    status,
    submissionDeadline: row.bounty.submissionDeadline.toISOString(),
    awardedAt: row.bounty.awardedAt?.toISOString() ?? null,
    project: { name: row.project.name, logoUrl: row.project.logoUrl },
    prize: { amount: formatAtomic(row.distribution.totalAmountAtomic, row.token.decimals), amountAtomic: row.distribution.totalAmountAtomic, symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress },
    funding: { status: row.distribution.status, transactionHash: row.distribution.fundingTxHash, merkleRoot: row.distribution.merkleRoot, fullyFunded: row.distribution.status === "active" || row.distribution.status === "completed" },
    distributionId: row.distribution.id,
    submissionCount: submissions.length,
    publicUrl: `${origin}/?bounty=${encodeURIComponent(row.bounty.publicSlug)}#/bounty`,
    submissions: owner ? submissions.map((submission) => ({ id: submission.id, displayName: submission.displayName, contactType: submission.contactType, maskedContact: submission.maskedContact, workUrl: submission.workUrl, workSummary: submission.workSummary, proofDigest: submission.proofDigest, status: submission.status, createdAt: submission.createdAt.toISOString(), reviewedAt: submission.reviewedAt?.toISOString() ?? null })) : undefined,
  };
}

export async function listBounties(userId: string, projectId: string, origin: string) {
  await projectAccess(userId, projectId);
  const rows = await getDb().select({ bounty: bounties, distribution: distributions, token: tokens, project: projects })
    .from(bounties).innerJoin(distributions, eq(distributions.id, bounties.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, bounties.projectId)).where(eq(bounties.projectId, projectId)).orderBy(desc(bounties.createdAt));
  const items = await Promise.all(rows.map(async (row) => serializeBounty(row, await getDb().select().from(bountySubmissions).where(eq(bountySubmissions.bountyId, row.bounty.id)).orderBy(desc(bountySubmissions.createdAt)), origin, true)));
  return { bounties: items, totals: { bounties: items.length, open: items.filter((item) => item.status === "open").length, submissions: items.reduce((sum, item) => sum + item.submissionCount, 0), awarded: items.filter((item) => item.status === "awarded").length }, privacy: "Submitter contacts are encrypted at rest and returned only as masked labels." };
}

export async function publicBounty(slug: string, origin: string) {
  const row = await getDb().select({ bounty: bounties, distribution: distributions, token: tokens, project: projects })
    .from(bounties).innerJoin(distributions, eq(distributions.id, bounties.distributionId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId)).innerJoin(projects, eq(projects.id, bounties.projectId)).where(eq(bounties.publicSlug, slug)).limit(1);
  if (!row[0]) throw new ApiError(404, "BOUNTY_NOT_FOUND", "This bounty does not exist.");
  const submissions = await getDb().select().from(bountySubmissions).where(eq(bountySubmissions.bountyId, row[0].bounty.id));
  const result = serializeBounty(row[0], submissions, origin, false);
  return { ...result, canSubmit: result.status === "open", proof: { network: "ARC-TESTNET", fullyFunded: result.funding.fullyFunded, boundary: "The prize is held in Current's Campaign Vault before submissions open. Awarding releases one encrypted walletless claim credential." } };
}

export async function submitBounty(input: { slug: string; displayName: string; contactType: BountyContactType; contact: string; workUrl: string; workSummary: string }) {
  const row = await getDb().select({ bounty: bounties, distribution: distributions }).from(bounties).innerJoin(distributions, eq(distributions.id, bounties.distributionId)).where(eq(bounties.publicSlug, input.slug)).limit(1);
  if (!row[0]) throw new ApiError(404, "BOUNTY_NOT_FOUND", "This bounty does not exist.");
  const status = deriveBountyStatus(row[0].bounty.status, row[0].distribution.status, row[0].bounty.submissionDeadline);
  if (status !== "open") throw new ApiError(409, "BOUNTY_CLOSED", "This bounty is not accepting submissions.");
  const identity = normalizeBoundIdentity(input.contactType, input.contact);
  const contactHash = await sha256(`${input.contactType}:${identity}`);
  const displayName = cleanText(input.displayName, "Display name", 2, 80);
  const summary = cleanText(input.workSummary, "Work summary", 30, 2_000);
  const url = sanitizeBountyWorkUrl(input.workUrl);
  const proofDigest = await sha256(`${row[0].bounty.id}:${url}:${summary}`);
  let created: typeof bountySubmissions.$inferSelect;
  try {
    [created] = await getDb().insert(bountySubmissions).values({ bountyId: row[0].bounty.id, displayName, contactType: input.contactType, contactHash, contactCiphertext: await sealSecret(identity), maskedContact: maskBountyContact(input.contactType, identity), workUrl: url, workSummary: summary, proofDigest, metadata: { contactEncrypted: true } }).returning();
  } catch (error) {
    if ((error as { code?: string })?.code === "23505" || String(error).toLowerCase().includes("unique")) throw new ApiError(409, "ALREADY_SUBMITTED", "This identity already submitted work for the bounty.");
    throw error;
  }
  await getDb().insert(auditEvents).values({ actorType: "public", projectId: row[0].bounty.projectId, action: "bounty.submitted", resourceType: "bounty_submission", resourceId: created.id, metadata: { bountyId: row[0].bounty.id, proofDigest } });
  await queueWebhookEvent(row[0].bounty.projectId, "bounty.submitted", { bountyId: row[0].bounty.id, submissionId: created.id, displayName, proofDigest });
  await deliverQueuedWebhooks(10);
  return { id: created.id, status: created.status, proofDigest, submittedAt: created.createdAt.toISOString() };
}

export async function reviewBounty(input: { userId: string; bountyId: string; submissionId: string; action: "shortlist" | "reject" | "award"; origin: string }) {
  const row = await bountyForOwner(input.userId, input.bountyId);
  const submission = await getDb().query.bountySubmissions.findFirst({ where: and(eq(bountySubmissions.id, input.submissionId), eq(bountySubmissions.bountyId, input.bountyId)) });
  if (!submission) throw new ApiError(404, "SUBMISSION_NOT_FOUND", "Bounty submission not found.");
  const now = new Date();
  if (input.action !== "award") {
    if (row.bounty.status === "awarded") throw new ApiError(409, "BOUNTY_AWARDED", "The winning submission has already been selected.");
    const status = input.action === "shortlist" ? "shortlisted" : "rejected";
    await getDb().update(bountySubmissions).set({ status, reviewedAt: now, updatedAt: now }).where(eq(bountySubmissions.id, submission.id));
    return { bountyId: row.bounty.id, submissionId: submission.id, status };
  }
  if (row.distribution.status !== "active") throw new ApiError(409, "BOUNTY_NOT_FUNDED", "The bounty prize must be fully funded on Arc before a winner can be selected.");
  if (row.bounty.status === "awarded" && row.bounty.awardedSubmissionId !== submission.id) throw new ApiError(409, "BOUNTY_AWARDED", "A different submission has already won this bounty.");
  await getDb().update(bountySubmissions).set({ status: "awarded", reviewedAt: now, updatedAt: now }).where(eq(bountySubmissions.id, submission.id));
  await getDb().update(bountySubmissions).set({ status: "rejected", reviewedAt: now, updatedAt: now }).where(and(eq(bountySubmissions.bountyId, row.bounty.id), ne(bountySubmissions.id, submission.id)));
  await getDb().update(bounties).set({ status: "awarded", awardedSubmissionId: submission.id, awardedAt: now, updatedAt: now }).where(eq(bounties.id, row.bounty.id));
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: row.bounty.projectId, action: "bounty.awarded", resourceType: "bounty", resourceId: row.bounty.id, metadata: { submissionId: submission.id, distributionId: row.bounty.distributionId, proofDigest: submission.proofDigest } });
  await queueWebhookEvent(row.bounty.projectId, "bounty.awarded", { bountyId: row.bounty.id, submissionId: submission.id, distributionId: row.bounty.distributionId, proofDigest: submission.proofDigest });
  await deliverQueuedWebhooks(10);
  const claimToken = await openSecret(row.bounty.claimTokenCiphertext);
  return { bountyId: row.bounty.id, submissionId: submission.id, status: "awarded", winner: { displayName: submission.displayName, maskedContact: submission.maskedContact }, claimUrl: `${input.origin}/?claim=${encodeURIComponent(claimToken)}#/claim` };
}

export async function winningClaim(userId: string, bountyId: string, origin: string) {
  const row = await bountyForOwner(userId, bountyId);
  if (row.bounty.status !== "awarded") throw new ApiError(409, "BOUNTY_NOT_AWARDED", "Select a winner before opening the winning claim.");
  return { claimUrl: `${origin}/?claim=${encodeURIComponent(await openSecret(row.bounty.claimTokenCiphertext))}#/claim` };
}
