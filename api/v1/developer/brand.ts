import { readProjectBrand, updateProjectBrand } from "../../../server/branding/repository.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  if (request.method === "GET") {
    requireDeveloperPermission(key, "analytics:read");
    return ok(request, await readProjectBrand(key.projectId));
  }
  requireDeveloperPermission(key, "campaigns:write");
  const raw = await request.text();
  if (raw.length > 32_768) throw new ApiError(413, "BODY_TOO_LARGE", "Brand payloads are limited to 32 KB.");
  await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Brand settings must be valid JSON."); }
  return ok(request, await updateProjectBrand(key.projectId, body));
}, ["GET", "POST"]);
