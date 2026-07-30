import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { campaignAnalytics } from "../../../server/campaigns/repository.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  return ok(request, await campaignAnalytics(account.userId));
}, ["GET"]);
