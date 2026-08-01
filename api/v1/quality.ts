import { developerSession } from "../../server/developer/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";
import {
  evaluateCampaignQuality,
  updateQualityPolicy,
  userCampaignQuality,
} from "../../server/campaigns/quality.js";

export default withApi(async (request) => {
  const { account, project } = await developerSession(request);
  if (request.method === "GET") return ok(request, await userCampaignQuality(account.userId, project.id));
  const body = await readJsonObject(request);
  if (typeof body.distributionId !== "string") throw new ApiError(400, "CAMPAIGN_REQUIRED", "distributionId is required.");
  if (body.action === "evaluate") return ok(request, await evaluateCampaignQuality({
    userId: account.userId, projectId: project.id, distributionId: body.distributionId,
  }));
  if (body.action === "update-policy") return ok(request, await updateQualityPolicy({
    userId: account.userId, projectId: project.id, distributionId: body.distributionId, body,
  }));
  throw new ApiError(400, "INVALID_QUALITY_ACTION", "Use evaluate or update-policy.");
}, ["GET", "POST"]);
