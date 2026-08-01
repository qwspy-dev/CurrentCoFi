import { and, asc, desc, eq, or } from "drizzle-orm";
import { getAddress, isAddress, keccak256, stringToHex, type Address } from "viem";
import type { CurrentSession } from "../auth/session.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import {
  auditEvents,
  escrowAgreements,
  escrowMilestones,
  projectMembers,
  tokens,
} from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { formatAtomic, projectAccess, resolveToken, toAtomic } from "../campaigns/repository.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";

export type EscrowMilestoneInput = { title: string; amount: string; dueAt: string };
export type EscrowAction = "approve-token" | "fund" | "submit" | "approve" | "dispute" | "resolve" | "request-cancellation" | "accept-cancellation" | "refund-expired";

function escrowAddress() {
  const address = getServerConfig().CURRENT_MILESTONE_ESCROW_ADDRESS;
  if (!address) throw new ApiError(503, "ESCROW_NOT_CONFIGURED", "Milestone escrow is not configured yet.");
  return address as Address;
}

export function contractEscrowId(agreementId: string) {
  return keccak256(stringToHex(agreementId));
}

function termsHash(input: { name: string; providerAddress: string; arbitratorAddress: string; milestones: EscrowMilestoneInput[] }) {
  return keccak256(stringToHex(JSON.stringify({
    version: "current-escrow-v1",
    name: input.name.trim(),
    providerAddress: input.providerAddress.toLowerCase(),
    arbitratorAddress: input.arbitratorAddress.toLowerCase(),
    milestones: input.milestones.map((row) => ({ title: row.title.trim(), amount: row.amount.trim(), dueAt: new Date(row.dueAt).toISOString() })),
  })));
}

export async function createEscrowAgreement(input: {
  projectId: string; userId?: string; actorKeyId?: string; clientAddress: string; name: string; tokenAddress?: string;
  providerAddress: string; arbitratorAddress: string; milestones: EscrowMilestoneInput[];
}) {
  if (input.userId) await projectAccess(input.userId, input.projectId);
  if (!input.userId && !input.actorKeyId) throw new ApiError(403, "ESCROW_ACTOR_REQUIRED", "An authenticated escrow actor is required.");
  if (!input.name.trim() || input.name.trim().length > 100) throw new ApiError(400, "INVALID_ESCROW_NAME", "Agreement names must contain 1–100 characters.");
  if (!isAddress(input.providerAddress) || !isAddress(input.arbitratorAddress)) throw new ApiError(400, "INVALID_ESCROW_PARTY", "Provider and arbitrator must be valid Arc addresses.");
  const clientAddress = getAddress(input.clientAddress);
  const providerAddress = getAddress(input.providerAddress);
  const arbitratorAddress = getAddress(input.arbitratorAddress);
  if (providerAddress === clientAddress || arbitratorAddress === clientAddress || arbitratorAddress === providerAddress) {
    throw new ApiError(400, "INVALID_ESCROW_PARTY", "Client, provider, and arbitrator must use different addresses.");
  }
  if (!input.milestones.length || input.milestones.length > 32) throw new ApiError(400, "INVALID_MILESTONES", "Agreements require 1–32 milestones.");
  const token = await resolveToken(input.projectId, input.tokenAddress);
  let previousDueAt = 0;
  const prepared = input.milestones.map((milestone, position) => {
    const dueAt = new Date(milestone.dueAt);
    if (!milestone.title.trim() || milestone.title.trim().length > 100 || !Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now() || dueAt.getTime() < previousDueAt) {
      throw new ApiError(400, "INVALID_MILESTONE", `Milestone ${position + 1} needs a title and a future deadline in chronological order.`);
    }
    previousDueAt = dueAt.getTime();
    return { position, title: milestone.title.trim(), amountAtomic: toAtomic(milestone.amount, token.decimals), dueAt };
  });
  const agreementId = crypto.randomUUID();
  const totalAmountAtomic = prepared.reduce((sum, milestone) => sum + BigInt(milestone.amountAtomic), BigInt(0)).toString();
  const digest = termsHash({ ...input, providerAddress, arbitratorAddress });
  const db = getDb();
  await db.insert(escrowAgreements).values({
    id: agreementId, projectId: input.projectId, clientUserId: input.userId, tokenId: token.id,
    name: input.name.trim(), clientAddress: clientAddress.toLowerCase(), providerAddress: providerAddress.toLowerCase(),
    refundAddress: clientAddress.toLowerCase(), arbitratorAddress: arbitratorAddress.toLowerCase(),
    contractDealId: contractEscrowId(agreementId), contractAddress: escrowAddress().toLowerCase(), termsHash: digest,
    totalAmountAtomic, milestoneCount: prepared.length,
  });
  await db.insert(escrowMilestones).values(prepared.map((milestone) => ({ agreementId, ...milestone })));
  await db.insert(auditEvents).values({ actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId, projectId: input.projectId, action: "escrow.created", resourceType: "escrow", resourceId: agreementId, metadata: { milestoneCount: prepared.length, totalAmountAtomic, asset: token.symbol, termsHash: digest } });
  await queueWebhookEvent(input.projectId, "escrow.created", { agreementId, milestoneCount: prepared.length, totalAmountAtomic, asset: token.symbol, termsHash: digest });
  await deliverQueuedWebhooks(10);
  return formatAgreement(await agreementRow(agreementId), prepared);
}

