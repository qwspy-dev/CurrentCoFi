import { and, desc, eq } from "drizzle-orm";
import { createPublicClient, getAddress, http, isAddress, parseAbi } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createWalletTransferChallenge, confirmWalletTransferChallenge } from "../accounts/transfers.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import { auditEvents, communityTreasuries, projectMembers, projects, tokens, treasuryApprovals, treasuryBudgets, treasuryProposals } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { formatAtomic, projectAccess, resolveToken, toAtomic } from "../campaigns/repository.js";

const balanceAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

function clean(value: string, label: string, min: number, max: number) {
  const text = value.trim();
  if (text.length < min || text.length > max) throw new ApiError(400, "INVALID_TREASURY", `${label} must contain ${min}–${max} characters.`);
  return text;
}

export function validateTreasuryProofUrl(value?: string) {
  if (!value?.trim()) return null;
  let url: URL;
  try { url = new URL(value); } catch { throw new ApiError(400, "INVALID_PROOF_URL", "Proof must be a valid HTTPS URL."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new ApiError(400, "INVALID_PROOF_URL", "Proof must use a public HTTPS URL without embedded credentials.");
  return url.toString().slice(0, 1_000);
}

async function treasuryGovernanceAccess(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({ where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)) });
  if (!membership || !["owner", "admin"].includes(membership.role)) throw new ApiError(403, "TREASURY_GOVERNANCE_REQUIRED", "Only a project owner or admin can change budgets, approvals, or treasury configuration.");
  return membership;
}

function slug(name: string) {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "treasury";
  return `${stem}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

async function treasuryOwner(userId: string, treasuryId: string) {
  const [row] = await getDb().select({ treasury: communityTreasuries, project: projects }).from(communityTreasuries)
    .innerJoin(projects, eq(projects.id, communityTreasuries.projectId)).where(eq(communityTreasuries.id, treasuryId)).limit(1);
  if (!row) throw new ApiError(404, "TREASURY_NOT_FOUND", "Community treasury not found.");
  await projectAccess(userId, row.treasury.projectId);
  return row;
}

async function currentBalance(address: string, tokenAddress: string) {
  try {
    const client = createPublicClient({ transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 3, retryDelay: 400 }) });
    return (await client.readContract({ address: getAddress(tokenAddress), abi: balanceAbi, functionName: "balanceOf", args: [getAddress(address)] })).toString();
  } catch { return null; }
}

function proposalView(row: { proposal: typeof treasuryProposals.$inferSelect; token: typeof tokens.$inferSelect }, publicView = false) {
  return {
    id: row.proposal.id, title: row.proposal.title, description: row.proposal.description, category: row.proposal.category,
    amount: formatAtomic(row.proposal.amountAtomic, row.token.decimals), amountAtomic: row.proposal.amountAtomic,
    asset: { symbol: row.token.symbol, name: row.token.name, address: row.token.contractAddress, decimals: row.token.decimals },
    recipientAddress: publicView ? `${row.proposal.recipientAddress.slice(0, 8)}…${row.proposal.recipientAddress.slice(-6)}` : row.proposal.recipientAddress,
    status: row.proposal.status, approvalCount: row.proposal.approvalCount, approvalsRequired: row.proposal.approvalsRequired,
    transactionHash: row.proposal.transactionHash, explorerUrl: row.proposal.transactionHash ? `${ARC_TESTNET.explorerUrl}/tx/${row.proposal.transactionHash}` : null,
    proofUrl: row.proposal.proofUrl, executedAt: row.proposal.executedAt?.toISOString() ?? null, createdAt: row.proposal.createdAt.toISOString(),
  };
}

export async function upsertCommunityTreasury(input: { userId: string; projectId: string; name: string; description?: string; treasuryAddress: string; origin: string }) {
  await treasuryGovernanceAccess(input.userId, input.projectId);
  if (!isAddress(input.treasuryAddress)) throw new ApiError(400, "INVALID_TREASURY_ADDRESS", "Use a valid Arc treasury address.");
  const existing = await getDb().query.communityTreasuries.findFirst({ where: eq(communityTreasuries.projectId, input.projectId) });
  const values = { name: clean(input.name, "Treasury name", 2, 80), description: input.description?.trim().slice(0, 500) || null, treasuryAddress: getAddress(input.treasuryAddress).toLowerCase(), updatedAt: new Date() };
  const [treasury] = existing
    ? await getDb().update(communityTreasuries).set(values).where(eq(communityTreasuries.id, existing.id)).returning()
    : await getDb().insert(communityTreasuries).values({ projectId: input.projectId, ownerUserId: input.userId, publicSlug: slug(values.name), ...values, metadata: { settlement: "non-custodial-circle-wallet", network: ARC_TESTNET.network } }).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: existing ? "treasury.updated" : "treasury.created", resourceType: "community_treasury", resourceId: treasury.id, metadata: { treasuryAddress: treasury.treasuryAddress } });
  if (!existing) { await queueWebhookEvent(input.projectId, "treasury.created", { treasuryId: treasury.id, publicSlug: treasury.publicSlug, treasuryAddress: treasury.treasuryAddress }); await deliverQueuedWebhooks(10); }
  return { ...treasury, publicUrl: `${input.origin}/?treasury=${encodeURIComponent(treasury.publicSlug)}#/public-treasury` };
}

