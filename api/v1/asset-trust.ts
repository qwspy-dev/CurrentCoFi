import { developerSession } from "../../server/developer/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";
import {
  acknowledgeProjectToken,
  recheckProjectToken,
  tokenTrustWorkspace,
} from "../../server/tokens/monitor.js";

async function read(request: Request) {
  const { project } = await developerSession(request);
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project workspace not found.");
  return ok(request, await tokenTrustWorkspace(project.id));
}

async function update(request: Request) {
  const { account, project } = await developerSession(request);
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project workspace not found.");
  const body = await readJsonObject(request);
  const tokenId = requiredString(body, "tokenId", 100);
  if (body.action === "recheck") {
    return ok(request, await recheckProjectToken(project.id, tokenId, account.userId));
  }
  if (body.action === "acknowledge") {
    return ok(request, await acknowledgeProjectToken(project.id, tokenId, account.userId));
  }
  throw new ApiError(400, "INVALID_TRUST_ACTION", "Choose recheck or acknowledge.");
}

export default withApi(
  (request) => request.method === "POST" ? update(request) : read(request),
  ["GET", "POST"],
);
