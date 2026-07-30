import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { listRecipients } from "../../../server/campaigns/repository.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const campaignId = new URL(request.url).searchParams.get("campaignId") ?? undefined;
  return ok(request, { recipients: await listRecipients(account.userId, campaignId) });
}, ["GET"]);
