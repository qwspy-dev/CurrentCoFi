import { developerSession } from "../../server/developer/session.js";
import {
  createUserPilot,
  listUserPilots,
  updateUserPilot,
} from "../../server/pilots/operations.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

async function createOrUpdate(request: Request) {
  const { account, project } = await developerSession(request);
  const body = await readJsonObject(request);
  const action = body.action === undefined ? "create" : body.action;
  if (action === "create") {
    return ok(request, await createUserPilot({
      userId: account.userId,
      projectId: project.id,
      body,
    }), 201);
  }
  if (action === "update" && typeof body.pilotId === "string") {
    return ok(request, await updateUserPilot({
      userId: account.userId,
      projectId: project.id,
      pilotId: body.pilotId,
      body,
    }));
  }
  throw new ApiError(400, "INVALID_PILOT_ACTION", "Use create or update with a pilotId.");
}

async function list(request: Request) {
  const { account } = await developerSession(request);
  return ok(request, { pilots: await listUserPilots(account.userId) });
}

export default withApi(
  (request) => request.method === "POST" ? createOrUpdate(request) : list(request),
  ["GET", "POST"],
);
