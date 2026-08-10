import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";
import { acceptWorkspaceInvitation, publicWorkspaceInvitation } from "../../../server/workspaces/repository.js";

export default withApi(async (request) => {
  if (request.method === "GET") {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!token) throw new ApiError(400, "INVITATION_TOKEN_REQUIRED", "A workspace invitation token is required.");
    return ok(request, await publicWorkspaceInvitation(token));
  }
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  return ok(request, await acceptWorkspaceInvitation({ userId: account.userId, email: session.email, token: String(body.token ?? "") }));
}, ["GET", "POST"]);