async function agreementRow(agreementId: string) {
  const [row] = await getDb().select({ agreement: escrowAgreements, token: tokens }).from(escrowAgreements).innerJoin(tokens, eq(tokens.id, escrowAgreements.tokenId)).where(eq(escrowAgreements.id, agreementId)).limit(1);
  if (!row) throw new ApiError(404, "ESCROW_NOT_FOUND", "This escrow agreement was not found.");
  return row;
}

function formatAgreement(row: Awaited<ReturnType<typeof agreementRow>>, milestones: Array<typeof escrowMilestones.$inferSelect | { position: number; title: string; amountAtomic: string; dueAt: Date }>) {
  const metadata = row.agreement.metadata as Record<string, unknown>;
  return {
    id: row.agreement.id, name: row.agreement.name, status: row.agreement.status,
    clientAddress: row.agreement.clientAddress, providerAddress: row.agreement.providerAddress,
    arbitratorAddress: row.agreement.arbitratorAddress, refundAddress: row.agreement.refundAddress,
    contractDealId: row.agreement.contractDealId, contractAddress: row.agreement.contractAddress,
    termsHash: row.agreement.termsHash, fundingTransactionHash: row.agreement.fundingTransactionHash,
    asset: { address: row.token.contractAddress, symbol: row.token.symbol, decimals: row.token.decimals },
    totalAmount: formatAtomic(row.agreement.totalAmountAtomic, row.token.decimals),
    releasedAmount: formatAtomic(row.agreement.releasedAmountAtomic, row.token.decimals),
    refundedAmount: formatAtomic(row.agreement.refundedAmountAtomic, row.token.decimals),
    nextMilestone: row.agreement.nextMilestone,
    cancellationRequested: metadata.cancellationRequested === true,
    milestones: milestones.map((milestone) => ({
      id: "id" in milestone ? milestone.id : null, position: milestone.position, title: milestone.title,
      amount: formatAtomic(milestone.amountAtomic, row.token.decimals), amountAtomic: milestone.amountAtomic,
      dueAt: milestone.dueAt.toISOString(), status: "status" in milestone ? milestone.status : "pending",
      proofHash: "proofHash" in milestone ? milestone.proofHash : null,
      submissionTransactionHash: "submissionTransactionHash" in milestone ? milestone.submissionTransactionHash : null,
      settlementTransactionHash: "settlementTransactionHash" in milestone ? milestone.settlementTransactionHash : null,
    })),
    createdAt: row.agreement.createdAt.toISOString(), updatedAt: row.agreement.updatedAt.toISOString(),
  };
}

