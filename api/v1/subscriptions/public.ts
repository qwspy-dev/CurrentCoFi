import { publicSubscriptionPlan } from "../../../server/commerce/subscriptions.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
export default withApi(async (request) => { const slug=new URL(request.url).searchParams.get("slug"); if(!slug)throw new ApiError(400,"SLUG_REQUIRED","A subscription plan slug is required."); return ok(request,await publicSubscriptionPlan(slug)); }, ["GET"]);
