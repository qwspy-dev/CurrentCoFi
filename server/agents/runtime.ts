import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { agentActions, agentSettlementHandoffs, apiKeys } from "../db/schema.js";
import { ApiError } from "../http.js";
import type { AuthenticatedDeveloperKey } from "../developer/keys.js";
import { createDeveloperDistribution } from "../developer/distributions.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { createAgentSettlementHandoff, publicAgentSettlement } from "./settlement.js";

type AgentDistributionInput = {
  idempotencyKey?: unknown;
  name?: unknown;
  tokenAddress?: unknown;
  recipients?: unknown;
  expiresInHours?: unknown;
  activationEvent?: unknown;
  referralReward?: unknown;
  mode?: unknown;
};

type AgentPolicy = {
  dailyEventLimit?: unknown;
  maxRewardAtomic?: unknown;
  humanApprovalAtomic?: unknown;
  allowedIdentityTypes?: unknown;
};

export type AgentPolicyDecision = {
  outcome: "auto_approved" | "approval_required" | "blocked";
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
  amountAtomic: string;
  recipientCount: number;
};

const decimalPattern = /^(0|[1-9]\d*)(\.\d+)?$/;

function atomicAmount(value: unknown, decimals = 6) {
  const text = String(value ?? "").trim();
  if (!decimalPattern.test(text)) throw new ApiError(400, "INVALID_REWARD", "Every recipient amount must be a positive decimal.");
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) throw new ApiError(400, "INVALID_REWARD", `Reward amounts support up to ${decimals} decimals.`);
  const atomic = BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
  if (atomic <= BigInt(0)) throw new ApiError(400, "INVALID_REWARD", "Every recipient amount must be greater than zero.");
  return atomic;
}

function normalizedRecipients(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 10_000) {
    throw new ApiError(400, "INVALID_RECIPIENTS", "Agent distributions require 1 to 10,000 recipients.");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, "INVALID_RECIPIENT", "Each recipient must be an object.");
    }
    const record = item as Record<string, unknown>;
    return {
      identityType: String(record.identityType ?? "").toLowerCase(),
      amount: record.amount,
    };
  });
}

