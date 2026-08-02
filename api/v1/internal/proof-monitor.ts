import { getServerConfig } from "../../../server/config.js";
import { ApiError, ok, withApi } from "../../../server/http.js";
import { safeError, structuredLog } from "../../../server/observability/logger.js";
import { getProofHealth } from "../../../server/proofs/health.js";

export default withApi(async (request) => {
  const configuredSecret = process.env.CRON_SECRET ?? getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || supplied !== configuredSecret) throw new ApiError(401, "PROOF_MONITOR_UNAUTHORIZED", "A valid monitoring credential is required.");
  const proof = await getProofHealth();
  structuredLog(proof.status === "healthy" ? "info" : "warn", "proof-health.monitor.completed", {
    status: proof.status,
    score: proof.score,
    verifiedChecks: proof.verifiedChecks,
    totalChecks: proof.totalChecks,
    digest: proof.digest,
  });
  if (proof.status !== "healthy" && process.env.ERROR_WEBHOOK_URL) {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "current_cofi_proof_health_alert", proof }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      structuredLog("error", "proof-health.monitor.alert-failed", { error: safeError(error) });
    }
  }
  return ok(request, proof, proof.status === "unavailable" ? 503 : 200);
}, ["GET"]);