export async function createTreasuryBudget(input: { userId: string; treasuryId: string; category: string; limit: string; tokenAddress?: string; periodStart: Date; periodEnd: Date }) {
  const { treasury } = await treasuryOwner(input.userId, input.treasuryId);
  await treasuryGovernanceAccess(input.userId, treasury.projectId);
  if (!Number.isFinite(input.periodStart.getTime()) || !Number.isFinite(input.periodEnd.getTime()) || !(input.periodStart < input.periodEnd) || input.periodEnd.getTime() > Date.now() + 366 * 86_400_000) throw new ApiError(400, "INVALID_BUDGET_PERIOD", "Choose a valid budget period up to one year.");
  const token = await resolveToken(treasury.projectId, input.tokenAddress);
  const [budget] = await getDb().insert(treasuryBudgets).values({ treasuryId: treasury.id, tokenId: token.id, category: clean(input.category, "Category", 2, 50), limitAtomic: toAtomic(input.limit, token.decimals), periodStart: input.periodStart, periodEnd: input.periodEnd }).returning();
  await queueWebhookEvent(treasury.projectId, "treasury.budget_created", { treasuryId: treasury.id, budgetId: budget.id, category: budget.category, limitAtomic: budget.limitAtomic, asset: token.symbol });
  await deliverQueuedWebhooks(10);
  return budget;
}

export async function createTreasuryProposal(input: { userId: string; treasuryId: string; budgetId?: string; title: string; description: string; category: string; recipientAddress: string; amount: string; tokenAddress?: string; proofUrl?: string }) {
  const { treasury } = await treasuryOwner(input.userId, input.treasuryId);
  if (!isAddress(input.recipientAddress)) throw new ApiError(400, "INVALID_RECIPIENT", "Use a valid Arc recipient address.");
  const token = await resolveToken(treasury.projectId, input.tokenAddress);
  const amountAtomic = toAtomic(input.amount, token.decimals);
  let budget: typeof treasuryBudgets.$inferSelect | undefined;
  if (input.budgetId) {
    budget = await getDb().query.treasuryBudgets.findFirst({ where: and(eq(treasuryBudgets.id, input.budgetId), eq(treasuryBudgets.treasuryId, treasury.id)) });
    if (!budget || budget.status !== "active" || budget.tokenId !== token.id) throw new ApiError(409, "BUDGET_UNAVAILABLE", "Choose an active budget for the same asset.");
    const reserved = await getDb().select().from(treasuryProposals).where(eq(treasuryProposals.budgetId, budget.id));
    const used = reserved.filter((item) => !["rejected", "cancelled"].includes(item.status)).reduce((sum, item) => sum + BigInt(item.amountAtomic), BigInt(0));
    if (used + BigInt(amountAtomic) > BigInt(budget.limitAtomic)) throw new ApiError(409, "BUDGET_EXCEEDED", "This proposal would exceed the published category budget.");
  }
  const [proposal] = await getDb().insert(treasuryProposals).values({ treasuryId: treasury.id, budgetId: budget?.id, creatorUserId: input.userId, tokenId: token.id, title: clean(input.title, "Proposal title", 3, 100), description: clean(input.description, "Proposal description", 20, 2_000), category: clean(input.category, "Category", 2, 50), recipientAddress: getAddress(input.recipientAddress).toLowerCase(), amountAtomic, proofUrl: validateTreasuryProofUrl(input.proofUrl), metadata: { nonCustodial: true, approvalPolicy: "owner-or-admin" } }).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: treasury.projectId, action: "treasury.proposal_created", resourceType: "treasury_proposal", resourceId: proposal.id, metadata: { amountAtomic, token: token.symbol, category: proposal.category } });
  await queueWebhookEvent(treasury.projectId, "treasury.proposal_created", { treasuryId: treasury.id, proposalId: proposal.id, amountAtomic, asset: token.symbol, category: proposal.category });
  await deliverQueuedWebhooks(10);
  return proposal;
}

