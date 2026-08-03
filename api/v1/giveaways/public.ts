import { enterGiveaway, publicGiveaway, type GiveawayIdentityType } from "../../../server/giveaways/repository.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  if (request.method === "GET") { const slug = new URL(request.url).searchParams.get("slug"); if (!slug) throw new ApiError(400, "GIVEAWAY_REQUIRED", "A giveaway slug is required."); return ok(request, await publicGiveaway(slug, new URL(request.url).origin)); }
  const body = await readJsonObject(request); const identityType = String(body.identityType ?? "email");
  if (!["email", "wallet", "x", "game", "custom"].includes(identityType)) throw new ApiError(400, "INVALID_IDENTITY", "Choose a supported identity.");
  return ok(request, await enterGiveaway({ publicSlug: requiredString(body, "slug", 100), displayName: requiredString(body, "displayName", 80), identityType: identityType as GiveawayIdentityType, identity: requiredString(body, "identity", 320), referredByCode: typeof body.referredByCode === "string" ? body.referredByCode : undefined }), 201);
}, ["GET", "POST"]);
