import { currentDiscoveryNetwork } from "../../server/discovery/network.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async request => ok(request, await currentDiscoveryNetwork(new URL(request.url).origin)), ["GET"]);
