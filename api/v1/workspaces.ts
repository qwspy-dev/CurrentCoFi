import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";
import { createWorkspaceInvitation, listWorkspace, revokeWorkspaceInvitation, switchWorkspace, updateWorkspaceMember } from "../../server/workspaces/repository.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  if (request.method === "GET") return ok(request, await listWorkspace(account.userId, project.id));
  const body = await readJsonObject(request);
  const action = String(body.action ?? "");
  const origin = new URL(request.url).origin;
  if (action === "switch") return ok(request, await switchWorkspace(account.userId, String(body.projectId ?? "")));
  if (action === "invite") return ok(request, await createWorkspaceInvitation({ userId: account.userId, projectId: project.id, email: body.email, role: body.role, origin }), 201);
  if (action === "revoke-invitation") return ok(request, await revokeWorkspaceInvitation(account.userId, project.id, String(body.invitationId ?? "")));
  if (action === "update-role" || action === "remove-member") return ok(request, await updateWorkspaceMember({ userId: account.userId, projectId: project.id, memberUserId: String(body.userId ?? ""), action: action === "update-role" ? "role" : "remove", role: body.role }));
  throw new ApiError(400, "INVALID_WORKSPACE_ACTION", "Use switch, invite, revoke-invitation, update-role, or remove-member.");
}, ["GET", "POST"]);
