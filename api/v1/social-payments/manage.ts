import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { cancelSocialPayment } from "../../../server/payments/social.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const action = requiredString(body, "action", 20);
  if (action !== "cancel") throw new ApiError(400, "INVALID_ACTION", "Only cancel is supported.");
  return ok(request, await cancelSocialPayment(account.userId, requiredString(body, "requestId", 80)));
}, ["POST"]);
