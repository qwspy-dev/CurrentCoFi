import { createIdentityAttestation } from "../../../server/developer/identity-attestations.js";
import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const rawBody = await request.text();
  if (rawBody.length > 32_000) {
    throw new ApiError(413, "BODY_TOO_LARGE", "Identity attestation payloads are limited to 32 KB.");
  }
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "identities:write");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The identity attestation payload must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "The identity attestation payload must be an object.");
  }
  return ok(request, await createIdentityAttestation(key, body), 201);
}, ["POST"]);
