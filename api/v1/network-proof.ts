import { ok, withApi } from "../../server/http.js";
import { getNetworkProof } from "../../server/network/proof.js";

export default withApi(async (request) => ok(request, await getNetworkProof(), 200, {
  "cache-control": "public, max-age=30, stale-while-revalidate=120",
}), ["GET"]);