export async function decideTreasuryProposal(input: { userId: string; proposalId: string; decision: "approve" | "reject"; note?: string }) {
  const [row] = await getDb().select({ proposal: treasuryProposals, treasury: communityTreasuries }).from(treasuryProposals).innerJoin(communityTreasuries, eq(communityTreasuries.id, treasuryProposals.treasuryId)).where(eq(treasuryProposals.id, input.proposalId)).limit(1);
  if (!row) throw new ApiError(404, "PROPOSAL_NOT_FOUND", "Treasury proposal not found.");
  await treasuryGovernanceAccess(input.userId, row.treasury.projectId);
  if (!["pending", "approved"].includes(row.proposal.status)) throw new ApiError(409, "PROPOSAL_LOCKED", "This proposal can no longer be reviewed.");
  const [approval] = await getDb().insert(treasuryApprovals).values({ proposalId: row.proposal.id, userId: input.userId, decision: input.decision, note: input.note?.trim().slice(0, 280) || null }).onConflictDoUpdate({ target: [treasuryApprovals.proposalId, treasuryApprovals.userId], set: { decision: input.decision, note: input.note?.trim().slice(0, 280) || null, createdAt: new Date() } }).returning();
  const decisions = await getDb().select().from(treasuryApprovals).where(eq(treasuryApprovals.proposalId, row.proposal.id));
  const approvalCount = decisions.filter((item) => item.decision === "approve").length;
  const status = input.decision === "reject" ? "rejected" : approvalCount >= row.proposal.approvalsRequired ? "approved" : "pending";
  const [proposal] = await getDb().update(treasuryProposals).set({ approvalCount, status, updatedAt: new Date() }).where(eq(treasuryProposals.id, row.proposal.id)).returning();
  await queueWebhookEvent(row.treasury.projectId, input.decision === "approve" ? "treasury.proposal_approved" : "treasury.proposal_rejected", { treasuryId: row.treasury.id, proposalId: proposal.id, approvalCount, status });
  await deliverQueuedWebhooks(10);
  return { proposal, approval };
}

