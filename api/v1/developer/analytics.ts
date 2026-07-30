import { developerAnalytics } from "../../../server/developer/analytics.js";
import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
} from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "analytics:read");
  return ok(request, await developerAnalytics(key.projectId));
}, ["GET"]);