export async function listEscrowAgreements(input: { userId: string; walletAddress: string }) {
  const walletAddress = input.walletAddress.toLowerCase();
  const memberships = await getDb().select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, input.userId));
  const projectIds = memberships.map((row) => row.projectId);
  const rows = await getDb().select({ agreement: escrowAgreements, token: tokens }).from(escrowAgreements).innerJoin(tokens, eq(tokens.id, escrowAgreements.tokenId)).where(or(
    eq(escrowAgreements.clientAddress, walletAddress), eq(escrowAgreements.providerAddress, walletAddress), eq(escrowAgreements.arbitratorAddress, walletAddress),
    ...(projectIds.map((projectId) => eq(escrowAgreements.projectId, projectId))),
  )).orderBy(desc(escrowAgreements.createdAt));
  const output = [];
  for (const row of rows) {
    const milestones = await getDb().select().from(escrowMilestones).where(eq(escrowMilestones.agreementId, row.agreement.id)).orderBy(asc(escrowMilestones.position));
    output.push(formatAgreement(row, milestones));
  }
  return { configured: Boolean(getServerConfig().CURRENT_MILESTONE_ESCROW_ADDRESS), network: ARC_TESTNET.network, agreements: output };
}

export async function listProjectEscrowAgreements(projectId: string) {
  const rows = await getDb().select({ agreement: escrowAgreements, token: tokens }).from(escrowAgreements).innerJoin(tokens, eq(tokens.id, escrowAgreements.tokenId)).where(eq(escrowAgreements.projectId, projectId)).orderBy(desc(escrowAgreements.createdAt));
  const output = [];
  for (const row of rows) {
    const milestones = await getDb().select().from(escrowMilestones).where(eq(escrowMilestones.agreementId, row.agreement.id)).orderBy(asc(escrowMilestones.position));
    output.push(formatAgreement(row, milestones));
  }
  return { configured: Boolean(getServerConfig().CURRENT_MILESTONE_ESCROW_ADDRESS), network: ARC_TESTNET.network, agreements: output };
}

async function accessibleAgreement(agreementId: string, walletAddress: string) {
  const row = await agreementRow(agreementId);
  const wallet = walletAddress.toLowerCase();
  if (![row.agreement.clientAddress, row.agreement.providerAddress, row.agreement.arbitratorAddress].includes(wallet)) {
    throw new ApiError(403, "ESCROW_ACCESS_DENIED", "This wallet is not a party to the agreement.");
  }
  return row;
}

function challengeKey(action: EscrowAction, position?: number) { return `escrow:${action}:${position ?? "deal"}`; }

