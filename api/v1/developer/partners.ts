import { authenticateDeveloperKey, requireDeveloperPermission } from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";
import { getPartnerVaultSnapshot } from "../../../server/partners/vault.js";
export default withApi(async (request) => { const credential = await authenticateDeveloperKey(request); requireDeveloperPermission(credential, "analytics:read"); return ok(request, { projectId: credential.projectId, ...(await getPartnerVaultSnapshot()) }); }, ["GET"]);
