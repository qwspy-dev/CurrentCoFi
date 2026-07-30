import { developerSession } from "../../../server/developer/session.js";
import {
  createWebhookEndpoint,
  deliverQueuedWebhooks,
  listWebhookState,
  queueWebhookEvent,
  setWebhookEndpointEnabled,
} from "../../../server/developer/webhooks.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const { project } = await developerSession(request);
  if (request.method === "GET") return ok(request, await listWebhookState(project.id));
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";
  if (action === "set_enabled") {
    if (typeof body.endpointId !== "string" || typeof body.enabled !== "boolean") {
      throw new ApiError(400, "INVALID_WEBHOOK_UPDATE", "endpointId and enabled are required.");
    }
    return ok(request, await setWebhookEndpointEnabled(project.id, body.endpointId, body.enabled));
  }
  if (action === "test") {
    await queueWebhookEvent(project.id, "integration.test", {
      message: "Current CoFi webhook signing and delivery are operational.",
    });
    return ok(request, await deliverQueuedWebhooks(10));
  }
  if (action === "retry") return ok(request, await deliverQueuedWebhooks(25));
  if (typeof body.url !== "string" || !Array.isArray(body.events)) {
    throw new ApiError(400, "INVALID_WEBHOOK", "url and events are required.");
  }
  return ok(request, await createWebhookEndpoint(project.id, body.url, body.events.map(String)), 201);
}, ["GET", "POST"]);
