import { authenticateDeveloperKey, requireDeveloperPermission } from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";
import { getServiceStatusSnapshot } from "../../../server/observability/status.js";

export default withApi(async (request) => {
  const credential = await authenticateDeveloperKey(request);
  requireDeveloperPermission(credential, "analytics:read");
  return ok(request, { projectId: credential.projectId, ...(await getServiceStatusSnapshot()) });
}, ["GET"]);
