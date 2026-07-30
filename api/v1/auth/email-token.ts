import { createEmailToken } from "../../../server/circle/client.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const body = await readJsonObject(request);
  const email = requiredString(body, "email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "Enter a valid email address.");
  }
  const data = await createEmailToken(request, requiredString(body, "deviceId", 200), email);
  return ok(request, data);
}, ["POST"]);
