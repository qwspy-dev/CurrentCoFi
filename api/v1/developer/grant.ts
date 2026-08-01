import { createDeveloperGrantReview, listDeveloperGrantReviews } from "../../../server/grants/review.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

function optionalDistributionId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) throw new ApiError(400, "INVALID_CAMPAIGN", "distributionId must be a campaign UUID.");
  return value;
}

async function create(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 16_384) throw new ApiError(413, "BODY_TOO_LARGE", "Grant review payloads are limited to 16 KB.");
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "evidence:write");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The grant review payload must be valid JSON."); }
  return ok(request, await createDeveloperGrantReview({ projectId: key.projectId, distributionId: optionalDistributionId(body.distributionId), createdByKeyId: key.id }), 201);
}

async function list(request: Request) {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "analytics:read");
  return ok(request, { packages: await listDeveloperGrantReviews(key.projectId) });
}

export default withApi((request) => request.method === "POST" ? create(request) : list(request), ["GET", "POST"]);
