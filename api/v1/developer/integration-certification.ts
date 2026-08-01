import { issueIntegrationCertificate } from "../../../server/developer/integration-certification.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "analytics:read");
  const rawBody = await request.text();
  await verifySignedDeveloperRequest(request, key, rawBody);
  const result = await issueIntegrationCertificate(key.projectId);
  const origin = new URL(request.url).origin;
  return ok(request, { ...result, publicUrl: `${origin}/?cert=${encodeURIComponent(result.token)}#/certification` }, 201);
}, ["POST"]);
