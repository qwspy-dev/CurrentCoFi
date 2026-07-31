import { ok, withApi } from "../../server/http.js";
import { getServiceStatusSnapshot } from "../../server/observability/status.js";

export default withApi(async (request) => ok(request, await getServiceStatusSnapshot(), 200, { "cache-control": "public, max-age=15, stale-while-revalidate=45" }), ["GET"]);
