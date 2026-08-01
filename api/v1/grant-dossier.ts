import { getGrantDossier } from "../../server/grants/dossier.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => ok(request, await getGrantDossier(), 200, {
  "cache-control": "public, max-age=30, stale-while-revalidate=120",
}), ["GET"]);
