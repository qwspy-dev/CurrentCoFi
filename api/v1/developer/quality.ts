import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
import {
  campaignQualitySnapshot,
  evaluateCampaignQuality,
  updateQualityPolicy,
} from "../../../server/campaigns/quality.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  if (request.method === "GET") {
    requireDeveloperPermission(key, "analytics:read");
    return ok(request, await campaignQualitySnapshot(key.projectId));
  }
  requireDeveloperPermission(key, "campaigns:write");
  const rawBody = await request.text();
  if (rawBody.length > 32_768) throw new ApiError(413, "BODY_TOO_LARGE", "Quality payloads are limited to 32 KB.");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody || "{}"); }
  catch { throw new ApiError(400, "INVALID_JSON", "The quality payload must be valid JSON."); }
  if (typeof body.distributionId !== "string") throw new ApiError(400, "CAMPAIGN_REQUIRED", "distributionId is required.");
  if (body.action === "evaluate") return ok(request, await evaluateCampaignQuality({
    projectId: key.projectId, actorKeyId: key.id, distributionId: body.distributionId,
  }));
  if (body.action === "update-policy") return ok(request, await updateQualityPolicy({
    projectId: key.projectId, actorKeyId: key.id, distributionId: body.distributionId, body,
  }));
  throw new ApiError(400, "INVALID_QUALITY_ACTION", "Use evaluate or update-policy.");
}, ["GET", "POST"]);
