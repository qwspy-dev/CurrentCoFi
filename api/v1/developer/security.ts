import { ok, withApi } from "../../../server/http.js";
import { authenticateDeveloperKey, requireDeveloperPermission } from "../../../server/developer/keys.js";
import { getSecurityPosture } from "../../../server/security/posture.js";

export default withApi(async (request) => {
  const auth = await authenticateDeveloperKey(request);
  requireDeveloperPermission(auth, "analytics:read");
  return ok(request, { projectId: auth.projectId, ...getSecurityPosture() });
}, ["GET"]);
