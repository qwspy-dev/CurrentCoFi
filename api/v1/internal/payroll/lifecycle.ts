import { reconcilePayrollLifecycle } from "../../../../server/payroll/lifecycle.js";
import { getServerConfig } from "../../../../server/config.js";
import { ApiError, ok, withApi } from "../../../../server/http.js";

export default withApi(async (request) => {
  const configuredSecret = process.env.CRON_SECRET ?? getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || supplied !== configuredSecret) throw new ApiError(401, "PAYROLL_LIFECYCLE_UNAUTHORIZED", "A valid scheduled-job credential is required.");
  return ok(request, await reconcilePayrollLifecycle());
}, ["GET"]);
