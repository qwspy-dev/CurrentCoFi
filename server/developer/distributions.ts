import { and, eq } from "drizzle-orm";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import { projectMembers, users, wallets } from "../db/schema.js";
import type { CampaignRecipientInput } from "../campaigns/repository.js";
import { createCampaign } from "../campaigns/repository.js";
import { ApiError } from "../http.js";
import { parseCampaignClaimMode } from "../claims/identity-binding.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "./webhooks.js";

type DistributionInput = {
  name?: unknown;
  tokenAddress?: unknown;
  recipients?: unknown;
  expiresInHours?: unknown;
  activationEvent?: unknown;
  activationDestination?: unknown;
  referralReward?: unknown;
  claimCondition?: unknown;
  mode?: unknown;
};

const recipientTypes = new Set<CampaignRecipientInput["identityType"]>([
  "email",
  "wallet",
  "x",
  "game",
  "custom",
]);

function parseRecipients(value: unknown): CampaignRecipientInput[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "INVALID_RECIPIENTS", "recipients must be an array.");
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, "INVALID_RECIPIENT", `Recipient ${index + 1} is invalid.`);
    }
    const record = item as Record<string, unknown>;
    const identityType = String(record.identityType) as CampaignRecipientInput["identityType"];
    if (
      !recipientTypes.has(identityType) ||
      typeof record.identity !== "string" ||
      typeof record.amount !== "string"
    ) {
      throw new ApiError(
        400,
        "INVALID_RECIPIENT",
        `Recipient ${index + 1} needs identityType, identity, and amount.`,
      );
    }
    return { identityType, identity: record.identity, amount: record.amount };
  });
}

function optionalString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

export async function developerProjectOwner(projectId: string) {
  const [owner] = await getDb().select({
    userId: projectMembers.userId,
    displayName: users.displayName,
    refundAddress: wallets.address,
  }).from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .innerJoin(wallets, and(
      eq(wallets.userId, projectMembers.userId),
      eq(wallets.chainCode, ARC_TESTNET.network),
      eq(wallets.status, "active"),
    ))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "owner")))
    .limit(1);
  if (!owner) {
    throw new ApiError(
      409,
      "PROJECT_WALLET_REQUIRED",
      "The project owner must initialize an Arc wallet before API campaigns can be created.",
    );
  }
  return owner;
}

export async function createDeveloperDistribution(
  projectId: string,
  origin: string,
  input: DistributionInput,
) {
  if (typeof input.name !== "string") {
    throw new ApiError(400, "INVALID_CAMPAIGN_NAME", "name is required.");
  }
  const expiresInHours = Math.round(Number(input.expiresInHours ?? 168));
  if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 720) {
    throw new ApiError(400, "INVALID_EXPIRATION", "expiresInHours must be between 1 and 720.");
  }
  const owner = await developerProjectOwner(projectId);
  const campaign = await createCampaign({
    userId: owner.userId,
    displayName: owner.displayName ?? "Current project",
    projectId,
    refundAddress: owner.refundAddress,
    origin,
    name: input.name,
    tokenAddress: optionalString(input.tokenAddress, 80),
    recipients: parseRecipients(input.recipients),
    expiresInHours,
    activationEvent: optionalString(input.activationEvent, 100),
    activationDestination: input.activationDestination,
    referralReward: optionalString(input.referralReward, 100),
    claimCondition: input.claimCondition,
    claimMode: parseCampaignClaimMode(input.mode),
  });
  await queueWebhookEvent(projectId, "campaign.created", {
    distributionId: campaign.id,
    name: campaign.name,
    asset: campaign.asset.symbol,
    recipientCount: campaign.recipientCount,
    totalAmount: campaign.totalAmount,
    source: "developer-api",
  });
  await deliverQueuedWebhooks(10);
  return campaign;
}
