import { applyResendWebhook } from "../../../server/campaigns/email-delivery.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => ok(request, await applyResendWebhook(await request.text(), request.headers)), ["POST"]);
