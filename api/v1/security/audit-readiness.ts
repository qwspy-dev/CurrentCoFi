import { ok, withApi } from "../../../server/http.js";
import { getAuditReadiness } from "../../../server/security/audit-readiness.js";

export default withApi((request) => ok(request, getAuditReadiness()), ["GET"]);
