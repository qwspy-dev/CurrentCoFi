import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { createPublicDrop, listPublicDrops } from "../../../server/drops/repository.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request); const owner = await developerProjectOwner(key.projectId); const origin = new URL(request.url).origin;
  if (request.method === "GET") { requireDeveloperPermission(key, "analytics:read"); return ok(request, await listPublicDrops(owner.userId, key.projectId, origin)); }
  requireDeveloperPermission(key, "campaigns:write"); const raw = await request.text(); if (raw.length > 65_536) throw new ApiError(413, "BODY_TOO_LARGE", "Public-drop payloads are limited to 64 KB."); await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>; try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Public-drop payload must be valid JSON."); }
  return ok(request, await createPublicDrop({ userId: owner.userId, displayName: owner.displayName ?? "Current project", projectId: key.projectId, refundAddress: owner.refundAddress, origin, title: requiredString(body, "title", 100), description: requiredString(body, "description", 1_000), claimAmount: requiredString(body, "claimAmount", 60), maxClaims: Number(body.maxClaims ?? 100), expiresInHours: Number(body.expiresInHours ?? 168), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, claimCondition: body.claimCondition }), 201);
}, ["GET", "POST"]);
