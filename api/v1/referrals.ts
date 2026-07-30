import { persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import {
  createReferralCode,
  referralAnalytics,
} from "../../server/developer/referrals.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  if (request.method === "GET") return ok(request, await referralAnalytics(account.userId));
  const body = await readJsonObject(request);
  if (typeof body.distributionId !== "string") {
    throw new ApiError(400, "CAMPAIGN_REQUIRED", "distributionId is required.");
  }
  return ok(request, await createReferralCode(account.userId, body.distributionId), 201);
}, ["GET", "POST"]);
