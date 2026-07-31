import { ok, withApi } from "../../server/http.js";
import { getVenueRegistrySnapshot } from "../../server/liquidity/venues.js";
export default withApi(async (request) => ok(request, await getVenueRegistrySnapshot()), ["GET"]);
