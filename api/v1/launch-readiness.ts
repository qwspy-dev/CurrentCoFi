import { ok, withApi } from "../../server/http.js";
import { getLaunchReadinessSnapshot } from "../../server/releases/readiness.js";
export default withApi(async (request) => ok(request, await getLaunchReadinessSnapshot()), ["GET"]);
