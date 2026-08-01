import { ok, withApi } from "../../server/http.js";
import { getSecurityPosture } from "../../server/security/posture.js";

export default withApi((request) => ok(request, getSecurityPosture()), ["GET"]);
