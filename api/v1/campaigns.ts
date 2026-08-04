import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import {
  campaignAnalytics,
  createCampaign,
  listCampaigns,
  type CampaignRecipientInput,
} from "../../server/campaigns/repository.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../../server/developer/webhooks.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";
import { parseCampaignClaimMode } from "../../server/claims/identity-binding.js";
import { userDiscoveryAnalytics } from "../../server/discovery/analytics.js";

function expiration(value: unknown) {
  const hours = typeof value === "number" ? value : Number(value ?? 168);
  if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 30) {
    throw new ApiError(400, "INVALID_EXPIRATION", "Expiration must be between one hour and 30 days.");
  }
  return Math.round(hours);
}

function recipients(value: unknown): CampaignRecipientInput[] {
  if (!Array.isArray(value)) throw new ApiError(400, "INVALID_RECIPIENTS", "Recipients must be an array.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, "INVALID_RECIPIENT", `Recipient ${index + 1} is invalid.`);
    }
    const row = item as Record<string, unknown>;
    const identityType = row.identityType;
    if (!["email", "wallet", "x", "game", "custom"].includes(String(identityType))) {
      throw new ApiError(400, "INVALID_RECIPIENT", `Recipient ${index + 1} has an unsupported identity type.`);
    }
    if (typeof row.identity !== "string" || typeof row.amount !== "string") {
      throw new ApiError(400, "INVALID_RECIPIENT", `Recipient ${index + 1} needs identity and amount values.`);
    }
    return {
      identityType: identityType as CampaignRecipientInput["identityType"],
      identity: row.identity,
      amount: row.amount,
    };
  });
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before making a campaign.");
  const body = await readJsonObject(request);
  if (typeof body.name !== "string") throw new ApiError(400, "INVALID_CAMPAIGN_NAME", "Campaign name is required.");
  const campaign = await createCampaign({
    userId: account.userId,
    displayName: session.displayName,
    projectId: project.id,
    refundAddress: wallet.address,
    origin: new URL(request.url).origin,
    name: body.name,
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    recipients: recipients(body.recipients),
    expiresInHours: expiration(body.expiresInHours),
    activationEvent: typeof body.activationEvent === "string" ? body.activationEvent : undefined,
    activationDestination: body.activationDestination,
    referralReward: typeof body.referralReward === "string" ? body.referralReward : undefined,
    claimCondition: body.claimCondition,
    claimMode: parseCampaignClaimMode(body.mode),
  });
  await queueWebhookEvent(project.id, "campaign.created", {
    distributionId: campaign.id,
    name: campaign.name,
    asset: campaign.asset.symbol,
    recipientCount: campaign.recipientCount,
    totalAmount: campaign.totalAmount,
  });
  await deliverQueuedWebhooks(10);
  return ok(request, campaign, 201);
}

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const [campaigns, analytics, discovery] = await Promise.all([
    listCampaigns(account.userId),
    campaignAnalytics(account.userId),
    userDiscoveryAnalytics(account.userId),
  ]);
  return ok(request, { campaigns, analytics: { ...analytics, discovery } });
}

export default withApi(
  (request) => request.method === "POST" ? create(request) : read(request),
  ["GET", "POST"],
);
