import { developerSession } from "../../server/developer/session.js";
import {
  createUserPilot,
  createPilotInvitation,
  listPilotPipeline,
  listUserPilots,
  reviewPilotApplication,
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
  if (action === "create-invitation") {
    return ok(request, await createPilotInvitation({ userId: account.userId, projectId: project.id, body }), 201);
  }
  if (action === "review-application" && typeof body.applicationId === "string" && typeof body.status === "string") {
    return ok(request, await reviewPilotApplication({
      userId: account.userId, projectId: project.id, applicationId: body.applicationId,
      status: body.status, reviewNotes: body.reviewNotes,
    }));
  }
  throw new ApiError(400, "INVALID_PILOT_ACTION", "Use create, update, create-invitation, or review-application.");
}

async function list(request: Request) {
  const { account, project } = await developerSession(request);
  const [pilots, pipeline] = await Promise.all([
    listUserPilots(account.userId),
    listPilotPipeline(account.userId, project.id),
  ]);
  return ok(request, { pilots, ...pipeline });
}

export default withApi(
  (request) => request.method === "POST" ? createOrUpdate(request) : list(request),
  ["GET", "POST"],
);
