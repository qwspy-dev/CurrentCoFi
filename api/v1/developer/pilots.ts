import {
  authenticateDeveloperKey,
  requireDeveloperPermission,
  verifySignedDeveloperRequest,
} from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
import {
  createPilot,
  listProjectPilots,
  updatePilot,
} from "../../../server/pilots/operations.js";

async function mutate(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 32_768) {
    throw new ApiError(413, "BODY_TOO_LARGE", "Pilot payloads are limited to 32 KB.");
  }
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "pilots:write");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: unknown;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The pilot payload must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "The pilot payload must be an object.");
  }
  const value = body as Record<string, unknown>;
  if (value.action === "update" && typeof value.pilotId === "string") {
    return ok(request, await updatePilot({
      projectId: key.projectId,
      actorKeyId: key.id,
      pilotId: value.pilotId,
      body: value,
    }));
  }
  return ok(request, await createPilot({
    projectId: key.projectId,
    actorKeyId: key.id,
    body: value,
  }), 201);
}

async function list(request: Request) {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "analytics:read");
  return ok(request, { pilots: await listProjectPilots(key.projectId) });
}

export default withApi(
  (request) => request.method === "POST" ? mutate(request) : list(request),
  ["GET", "POST"],
);
