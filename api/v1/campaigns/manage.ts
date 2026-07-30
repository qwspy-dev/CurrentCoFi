import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmCampaignManagementChallenge,
  createCampaignManagementChallenge,
} from "../../../server/campaigns/settlement.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const distributionId = requiredString(body, "distributionId", 100);
  if (body.action !== "cancel" && body.action !== "refund") {
    throw new ApiError(400, "INVALID_ACTION", "Campaign action must be cancel or refund.");
  }
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const data = challengeId
    ? await confirmCampaignManagementChallenge(
      request, session, account.userId, distributionId, body.action, challengeId,
    )
    : await createCampaignManagementChallenge(request, session, account.userId, distributionId, body.action);
  return ok(request, data);
}, ["POST"]);
