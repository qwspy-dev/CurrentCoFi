import { currentDiscoveryNetwork, recordDiscoveryInteraction } from "../../server/discovery/network.js";
import { ok, readJsonObject, withApi } from "../../server/http.js";

export default withApi(async request => {
  const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await currentDiscoveryNetwork(origin));
  const body = await readJsonObject(request);
  return ok(request, await recordDiscoveryInteraction({ resourceType: body.resourceType, resourceId: body.resourceId, visitorId: body.visitorId, eventType: body.eventType }, origin), 202);
}, ["GET", "POST"]);
