import { verifyIntegrationCertificate } from "../../../server/developer/integration-certification.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) throw new ApiError(400, "CERTIFICATE_REQUIRED", "An integration certificate is required.");
  return ok(request, await verifyIntegrationCertificate(token), 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" });
}, ["GET"]);
