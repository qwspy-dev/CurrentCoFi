import { listProjectAgentActions, proposeAgentCheckout, proposeAgentDistribution } from "../../../server/agents/runtime.js";
import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  if (request.method === "GET") {
    requireDeveloperPermission(key, "agent-actions:read");
    return ok(request, await listProjectAgentActions(key.projectId));
  }
  requireDeveloperPermission(key, "agent-actions:write");
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) throw new ApiError(413, "BODY_TOO_LARGE", "Agent action payloads are limited to 1 MB.");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { throw new ApiError(400, "INVALID_JSON", "The agent action must be valid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_BODY", "The agent action must be an object.");
  const action = (body as Record<string, unknown>).kind === "programmable_checkout"
    ? await proposeAgentCheckout(key, new URL(request.url).origin, body)
    : await proposeAgentDistribution(key, new URL(request.url).origin, body);
  return ok(request, action, 201);
}, ["GET", "POST"]);
