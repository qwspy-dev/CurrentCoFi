import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { readProjectBrand, updateProjectBrand } from "../../server/branding/repository.js";
import { ok, readJsonObject, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  if (request.method === "GET") return ok(request, await readProjectBrand(project.id));
  return ok(request, await updateProjectBrand(project.id, await readJsonObject(request)));
}, ["GET", "POST"]);
