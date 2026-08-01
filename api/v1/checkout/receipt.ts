import { publicReceipt } from "../../../server/commerce/checkout.js";
import { ok, withApi } from "../../../server/http.js";
export default withApi(async (request) => ok(request, await publicReceipt(new URL(request.url).searchParams.get("receipt") ?? "")), ["GET"]);
