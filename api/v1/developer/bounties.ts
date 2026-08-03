import { createBounty, listBounties, reviewBounty, winningClaim } from "../../../server/bounties/repository.js";
import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  const owner = await developerProjectOwner(key.projectId);
  const origin = new URL(request.url).origin;
  if (request.method === "GET") {
    requireDeveloperPermission(key, "analytics:read");
    return ok(request, await listBounties(owner.userId, key.projectId, origin));
  }
  requireDeveloperPermission(key, "campaigns:write");
  const rawBody = await request.text();
  if (rawBody.length > 65_536) throw new ApiError(413, "BODY_TOO_LARGE", "Bounty payloads are limited to 64 KB.");
  await verifySignedDeveloperRequest(request, key, rawBody);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The bounty payload must be valid JSON."); }
  const action = typeof body.action === "string" ? body.action : "create";
  if (["shortlist", "reject", "award"].includes(action)) {
    return ok(request, await reviewBounty({ userId: owner.userId, bountyId: requiredString(body, "bountyId", 100), submissionId: requiredString(body, "submissionId", 100), action: action as "shortlist" | "reject" | "award", origin }));
  }
  if (action === "winning-claim") return ok(request, await winningClaim(owner.userId, requiredString(body, "bountyId", 100), origin));
  const deadline = new Date(requiredString(body, "submissionDeadline", 100));
  if (Number.isNaN(deadline.getTime())) throw new ApiError(400, "INVALID_DEADLINE", "submissionDeadline must be a valid ISO date.");
  return ok(request, await createBounty({
    userId: owner.userId,
    displayName: owner.displayName ?? "Current project",
    projectId: key.projectId,
    refundAddress: owner.refundAddress,
    origin,
    title: requiredString(body, "title", 100),
    summary: requiredString(body, "summary", 2_000),
    category: requiredString(body, "category", 50),
    amount: requiredString(body, "amount", 50),
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    submissionDeadline: deadline,
  }), 201);
}, ["GET", "POST"]);
