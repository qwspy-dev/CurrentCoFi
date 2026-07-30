import { createDeviceToken } from "../../../server/circle/client.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const body = await readJsonObject(request);
  const data = await createDeviceToken(request, requiredString(body, "deviceId", 200));
  return ok(request, data);
}, ["POST"]);
