import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";
import { socialPaymentChallenge } from "../../../server/payments/social.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  return ok(request, await socialPaymentChallenge(request, session, {
    userId: account.userId,
    token: requiredString(body, "token", 200),
    shareId: typeof body.shareId === "string" ? body.shareId : undefined,
    challengeId: typeof body.challengeId === "string" ? body.challengeId : undefined,
  }));
}, ["POST"]);
