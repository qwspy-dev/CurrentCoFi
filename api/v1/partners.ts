import { ok, withApi } from "../../server/http.js";
import { getPartnerVaultSnapshot } from "../../server/partners/vault.js";
export default withApi(async (request) => ok(request, await getPartnerVaultSnapshot()), ["GET"]);
