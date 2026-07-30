import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  confirmClaimChallenge,
  createClaimChallenge,
} from "../../../server/claims/settlement.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const token = requiredString(body, "token", 1_000);
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const data = challengeId
    ? await confirmClaimChallenge(request, session, account.userId, token, challengeId)
    : await createClaimChallenge(request, session, account.userId, token);
  return ok(request, data);
}, ["POST"]);
