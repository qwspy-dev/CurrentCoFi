import { integrationManifest } from "../../server/developer/integration-readiness.js";
import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, integrationManifest(), 200, { "cache-control": "public, max-age=300, stale-while-revalidate=3600" }), ["GET"]);
