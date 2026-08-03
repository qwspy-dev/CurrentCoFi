import { ApiError, ok, withApi } from "../../../server/http.js";
import { publicSocialPayment } from "../../../server/payments/social.js";

export default withApi(async (request) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) throw new ApiError(400, "PAYMENT_TOKEN_REQUIRED", "A payment token is required.");
  return ok(request, await publicSocialPayment(token));
}, ["GET"]);