export async function createEscrowActionChallenge(request: Request, session: CurrentSession, input: {
  agreementId: string; action: EscrowAction; position?: number; proof?: string; providerAward?: string;
}) {
  const wallet = arcWallet(session);
  const row = await accessibleAgreement(input.agreementId, wallet.address);
  const milestoneRows = await getDb().select().from(escrowMilestones).where(eq(escrowMilestones.agreementId, input.agreementId)).orderBy(asc(escrowMilestones.position));
  const milestone = input.position === undefined ? null : milestoneRows.find((item) => item.position === input.position);
  if (input.position !== undefined && !milestone) throw new ApiError(404, "MILESTONE_NOT_FOUND", "This milestone was not found.");
  const isClient = wallet.address.toLowerCase() === row.agreement.clientAddress;
  const isProvider = wallet.address.toLowerCase() === row.agreement.providerAddress;
  const isArbitrator = wallet.address.toLowerCase() === row.agreement.arbitratorAddress;
  if (["approve-token", "fund", "approve", "request-cancellation", "refund-expired"].includes(input.action) && !isClient) throw new ApiError(403, "ESCROW_ROLE_REQUIRED", "The client wallet must approve this action.");
  if (["submit", "accept-cancellation"].includes(input.action) && !isProvider) throw new ApiError(403, "ESCROW_ROLE_REQUIRED", "The provider wallet must approve this action.");
  if (input.action === "resolve" && !isArbitrator) throw new ApiError(403, "ESCROW_ROLE_REQUIRED", "The arbitrator wallet must approve this action.");
  if (input.action === "dispute" && !isClient && !isProvider) throw new ApiError(403, "ESCROW_ROLE_REQUIRED", "A deal party must approve this action.");

  let contractAddress = escrowAddress();
  let abiFunctionSignature = "";
  let abiParameters: Array<string | number | boolean | unknown[]> = [];
  let pendingProofHash: string | null = null;
  let pendingProviderAwardAtomic: string | null = null;
  if (input.action === "approve-token") {
    contractAddress = row.token.contractAddress as Address; abiFunctionSignature = "approve(address,uint256)"; abiParameters = [escrowAddress(), row.agreement.totalAmountAtomic];
  } else if (input.action === "fund") {
    abiFunctionSignature = "createEscrow((bytes32,address,address,address,address,uint256[],uint64[],bytes32))";
    abiParameters = [[row.agreement.contractDealId, row.agreement.providerAddress, row.agreement.refundAddress, row.token.contractAddress, row.agreement.arbitratorAddress, milestoneRows.map((item) => item.amountAtomic), milestoneRows.map((item) => Math.floor(item.dueAt.getTime() / 1_000).toString()), row.agreement.termsHash]];
  } else if (input.action === "submit") {
    if (!input.proof?.trim() || input.proof.length > 4_000) throw new ApiError(400, "INVALID_DELIVERY_PROOF", "Provide a delivery proof of up to 4,000 characters.");
    pendingProofHash = keccak256(stringToHex(input.proof.trim())); abiFunctionSignature = "submitMilestone(bytes32,uint32,bytes32)"; abiParameters = [row.agreement.contractDealId, input.position!, pendingProofHash];
  } else if (input.action === "approve") {
    abiFunctionSignature = "approveMilestone(bytes32,uint32)"; abiParameters = [row.agreement.contractDealId, input.position!];
  } else if (input.action === "dispute") {
    abiFunctionSignature = "raiseDispute(bytes32,uint32)"; abiParameters = [row.agreement.contractDealId, input.position!];
  } else if (input.action === "resolve") {
    pendingProviderAwardAtomic = (input.providerAward ?? "0").trim() === "0" ? "0" : toAtomic(input.providerAward ?? "0", row.token.decimals); abiFunctionSignature = "resolveDispute(bytes32,uint32,uint256)"; abiParameters = [row.agreement.contractDealId, input.position!, pendingProviderAwardAtomic];
  } else if (input.action === "request-cancellation") {
    abiFunctionSignature = "requestCancellation(bytes32)"; abiParameters = [row.agreement.contractDealId];
  } else if (input.action === "accept-cancellation") {
    abiFunctionSignature = "acceptCancellation(bytes32)"; abiParameters = [row.agreement.contractDealId];
  } else {
    abiFunctionSignature = "refundExpiredMilestone(bytes32,uint32)"; abiParameters = [row.agreement.contractDealId, input.position!];
  }
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, { walletId: wallet.id, contractAddress, abiFunctionSignature, abiParameters, refId: `escrow-${input.action}-${input.agreementId}`.slice(0, 100) });
  const metadata = row.agreement.metadata as Record<string, unknown>;
  await getDb().update(escrowAgreements).set({ metadata: { ...metadata, [challengeKey(input.action, input.position)]: { challengeId, proofHash: pendingProofHash, providerAwardAtomic: pendingProviderAwardAtomic } }, updatedAt: new Date() }).where(eq(escrowAgreements.id, input.agreementId));
  return { complete: false as const, action: input.action, challengeId };
}

