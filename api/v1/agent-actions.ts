import { listProjectAgentActions, reviewAgentAction } from "../../server/agents/runtime.js";
import { developerSession } from "../../server/developer/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const { account, project } = await developerSession(request);
  if (request.method === "GET") return ok(request, await listProjectAgentActions(project.id));
  const body = await readJsonObject(request);
  if (typeof body.actionId !== "string" || (body.decision !== "approve" && body.decision !== "reject")) {
    throw new ApiError(400, "INVALID_REVIEW", "actionId and an approve or reject decision are required.");
  }
  return ok(request, await reviewAgentAction({
    projectId: project.id,
    userId: account.userId,
    actionId: body.actionId,
    decision: body.decision,
    origin: new URL(request.url).origin,
  }));
}, ["GET", "POST"]);
