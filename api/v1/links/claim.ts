import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmClaimChallenge,
  createClaimChallenge,
} from "../../../server/claims/settlement.js";
import { campaignKindForClaim } from "../../../server/campaigns/repository.js";
import {
  confirmCampaignClaimChallenge,
  createCampaignClaimChallenge,
} from "../../../server/campaigns/settlement.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const token = requiredString(body, "token", 1_000);
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const campaign = await campaignKindForClaim(token) === "merkle-campaign";
  const data = campaign
    ? challengeId
      ? await confirmCampaignClaimChallenge(request, session, account.userId, token, challengeId)
      : await createCampaignClaimChallenge(request, session, account.userId, token)
    : challengeId
      ? await confirmClaimChallenge(request, session, account.userId, token, challengeId)
      : await createClaimChallenge(request, session, account.userId, token);
  return ok(request, data);
}, ["POST"]);
