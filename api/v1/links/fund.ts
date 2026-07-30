import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmFundingChallenge,
  createFundingChallenge,
} from "../../../server/claims/settlement.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const distributionId = requiredString(body, "distributionId", 100);
  const action = requiredString(body, "action", 20);
  if (action !== "approve" && action !== "deposit") {
    throw new ApiError(400, "INVALID_FUNDING_ACTION", "Choose approve or deposit.");
  }
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const data = challengeId
    ? await confirmFundingChallenge(request, session, account.userId, distributionId, action, challengeId)
    : await createFundingChallenge(request, session, account.userId, distributionId, action);
  return ok(request, data);
}, ["POST"]);
