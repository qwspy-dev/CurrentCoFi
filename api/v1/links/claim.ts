import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmClaimChallenge,
  createClaimChallenge,
} from "../../../server/claims/settlement.js";
import { claimRoutingForToken } from "../../../server/campaigns/repository.js";
import { recordReferralClaim } from "../../../server/developer/referrals.js";
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
  const referralCode = typeof body.referralCode === "string" && body.referralCode.length <= 100
    ? body.referralCode
    : null;
  const routing = await claimRoutingForToken(token);
  const campaign = routing?.kind === "merkle-campaign";
  const data = campaign
    ? challengeId
      ? await confirmCampaignClaimChallenge(request, session, account.userId, token, challengeId)
      : await createCampaignClaimChallenge(request, session, account.userId, token)
    : challengeId
      ? await confirmClaimChallenge(request, session, account.userId, token, challengeId)
      : await createClaimChallenge(request, session, account.userId, token);
  if (
    challengeId
    && referralCode
    && routing?.distributionId
    && "status" in data
    && data.status === "confirmed"
  ) {
    await recordReferralClaim(routing.distributionId, referralCode, account.userId);
  }
  return ok(request, data);
}, ["POST"]);