export async function confirmEscrowActionChallenge(request: Request, session: CurrentSession, input: {
  agreementId: string; action: EscrowAction; challengeId: string; position?: number;
}) {
  const wallet = arcWallet(session);
  const row = await accessibleAgreement(input.agreementId, wallet.address);
  const metadata = row.agreement.metadata as Record<string, unknown>;
  const pending = metadata[challengeKey(input.action, input.position)] as Record<string, unknown> | undefined;
  if (pending?.challengeId !== input.challengeId) throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the escrow agreement.");
  const result = await circleChallengeResult(request, session, input.challengeId);
  if (result.pending) return result;
  const db = getDb();
  const agreementUpdates: Partial<typeof escrowAgreements.$inferInsert> = { updatedAt: new Date() };
  const milestone = input.position === undefined ? null : await db.query.escrowMilestones.findFirst({ where: and(eq(escrowMilestones.agreementId, input.agreementId), eq(escrowMilestones.position, input.position)) });
  if (input.action === "fund") { agreementUpdates.status = "active"; agreementUpdates.fundingTransactionHash = result.transactionHash; }
  if (input.action === "submit" && milestone) await db.update(escrowMilestones).set({ status: "submitted", proofHash: String(pending.proofHash), submissionTransactionHash: result.transactionHash, submittedAt: new Date(), updatedAt: new Date() }).where(eq(escrowMilestones.id, milestone.id));
  if (input.action === "dispute" && milestone) { agreementUpdates.status = "disputed"; await db.update(escrowMilestones).set({ status: "disputed", settlementTransactionHash: result.transactionHash, updatedAt: new Date() }).where(eq(escrowMilestones.id, milestone.id)); }
  if (["approve", "resolve", "refund-expired"].includes(input.action) && milestone) {
    const providerAward = input.action === "approve" ? BigInt(milestone.amountAtomic) : input.action === "resolve" ? BigInt(String(pending.providerAwardAtomic ?? "0")) : BigInt(0);
    const refund = BigInt(milestone.amountAtomic) - providerAward;
    agreementUpdates.releasedAmountAtomic = (BigInt(row.agreement.releasedAmountAtomic) + providerAward).toString();
    agreementUpdates.refundedAmountAtomic = (BigInt(row.agreement.refundedAmountAtomic) + refund).toString();
    agreementUpdates.nextMilestone = row.agreement.nextMilestone + 1;
    agreementUpdates.status = agreementUpdates.nextMilestone >= row.agreement.milestoneCount ? "completed" : "active";
    agreementUpdates.metadata = { ...metadata, cancellationRequested: false };
    await db.update(escrowMilestones).set({ status: providerAward === BigInt(0) ? "refunded" : "released", settlementTransactionHash: result.transactionHash, settledAt: new Date(), metadata: { providerAwardAtomic: providerAward.toString(), refundAmountAtomic: refund.toString() }, updatedAt: new Date() }).where(eq(escrowMilestones.id, milestone.id));
  }
  if (input.action === "request-cancellation") agreementUpdates.metadata = { ...metadata, cancellationRequested: true };
  if (input.action === "accept-cancellation") { agreementUpdates.status = "cancelled"; agreementUpdates.refundedAmountAtomic = (BigInt(row.agreement.totalAmountAtomic) - BigInt(row.agreement.releasedAmountAtomic)).toString(); agreementUpdates.metadata = { ...metadata, cancellationRequested: false }; }
  await db.update(escrowAgreements).set(agreementUpdates).where(eq(escrowAgreements.id, input.agreementId));
  await db.insert(auditEvents).values({ actorType: "user", actorId: wallet.address.toLowerCase(), projectId: row.agreement.projectId, action: `escrow.${input.action}`, resourceType: "escrow", resourceId: input.agreementId, metadata: { position: input.position ?? null, transactionHash: result.transactionHash } });
  await queueWebhookEvent(row.agreement.projectId, `escrow.${input.action}`, { agreementId: input.agreementId, position: input.position ?? null, transactionHash: result.transactionHash });
  await deliverQueuedWebhooks(10);
  return { ...result, status: agreementUpdates.status ?? row.agreement.status };
}
