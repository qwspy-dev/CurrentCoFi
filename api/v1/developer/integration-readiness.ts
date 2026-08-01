import { integrationReadiness } from "../../../server/developer/integration-readiness.js";
import { authenticateDeveloperKey, requireDeveloperPermission } from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => { const key = await authenticateDeveloperKey(request); requireDeveloperPermission(key, "analytics:read"); return ok(request, await integrationReadiness(key.projectId)); }, ["GET"]);
