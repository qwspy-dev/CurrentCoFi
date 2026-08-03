import { ApiError, ok, withApi } from "../../../server/http.js";
import { publicCommunityTreasury } from "../../../server/treasury/repository.js";
export default withApi(async (request) => { const slug = new URL(request.url).searchParams.get("slug"); if (!slug) throw new ApiError(400, "TREASURY_REQUIRED", "A public treasury slug is required."); return ok(request, await publicCommunityTreasury(slug, new URL(request.url).origin)); }, ["GET"]);
