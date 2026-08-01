import { ok, withApi } from "../../../server/http.js";
import { publicCheckout } from "../../../server/commerce/checkout.js";
export default withApi(async (request) => ok(request, await publicCheckout(new URL(request.url).searchParams.get("slug") ?? "")), ["GET"]);
