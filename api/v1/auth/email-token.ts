import { createEmailToken } from "../../../server/circle/client.js";
import { getServerConfig } from "../../../server/config.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  if (!getServerConfig().CIRCLE_EMAIL_OTP_ENABLED) {
    throw new ApiError(503, "EMAIL_LOGIN_DISABLED", "Email login is not enabled for this environment.");
  }
  const body = await readJsonObject(request);
  const email = requiredString(body, "email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "Enter a valid email address.");
  }
  const data = await createEmailToken(request, requiredString(body, "deviceId", 200), email);
  return ok(request, data);
}, ["POST"]);
