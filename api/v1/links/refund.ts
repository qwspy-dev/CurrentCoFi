import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmRefundChallenge,
  createRefundChallenge,
} from "../../../server/claims/settlement.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const distributionId = requiredString(body, "distributionId", 100);
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const data = challengeId
    ? await confirmRefundChallenge(request, session, account.userId, distributionId, challengeId)
    : await createRefundChallenge(request, session, account.userId, distributionId);
  return ok(request, data);
}, ["POST"]);
