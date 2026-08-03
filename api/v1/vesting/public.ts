import { ApiError, ok, withApi } from "../../../server/http.js";
import { publicVestingProof, publicVestingSchedule } from "../../../server/vesting/repository.js";

export default withApi(async (request) => {
  const url = new URL(request.url); const origin = url.origin; const slug = url.searchParams.get("slug");
  if (slug) return ok(request, await publicVestingProof(slug, origin));
  const scheduleId = url.searchParams.get("schedule"); const access = url.searchParams.get("access");
  if (!scheduleId || !access) throw new ApiError(400, "VESTING_REQUIRED", "A vesting schedule and access token are required.");
  return ok(request, await publicVestingSchedule(scheduleId, access, origin));
}, ["GET"]);
