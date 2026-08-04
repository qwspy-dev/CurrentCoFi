import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { openActivationDestination } from "../../../server/campaigns/destinations.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  return ok(request, await openActivationDestination(account.userId, requiredString(body, "allocationId", 100)));
}, ["POST"]);