export async function executeTreasuryProposal(request: Request, session: CurrentSession, input: { userId: string; proposalId: string; transferId?: string; challengeId?: string }) {
  const [row] = await getDb().select({ proposal: treasuryProposals, treasury: communityTreasuries, token: tokens }).from(treasuryProposals).innerJoin(communityTreasuries, eq(communityTreasuries.id, treasuryProposals.treasuryId)).innerJoin(tokens, eq(tokens.id, treasuryProposals.tokenId)).where(eq(treasuryProposals.id, input.proposalId)).limit(1);
  if (!row) throw new ApiError(404, "PROPOSAL_NOT_FOUND", "Treasury proposal not found.");
  await projectAccess(input.userId, row.treasury.projectId);
  const wallet = session.wallets.find((item) => item.blockchain === ARC_TESTNET.network);
  if (!wallet || wallet.address.toLowerCase() !== row.treasury.treasuryAddress) throw new ApiError(403, "TREASURY_WALLET_REQUIRED", "Payment must be approved by the configured Circle treasury wallet.");
  if (row.proposal.status === "executed") return { complete: true, proposal: proposalView(row) };
  if (input.challengeId) {
    if (!input.transferId || row.proposal.transferId !== input.transferId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This transfer does not belong to the treasury proposal.");
    const result = await confirmWalletTransferChallenge(request, session, { userId: input.userId, transferId: input.transferId, challengeId: input.challengeId });
    if (!result.complete) return result;
    const [executed] = await getDb().update(treasuryProposals).set({ status: "executed", transactionHash: result.transfer.transactionHash, executedAt: new Date(), updatedAt: new Date() }).where(eq(treasuryProposals.id, row.proposal.id)).returning();
    await queueWebhookEvent(row.treasury.projectId, "treasury.payment_executed", { treasuryId: row.treasury.id, proposalId: executed.id, transactionHash: executed.transactionHash, amountAtomic: executed.amountAtomic, asset: row.token.symbol });
    await deliverQueuedWebhooks(10);
    return { ...result, proposal: proposalView({ proposal: executed, token: row.token }) };
  }
  if (row.proposal.status !== "approved") throw new ApiError(409, "PROPOSAL_NOT_APPROVED", "Approve this proposal before preparing payment.");
  const prepared = await createWalletTransferChallenge(request, session, { userId: input.userId, tokenAddress: row.token.contractAddress, destination: row.proposal.recipientAddress, amount: formatAtomic(row.proposal.amountAtomic, row.token.decimals), note: `Treasury · ${row.proposal.title}` });
  await getDb().update(treasuryProposals).set({ status: "authorizing", transferId: prepared.transferId, updatedAt: new Date() }).where(eq(treasuryProposals.id, row.proposal.id));
  return { ...prepared, proposalId: row.proposal.id };
}

async function treasurySnapshot(treasury: typeof communityTreasuries.$inferSelect, project: typeof projects.$inferSelect, origin: string, publicView: boolean) {
  const [budgets, proposalRows] = await Promise.all([
    getDb().select({ budget: treasuryBudgets, token: tokens }).from(treasuryBudgets).innerJoin(tokens, eq(tokens.id, treasuryBudgets.tokenId)).where(eq(treasuryBudgets.treasuryId, treasury.id)).orderBy(desc(treasuryBudgets.createdAt)),
    getDb().select({ proposal: treasuryProposals, token: tokens }).from(treasuryProposals).innerJoin(tokens, eq(tokens.id, treasuryProposals.tokenId)).where(eq(treasuryProposals.treasuryId, treasury.id)).orderBy(desc(treasuryProposals.createdAt)),
  ]);
  const proposals = proposalRows.map((row) => proposalView(row, publicView));
  const tokenMap = new Map<string, typeof tokens.$inferSelect>();
  for (const row of budgets) tokenMap.set(row.token.id, row.token);
  for (const row of proposalRows) tokenMap.set(row.token.id, row.token);
  const balances = await Promise.all(Array.from(tokenMap.values()).map(async (token) => ({ symbol: token.symbol, address: token.contractAddress, amountAtomic: await currentBalance(treasury.treasuryAddress, token.contractAddress), decimals: token.decimals })));
  const budgetViews = budgets.map(({ budget, token }) => {
    const committed = proposalRows.filter((row) => row.proposal.budgetId === budget.id && !["rejected", "cancelled"].includes(row.proposal.status)).reduce((sum, row) => sum + BigInt(row.proposal.amountAtomic), BigInt(0));
    const spent = proposalRows.filter((row) => row.proposal.budgetId === budget.id && row.proposal.status === "executed").reduce((sum, row) => sum + BigInt(row.proposal.amountAtomic), BigInt(0));
    return { id: budget.id, category: budget.category, status: budget.status, limit: formatAtomic(budget.limitAtomic, token.decimals), committed: formatAtomic(committed.toString(), token.decimals), spent: formatAtomic(spent.toString(), token.decimals), remaining: formatAtomic((BigInt(budget.limitAtomic) - committed).toString(), token.decimals), asset: token.symbol, periodStart: budget.periodStart.toISOString(), periodEnd: budget.periodEnd.toISOString() };
  });
  return { treasury: { id: treasury.id, name: treasury.name, description: treasury.description, address: publicView ? `${treasury.treasuryAddress.slice(0, 8)}…${treasury.treasuryAddress.slice(-6)}` : treasury.treasuryAddress, status: treasury.status, publicSlug: treasury.publicSlug, publicUrl: `${origin}/?treasury=${encodeURIComponent(treasury.publicSlug)}#/public-treasury`, project: { name: project.name, logoUrl: project.logoUrl } }, balances: balances.map((item) => ({ ...item, amount: item.amountAtomic === null ? null : formatAtomic(item.amountAtomic, item.decimals) })), budgets: budgetViews, proposals, totals: { proposals: proposals.length, pending: proposals.filter((item) => ["pending", "approved", "authorizing"].includes(item.status)).length, executed: proposals.filter((item) => item.status === "executed").length, categories: new Set(budgetViews.map((item) => item.category)).size }, proof: { network: ARC_TESTNET.network, nonCustodial: true, privacy: "Public records show budgets, proposal purpose, masked recipients, and Arc receipts. No email, social identity, or API credential is exposed." } };
}

export async function listCommunityTreasury(userId: string, projectId: string, origin: string) {
  await projectAccess(userId, projectId);
  const [row] = await getDb().select({ treasury: communityTreasuries, project: projects }).from(communityTreasuries).innerJoin(projects, eq(projects.id, communityTreasuries.projectId)).where(eq(communityTreasuries.projectId, projectId)).limit(1);
  return row ? treasurySnapshot(row.treasury, row.project, origin, false) : { treasury: null, balances: [], budgets: [], proposals: [], totals: { proposals: 0, pending: 0, executed: 0, categories: 0 } };
}

export async function publicCommunityTreasury(publicSlug: string, origin: string) {
  const [row] = await getDb().select({ treasury: communityTreasuries, project: projects }).from(communityTreasuries).innerJoin(projects, eq(projects.id, communityTreasuries.projectId)).where(eq(communityTreasuries.publicSlug, publicSlug)).limit(1);
  if (!row || row.treasury.status !== "active") throw new ApiError(404, "TREASURY_NOT_FOUND", "This community treasury is not public.");
  return treasurySnapshot(row.treasury, row.project, origin, true);
}
