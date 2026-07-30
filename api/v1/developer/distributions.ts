import { createDeveloperDistribution } from "../../../server/developer/distributions.js";
import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    throw new ApiError(413, "BODY_TOO_LARGE", "Distribution payloads are limited to 1 MB.");
  }
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "campaigns:write");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The distribution payload must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "The distribution payload must be an object.");
  }
  const origin = new URL(request.url).origin;
  const campaign = await createDeveloperDistribution(
    key.projectId,
    origin,
    body as Record<string, unknown>,
  );
  return ok(request, campaign, 201);
}, ["POST"]);
