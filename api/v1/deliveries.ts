import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { campaignDeliveryCenter, markCampaignDelivery } from "../../server/campaigns/repository.js";
import { dispatchCampaignEmail } from "../../server/campaigns/email-delivery.js";
import { ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  if (request.method === "GET") {
    const distributionId = new URL(request.url).searchParams.get("distributionId") ?? undefined;
    return ok(request, await campaignDeliveryCenter(account.userId, project.id, distributionId));
  }
  const body = await readJsonObject(request);
  if (body.action === "dispatch-email") return ok(request, await dispatchCampaignEmail({ userId: account.userId, projectId: project.id, deliveryId: requiredString(body, "deliveryId", 80) }));
  return ok(request, await markCampaignDelivery({ userId: account.userId, projectId: project.id, deliveryId: requiredString(body, "deliveryId", 80), channel: requiredString(body, "channel", 30) }));
}, ["GET", "POST"]);
