import { publicCheckoutQuote } from "../../../server/commerce/checkout.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const query = new URL(request.url).searchParams;
  return ok(request, await publicCheckoutQuote(query.get("slug") ?? "", query.get("tokenAddress") ?? ""));
}, ["GET"]);
