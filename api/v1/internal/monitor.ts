import { getServerConfig } from "../../../server/config.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
import { safeError, structuredLog } from "../../../server/observability/logger.js";
import { getServiceStatusSnapshot } from "../../../server/observability/status.js";

export default withApi(async (request) => {
  const configuredSecret = process.env.CRON_SECRET ?? getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || supplied !== configuredSecret) throw new ApiError(401, "MONITOR_UNAUTHORIZED", "A valid monitoring credential is required.");
  const snapshot = await getServiceStatusSnapshot();
  if (snapshot.status !== "operational" && process.env.ERROR_WEBHOOK_URL) {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "current_cofi_health_alert", snapshot }), signal: AbortSignal.timeout(5_000) });
    } catch (error) {
      structuredLog("error", "monitor.alert.failed", { error: safeError(error) });
    }
  }
  return ok(request, snapshot, snapshot.status === "major_outage" ? 503 : 200);
}, ["GET"]);
