import { verifyTelegramIdentity } from "../../../../server/auth/external-identities.js";
import { sessionFromRequest } from "../../../../server/auth/session.js";
import { ok, readJsonObject, withApi } from "../../../../server/http.js";

export default withApi(async (request) => {
  const provider = await verifyTelegramIdentity(await sessionFromRequest(request), await readJsonObject(request));
  return ok(request, { linked: true, provider });
}, ["POST"]);
