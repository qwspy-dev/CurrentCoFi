import { getGrantApplicationPacket } from "../../server/grants/application-packet.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => ok(request, await getGrantApplicationPacket(), 200, {
  "cache-control": "public, max-age=30, stale-while-revalidate=120",
}), ["GET"]);
