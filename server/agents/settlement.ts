import { and, eq } from "drizzle-orm";
import type { CurrentSession } from "../auth/session.js";
import {
  confirmCampaignFundingChallenge,
  createCampaignFundingChallenge,
} from "../campaigns/settlement.js";
import { getDb } from "../db/client.js";
import { agentActions, agentSettlementHandoffs } from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";

type SettlementRow = typeof agentSettlementHandoffs.$inferSelect;

export function publicAgentSettlement(row: SettlementRow | null | undefined) {
  if (!row) return null;
  const approved = ["approved", "funding", "settled"].includes(row.status);
  const settled = row.status === "settled";
  return {
    id: row.id,
    status: row.status,
    approvalChallengeId: row.approvalChallengeId,
    fundingChallengeId: row.fundingChallengeId,
    transactionHash: row.transactionHash,
    failureCode: row.failureCode,
    evidence: row.evidence,
    settledAt: row.settledAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    stages: [
      { id: "campaign", label: "Campaign created", complete: true },
      { id: "approval", label: "Token approved", complete: approved },
      { id: "funding", label: "Arc vault funded", complete: settled },
    ],
  };
}

export async function createAgentSettlementHandoff(input: {
  actionId: string;
  projectId: string;
  distributionId: string;
}) {
  await getDb().insert(agentSettlementHandoffs).values(input).onConflictDoNothing();
  const row = await getDb().query.agentSettlementHandoffs.findFirst({
    where: and(
      eq(agentSettlementHandoffs.actionId, input.actionId),
      eq(agentSettlementHandoffs.projectId, input.projectId),
    ),
  });
  if (!row) throw new ApiError(500, "AGENT_HANDOFF_FAILED", "The agent settlement handoff could not be created.");
  return row;
}

async function settlementRow(projectId: string, actionId: string) {
  const [row] = await getDb().select({ action: agentActions, handoff: agentSettlementHandoffs })
    .from(agentActions)
    .innerJoin(agentSettlementHandoffs, eq(agentSettlementHandoffs.actionId, agentActions.id))
    .where(and(eq(agentActions.id, actionId), eq(agentActions.projectId, projectId)))
    .limit(1);
  if (!row) throw new ApiError(404, "AGENT_SETTLEMENT_NOT_FOUND", "This agent settlement handoff was not found.");
  return row;
}

export async function createAgentSettlementChallenge(input: {
  request: Request;
  session: CurrentSession;
  userId: string;
  projectId: string;
  actionId: string;
  action: "approve" | "deposit";
}) {
  const row = await settlementRow(input.projectId, input.actionId);
  if (row.handoff.status === "settled") {
    return { complete: true, status: "settled", transactionHash: row.handoff.transactionHash };
  }
  if (input.action === "deposit" && !["approved", "funding"].includes(row.handoff.status)) {
    throw new ApiError(409, "AGENT_APPROVAL_REQUIRED", "Approve the campaign token before funding the Arc vault.");
  }
  const result = await createCampaignFundingChallenge(
    input.request,
    input.session,
    input.userId,
    row.handoff.distributionId,
    input.action,
  );
  if (result.complete) {
    await finalizeHandoff(row, input.action, result.transactionHash ?? null, input.userId);
    return { ...result, status: input.action === "deposit" ? "settled" : "approved" };
  }
  await getDb().update(agentSettlementHandoffs).set({
    reviewerUserId: input.userId,
    status: input.action === "approve" ? "approving" : "funding",
    approvalChallengeId: input.action === "approve" ? result.challengeId : row.handoff.approvalChallengeId,
    fundingChallengeId: input.action === "deposit" ? result.challengeId : row.handoff.fundingChallengeId,
    updatedAt: new Date(),
  }).where(eq(agentSettlementHandoffs.id, row.handoff.id));
  return result;
}

async function finalizeHandoff(
  row: Awaited<ReturnType<typeof settlementRow>>,
  action: "approve" | "deposit",
  transactionHash: string | null,
  userId: string,
) {
  const now = new Date();
  const evidence = {
    ...row.handoff.evidence,
    [`${action}TransactionHash`]: transactionHash,
    [`${action}ConfirmedAt`]: now.toISOString(),
  };
  if (action === "approve") {
    await getDb().update(agentSettlementHandoffs).set({
      reviewerUserId: userId,
      status: "approved",
      evidence,
      updatedAt: now,
    }).where(eq(agentSettlementHandoffs.id, row.handoff.id));
    try {
      await queueWebhookEvent(row.action.projectId, "agent.settlement-approved", {
        actionId: row.action.id,
        distributionId: row.handoff.distributionId,
        transactionHash,
      });
      await deliverQueuedWebhooks(10);
    } catch {
      // The approval receipt remains durable even if webhook delivery is unavailable.
    }
    return;
  }
  await getDb().transaction(async (tx) => {
    await tx.update(agentSettlementHandoffs).set({
      reviewerUserId: userId,
      status: "settled",
      transactionHash,
      evidence,
      settledAt: now,
      updatedAt: now,
    }).where(eq(agentSettlementHandoffs.id, row.handoff.id));
    await tx.update(agentActions).set({
      status: "completed",
      result: {
        ...row.action.result,
        settlementStatus: "settled",
        fundingTransactionHash: transactionHash,
      },
      updatedAt: now,
    }).where(eq(agentActions.id, row.action.id));
  });
  try {
    await queueWebhookEvent(row.action.projectId, "agent.settled", {
      actionId: row.action.id,
      distributionId: row.handoff.distributionId,
      transactionHash,
    });
    await deliverQueuedWebhooks(10);
  } catch {
    // Confirmed Arc settlement must not be rolled back by an integration outage.
  }
}

export async function confirmAgentSettlementChallenge(input: {
  request: Request;
  session: CurrentSession;
  userId: string;
  projectId: string;
  actionId: string;
  action: "approve" | "deposit";
  challengeId: string;
}) {
  const row = await settlementRow(input.projectId, input.actionId);
  const expectedChallenge = input.action === "approve"
    ? row.handoff.approvalChallengeId
    : row.handoff.fundingChallengeId;
  if (!expectedChallenge || expectedChallenge !== input.challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This wallet action does not belong to the agent settlement.");
  }
  const result = await confirmCampaignFundingChallenge(
    input.request,
    input.session,
    input.userId,
    row.handoff.distributionId,
    input.action,
    input.challengeId,
  );
  if (result.pending) return result;
  await finalizeHandoff(row, input.action, result.transactionHash, input.userId);
  return {
    ...result,
    status: input.action === "deposit" ? "settled" : "approved",
    settlement: publicAgentSettlement((await settlementRow(input.projectId, input.actionId)).handoff),
  };
}
