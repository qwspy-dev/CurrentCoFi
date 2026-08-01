import { developerSession } from "../../server/developer/session.js";
import { issueIntegrationCertificate } from "../../server/developer/integration-certification.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const { project } = await developerSession(request);
  const result = await issueIntegrationCertificate(project.id);
  const origin = new URL(request.url).origin;
  return ok(request, { ...result, publicUrl: `${origin}/?cert=${encodeURIComponent(result.token)}#/certification` }, 201);
}, ["POST"]);
