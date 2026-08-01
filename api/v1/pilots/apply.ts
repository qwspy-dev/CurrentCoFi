import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";
import {
  getPilotApplicationStatus,
  getPublicPilotInvitation,
  submitPilotApplication,
} from "../../../server/pilots/operations.js";

function inviteSlug(request: Request) {
  const value = new URL(request.url).searchParams.get("invite");
  if (!value || !/^invite_[A-Za-z0-9_-]{10,100}$/.test(value)) {
    throw new ApiError(400, "INVALID_PILOT_INVITATION", "A valid pilot invitation is required.");
  }
  return value;
}

export default withApi(async (request) => {
  if (request.method === "GET") return ok(request, await getPublicPilotInvitation(inviteSlug(request)));
  const body = await readJsonObject(request);
  if (body.action === "status" && typeof body.applicationSlug === "string" && typeof body.statusSecret === "string") {
    return ok(request, { application: await getPilotApplicationStatus(body.applicationSlug, body.statusSecret) });
  }
  return ok(request, await submitPilotApplication(inviteSlug(request), body), 201);
}, ["GET", "POST"]);
