import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { updateProjectBrand } from "../../server/branding/repository.js";
import { resolveToken } from "../../server/campaigns/repository.js";
import { ok, readJsonObject, withApi } from "../../server/http.js";
import { projectSetupWorkspace } from "../../server/onboarding/repository.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  if (request.method === "POST") {
    const body = await readJsonObject(request);
    await updateProjectBrand(project.id, {
      name: body.name,
      description: body.description,
      websiteUrl: body.websiteUrl,
      logoUrl: body.logoUrl,
    });
    if (typeof body.tokenAddress === "string" && body.tokenAddress.trim()) await resolveToken(project.id, body.tokenAddress);
  }
  return ok(request, await projectSetupWorkspace(project.id, account.userId));
}, ["GET", "POST"]);
