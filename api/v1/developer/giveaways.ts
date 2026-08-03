import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { createGiveaway, drawGiveaway, listGiveaways, winningGiveawayClaim } from "../../../server/giveaways/repository.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request); const owner = await developerProjectOwner(key.projectId); const origin = new URL(request.url).origin;
  if (request.method === "GET") { requireDeveloperPermission(key, "analytics:read"); return ok(request, await listGiveaways(owner.userId, key.projectId, origin)); }
  requireDeveloperPermission(key, "campaigns:write"); const raw = await request.text(); if (raw.length > 65_536) throw new ApiError(413, "BODY_TOO_LARGE", "Giveaway payloads are limited to 64 KB."); await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>; try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Giveaway payload must be valid JSON."); }
  const action = typeof body.action === "string" ? body.action : "create";
  if (action === "draw") return ok(request, await drawGiveaway(owner.userId, requiredString(body, "giveawayId", 100), origin));
  if (action === "winning-claim") return ok(request, await winningGiveawayClaim(owner.userId, requiredString(body, "giveawayId", 100), origin));
  const entryDeadline = new Date(requiredString(body, "entryDeadline", 100));
  return ok(request, await createGiveaway({ userId: owner.userId, displayName: owner.displayName ?? "Current project", projectId: key.projectId, refundAddress: owner.refundAddress, origin, title: requiredString(body, "title", 100), description: requiredString(body, "description", 1_000), amount: requiredString(body, "amount", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, entryDeadline, maxEntries: Number(body.maxEntries ?? 1_000) }), 201);
}, ["GET", "POST"]);
