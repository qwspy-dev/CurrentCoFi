import { developerSession } from "../../server/developer/session.js";
import { integrationReadiness } from "../../server/developer/integration-readiness.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => { const { project } = await developerSession(request); return ok(request, await integrationReadiness(project.id)); }, ["GET"]);
