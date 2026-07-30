import { getPublicConfig, getReadiness, getServerConfig } from "../../server/config.js";
import { ok, withApi } from "../../server/http.js";

async function checkArcRpc() {
  const startedAt = Date.now();
  try {
    const response = await fetch(getServerConfig().ARC_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(4_000),
    });
    const payload = await response.json() as { result?: string };
    return {
      configured: true,
      reachable: response.ok,
      chainId: payload.result ? Number.parseInt(payload.result, 16) : null,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return { configured: true, reachable: false, chainId: null, latencyMs: Date.now() - startedAt };
  }
}

export default withApi(async (request) => {
  const arc = await checkArcRpc();
  const database = {
    configured: Boolean(getServerConfig().DATABASE_URL),
    reachable: false,
    state: getServerConfig().DATABASE_URL ? "check-deferred" : "not-provisioned",
  };
  const config = getPublicConfig();
  return ok(request, {
    status: arc.reachable ? "operational" : "degraded",
    service: "current-cofi-api",
    version: "v1",
    network: config.chain.network,
    services: { arc, database },
    readiness: getReadiness(),
  });
}, ["GET"]);
