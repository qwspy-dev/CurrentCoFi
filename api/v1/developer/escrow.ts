import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { createEscrowAgreement, listProjectEscrowAgreements, type EscrowMilestoneInput } from "../../../server/escrow/service.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  if (request.method === "GET") {
    requireDeveloperPermission(key, "analytics:read");
    return ok(request, await listProjectEscrowAgreements(key.projectId));
  }
  requireDeveloperPermission(key, "campaigns:write");
  const rawBody = await request.text();
  if (rawBody.length > 65_536) throw new ApiError(413, "BODY_TOO_LARGE", "Escrow payloads are limited to 64 KB.");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody || "{}"); }
  catch { throw new ApiError(400, "INVALID_JSON", "The escrow payload must be valid JSON."); }
  if (!Array.isArray(body.milestones)) throw new ApiError(400, "INVALID_MILESTONES", "milestones must be an array.");
  const milestones = body.milestones.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "INVALID_MILESTONE", `Milestone ${index + 1} is invalid.`);
    const item = value as Record<string, unknown>;
    return { title: requiredString(item, "title", 100), amount: requiredString(item, "amount", 50), dueAt: requiredString(item, "dueAt", 100) } satisfies EscrowMilestoneInput;
  });
  return ok(request, await createEscrowAgreement({
    projectId: key.projectId, actorKeyId: key.id,
    clientAddress: requiredString(body, "clientAddress", 100),
    name: requiredString(body, "name", 100),
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    providerAddress: requiredString(body, "providerAddress", 100),
    arbitratorAddress: requiredString(body, "arbitratorAddress", 100),
    milestones,
  }), 201);
}, ["GET", "POST"]);
