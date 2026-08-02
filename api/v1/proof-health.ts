import { ok, withApi } from "../../server/http.js";
import { getProofHealth } from "../../server/proofs/health.js";

export default withApi(async (request) => ok(request, await getProofHealth(), 200, {
  "cache-control": "public, max-age=30, stale-while-revalidate=120",
}), ["GET"]);
