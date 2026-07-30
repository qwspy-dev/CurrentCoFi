import { resolveClaimLink } from "../../../server/claims/links.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const body = await readJsonObject(request);
  const token = requiredString(body, "token", 1_000);
  return ok(request, await resolveClaimLink(token));
}, ["POST"]);
