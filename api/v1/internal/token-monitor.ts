import { getServerConfig } from "../../../server/config.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
import { structuredLog } from "../../../server/observability/logger.js";
import { monitorDistributionTokens } from "../../../server/tokens/monitor.js";

export default withApi(async (request) => {
  const configuredSecret = process.env.CRON_SECRET ?? getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || supplied !== configuredSecret) {
    throw new ApiError(401, "TOKEN_MONITOR_UNAUTHORIZED", "A valid monitoring credential is required.");
  }
  const result = await monitorDistributionTokens();
  structuredLog(result.changed ? "warn" : "info", "token-trust.monitor.completed", result);
  return ok(request, result);
}, ["GET"]);
