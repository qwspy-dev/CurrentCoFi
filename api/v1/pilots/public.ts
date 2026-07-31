import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";
import { attestPublicPilot, getPublicPilot } from "../../../server/pilots/operations.js";

function slug(request: Request) {
  const value = new URL(request.url).searchParams.get("slug");
  if (!value || !/^pilot_[A-Za-z0-9_-]{10,100}$/.test(value)) {
    throw new ApiError(400, "INVALID_PILOT_SLUG", "A valid pilot invitation is required.");
  }
  return value;
}

export default withApi(async (request) => {
  const publicSlug = slug(request);
  if (request.method === "GET") return ok(request, await getPublicPilot(publicSlug));
  const body = await readJsonObject(request);
  return ok(request, await attestPublicPilot(publicSlug, body), 201);
}, ["GET", "POST"]);
