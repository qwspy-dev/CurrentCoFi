import { ingestActivationEvent } from "../../../server/developer/activations.js";
import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const rawBody = await request.text();
  if (rawBody.length > 64_000) throw new ApiError(413, "BODY_TOO_LARGE", "Activation payloads are limited to 64 KB.");
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "activations:write");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The activation payload must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "The activation payload must be an object.");
  }
  return ok(request, await ingestActivationEvent(key, body), 202);
}, ["POST"]);