function policyAtomic(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

export function evaluateAgentActionPolicy(
  policies: AgentPolicy,
  recipientsValue: unknown,
  actionsToday = 0,
): AgentPolicyDecision {
  const recipients = normalizedRecipients(recipientsValue);
  const amount = recipients.reduce((total, recipient) => total + atomicAmount(recipient.amount), BigInt(0));
  const allowed = Array.isArray(policies.allowedIdentityTypes)
    ? new Set(policies.allowedIdentityTypes.map(String).map((value) => value.toLowerCase()))
    : new Set<string>();
  const disallowed = recipients.find((recipient) => allowed.size && !allowed.has(recipient.identityType));
  const max = policyAtomic(policies.maxRewardAtomic);
  const threshold = policyAtomic(policies.humanApprovalAtomic);
  const dailyLimit = Math.max(1, Number(policies.dailyEventLimit ?? 1_000));
  const reasons: string[] = [];

  if (disallowed) reasons.push(`${disallowed.identityType} recipients are outside this agent's identity policy.`);
  if (max !== null && amount > max) reasons.push("The total reward exceeds the agent's maximum reward policy.");
  if (actionsToday >= dailyLimit) reasons.push("The agent reached its daily action limit.");
  if (reasons.length) {
    return { outcome: "blocked", riskLevel: "high", reasons, amountAtomic: amount.toString(), recipientCount: recipients.length };
  }
  if (threshold !== null && amount >= threshold) {
    return {
      outcome: "approval_required",
      riskLevel: "medium",
      reasons: ["The reward meets the human approval threshold."],
      amountAtomic: amount.toString(),
      recipientCount: recipients.length,
    };
  }
  return {
    outcome: "auto_approved",
    riskLevel: "low",
    reasons: ["The request is within every configured agent boundary."],
    amountAtomic: amount.toString(),
    recipientCount: recipients.length,
  };
}

function publicAction(
  row: typeof agentActions.$inferSelect,
  agentName?: string | null,
  settlement?: typeof agentSettlementHandoffs.$inferSelect | null,
) {
  const request = row.requestPayload;
  const recipients = Array.isArray(request.recipients) ? request.recipients : [];
  return {
    id: row.id,
    agentName: agentName ?? "Current agent",
    kind: row.kind,
    status: row.status,
    riskLevel: row.riskLevel,
    amountAtomic: row.amountAtomic,
    assetAddress: row.assetAddress,
    recipientCount: recipients.length,
    campaignName: typeof request.name === "string" ? request.name : "Agent reward distribution",
    policyDecision: row.policyDecision,
    result: row.result,
    settlement: publicAgentSettlement(settlement),
    failureCode: row.failureCode,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function executeAction(action: typeof agentActions.$inferSelect, origin: string) {
  await getDb().update(agentActions).set({ status: "executing", updatedAt: new Date() }).where(eq(agentActions.id, action.id));
  try {
    const campaign = await createDeveloperDistribution(action.projectId, origin, action.requestPayload);
    const handoff = await createAgentSettlementHandoff({
      actionId: action.id,
      projectId: action.projectId,
      distributionId: campaign.id,
    });
    const [completed] = await getDb().update(agentActions).set({
      status: "awaiting_settlement",
      result: {
        distributionId: campaign.id,
        name: campaign.name,
        status: campaign.status,
        recipientCount: campaign.recipientCount,
        settlementStatus: "awaiting_settlement",
      },
      executedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agentActions.id, action.id)).returning();
    try {
      await queueWebhookEvent(action.projectId, "agent.settlement-ready", {
        actionId: action.id,
        distributionId: campaign.id,
        amountAtomic: action.amountAtomic,
        assetAddress: action.assetAddress,
      });
      await deliverQueuedWebhooks(10);
    } catch {
      // Settlement state is authoritative; webhook delivery retries independently.
    }
    return publicAction(completed, null, handoff);
  } catch (error) {
    const failureCode = error instanceof ApiError ? error.code : "AGENT_EXECUTION_FAILED";
    await getDb().update(agentActions).set({ status: "failed", failureCode, updatedAt: new Date() }).where(eq(agentActions.id, action.id));
    throw error;
  }
}

export async function proposeAgentDistribution(
  key: AuthenticatedDeveloperKey,
  origin: string,
  input: AgentDistributionInput,
) {
  if (key.kind !== "agent") throw new ApiError(403, "AGENT_KEY_REQUIRED", "Use a Current agent key for autonomous actions.");
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim().slice(0, 120) : "";
  if (!idempotencyKey) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "idempotencyKey is required for every agent action.");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(agentActions)
    .where(and(eq(agentActions.apiKeyId, key.id), gte(agentActions.createdAt, since)));
  const decision = evaluateAgentActionPolicy(key.policies, input.recipients, Number(count));
  const existing = await getDb().query.agentActions.findFirst({
    where: and(eq(agentActions.apiKeyId, key.id), eq(agentActions.idempotencyKey, idempotencyKey)),
  });
  if (existing) {
    const handoff = await getDb().query.agentSettlementHandoffs.findFirst({
      where: eq(agentSettlementHandoffs.actionId, existing.id),
    });
    return publicAction(existing, null, handoff);
  }

  const [created] = await getDb().insert(agentActions).values({
    projectId: key.projectId,
    apiKeyId: key.id,
    status: decision.outcome === "blocked" ? "blocked" : decision.outcome,
    riskLevel: decision.riskLevel,
    amountAtomic: decision.amountAtomic,
    assetAddress: typeof input.tokenAddress === "string" ? input.tokenAddress : null,
    idempotencyKey,
    requestPayload: input as Record<string, unknown>,
    policyDecision: decision,
  }).returning();
  if (decision.outcome === "blocked") return publicAction(created);
  if (decision.outcome === "approval_required") return publicAction(created);
  return executeAction(created, origin);
}

export async function listProjectAgentActions(projectId: string) {
  const rows = await getDb().select({
    action: agentActions,
    agentName: apiKeys.name,
    settlement: agentSettlementHandoffs,
  })
    .from(agentActions).leftJoin(apiKeys, eq(agentActions.apiKeyId, apiKeys.id))
    .leftJoin(agentSettlementHandoffs, eq(agentSettlementHandoffs.actionId, agentActions.id))
    .where(eq(agentActions.projectId, projectId)).orderBy(desc(agentActions.createdAt)).limit(100);
  const actions = rows.map((row) => publicAction(row.action, row.agentName, row.settlement));
  return {
    totals: {
      actions: actions.length,
      approvalRequired: actions.filter((action) => action.status === "approval_required").length,
      awaitingSettlement: actions.filter((action) => action.status === "awaiting_settlement").length,
      completed: actions.filter((action) => action.status === "completed").length,
      blocked: actions.filter((action) => action.status === "blocked").length,
    },
    actions,
  };
}

export async function reviewAgentAction(input: {
  projectId: string;
  userId: string;
  actionId: string;
  decision: "approve" | "reject";
  origin: string;
}) {
  const action = await getDb().query.agentActions.findFirst({
    where: and(eq(agentActions.id, input.actionId), eq(agentActions.projectId, input.projectId)),
  });
  if (!action) throw new ApiError(404, "AGENT_ACTION_NOT_FOUND", "This agent action could not be found.");
  if (action.status !== "approval_required") throw new ApiError(409, "ACTION_NOT_REVIEWABLE", "This action no longer needs review.");
  if (input.decision === "reject") {
    const [rejected] = await getDb().update(agentActions).set({
      status: "rejected",
      reviewedByUserId: input.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agentActions.id, action.id)).returning();
    return publicAction(rejected);
  }
  const [approved] = await getDb().update(agentActions).set({
    status: "approved",
    reviewedByUserId: input.userId,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(agentActions.id, action.id)).returning();
  return executeAction(approved, input.origin);
}
