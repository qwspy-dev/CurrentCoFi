import { campaignDeliveryCenter, markCampaignDelivery } from "../../../server/campaigns/repository.js";
import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  const owner = await developerProjectOwner(key.projectId);
  if (request.method === "GET") {
    requireDeveloperPermission(key, "analytics:read");
    return ok(request, await campaignDeliveryCenter(owner.userId, key.projectId, new URL(request.url).searchParams.get("distributionId") ?? undefined));
  }
  requireDeveloperPermission(key, "campaigns:write");
  const raw = await request.text();
  if (raw.length > 16_384) throw new ApiError(413, "BODY_TOO_LARGE", "Delivery updates are limited to 16 KB.");
  await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>; try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Delivery update must be valid JSON."); }
  return ok(request, await markCampaignDelivery({ userId: owner.userId, projectId: key.projectId, deliveryId: requiredString(body, "deliveryId", 80), channel: requiredString(body, "channel", 30) }));
}, ["GET", "POST"]);
