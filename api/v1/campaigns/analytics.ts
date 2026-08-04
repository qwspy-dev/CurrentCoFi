import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { campaignAnalytics } from "../../../server/campaigns/repository.js";
import { userDiscoveryAnalytics } from "../../../server/discovery/analytics.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const [analytics, discovery] = await Promise.all([campaignAnalytics(account.userId), userDiscoveryAnalytics(account.userId)]);
  return ok(request, { ...analytics, discovery });
}, ["GET"]);
