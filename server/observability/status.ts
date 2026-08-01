import { getPublicConfig, getReadiness, getServerConfig } from "../config.js";
import { pingDatabase } from "../db/client.js";
import { getLaunchReadinessSnapshot } from "../releases/readiness.js";
import { listPublicIncidents } from "./incidents.js";
import { safeError, structuredLog } from "./logger.js";

export type ComponentStatus = "operational" | "degraded" | "outage";
export type ServiceComponent = {
  id: string;
  name: string;
  status: ComponentStatus;
  latencyMs: number | null;
  message: string;
};

export function deriveOverallStatus(components: ServiceComponent[], activeIncidents: Array<{ severity: string }>) {
  if (components.some((component) => component.status === "outage") || activeIncidents.some((incident) => incident.severity === "critical")) return "major_outage" as const;
  if (components.some((component) => component.status === "degraded") || activeIncidents.length) return "degraded" as const;
  return "operational" as const;
}

export function healthScore(components: ServiceComponent[]) {
  if (!components.length) return 0;
  const points = components.reduce((total, component) => total + (component.status === "operational" ? 100 : component.status === "degraded" ? 50 : 0), 0);
  return Math.round(points / components.length);
}

async function arcCheck(): Promise<ServiceComponent> {
  const startedAt = Date.now();
  try {
    const response = await fetch(getServerConfig().ARC_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(4_000),
    });
    const payload = await response.json() as { result?: string };
    const latencyMs = Date.now() - startedAt;
    const expected = getPublicConfig().chain.chainId;
    const actual = payload.result ? Number.parseInt(payload.result, 16) : null;
    const healthy = response.ok && actual === expected;
    return { id: "arc-rpc", name: "Arc testnet RPC", status: healthy ? latencyMs > 1_500 ? "degraded" : "operational" : "outage", latencyMs, message: healthy ? `Connected to chain ${actual}.` : "The Arc RPC did not return the expected network." };
  } catch (error) {
    structuredLog("error", "status.arc-rpc.unavailable", { error: safeError(error) });
    return { id: "arc-rpc", name: "Arc testnet RPC", status: "outage", latencyMs: Date.now() - startedAt, message: "The Arc RPC health check is unavailable." };
  }
}

async function databaseCheck(): Promise<ServiceComponent> {
  const startedAt = Date.now();
  if (!getServerConfig().DATABASE_URL) return { id: "database", name: "Persistent data", status: "outage", latencyMs: 0, message: "Database is not configured." };
  try {
    const result = await pingDatabase();
    const latencyMs = "latencyMs" in result ? result.latencyMs ?? Date.now() - startedAt : Date.now() - startedAt;
    return { id: "database", name: "Persistent data", status: latencyMs > 800 ? "degraded" : "operational", latencyMs, message: "Account and campaign records are reachable." };
  } catch (error) {
    structuredLog("error", "status.database.unavailable", { error: safeError(error) });
    return { id: "database", name: "Persistent data", status: "outage", latencyMs: Date.now() - startedAt, message: "The persistent data health check is unavailable." };
  }
}

async function releaseCheck(): Promise<ServiceComponent> {
  const startedAt = Date.now();
  try {
    const release = await getLaunchReadinessSnapshot();
    const healthy = release.configured && release.readinessScore === 100 && release.release?.active;
    return { id: "protocol-release", name: "Protocol contracts", status: healthy ? "operational" : "outage", latencyMs: Date.now() - startedAt, message: healthy ? `${release.components.length}/${release.components.length} registered contracts match runtime bytecode.` : "The active release manifest failed one or more checks." };
  } catch (error) {
    structuredLog("error", "status.protocol-release.unavailable", { error: safeError(error) });
    return { id: "protocol-release", name: "Protocol contracts", status: "outage", latencyMs: Date.now() - startedAt, message: "The release verification check is unavailable." };
  }
}

function configurationComponents(): ServiceComponent[] {
  const readiness = getReadiness();
  return [
    { id: "circle-wallets", name: "Embedded wallets", status: readiness.circle ? "operational" : "outage", latencyMs: null, message: readiness.circle ? "Circle wallet credentials are configured." : "Circle wallet credentials are incomplete." },
    { id: "claim-settlement", name: "Claim settlement", status: readiness.arcSettlement ? "operational" : "outage", latencyMs: null, message: readiness.arcSettlement ? "Sponsored claim authorization and settlement are configured." : "Claim settlement configuration is incomplete." },
    { id: "crosschain-funding", name: "Crosschain funding", status: readiness.crosschainFunding && readiness.gatewayFunding ? "operational" : "degraded", latencyMs: null, message: readiness.crosschainFunding && readiness.gatewayFunding ? "CCTP and Gateway funding paths are configured." : "One or more crosschain funding paths are unavailable." },
    { id: "developer-platform", name: "Developer platform", status: readiness.internalAuth && readiness.claimSigning ? "operational" : "degraded", latencyMs: null, message: readiness.internalAuth && readiness.claimSigning ? "Scoped keys, signatures, and webhooks are configured." : "Developer security configuration is incomplete." },
  ];
}

export async function getServiceStatusSnapshot() {
  const startedAt = Date.now();
  const [arc, database, release, incidentsResult] = await Promise.all([
    arcCheck(), databaseCheck(), releaseCheck(), listPublicIncidents(30).catch((error) => {
      structuredLog("error", "status.incidents.unavailable", { error: safeError(error) });
      return [];
    }),
  ]);
  const components = [arc, database, release, ...configurationComponents()];
  const activeIncidents = incidentsResult.filter((incident) => incident.status !== "resolved");
  const overallStatus = deriveOverallStatus(components, activeIncidents);
  const snapshot = {
    service: "Current CoFi",
    environment: getPublicConfig().environment,
    network: getPublicConfig().chain.network,
    status: overallStatus,
    score: healthScore(components),
    generatedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    components,
    activeIncidents,
    incidentHistory: incidentsResult.filter((incident) => incident.status === "resolved").slice(0, 10),
    objectives: {
      availability: "99.9%",
      apiLatencyP95Ms: 800,
      rpcLatencyP95Ms: 1_500,
      recoveryTimeMinutes: 30,
      onchainRecoveryPoint: "zero confirmed transactions",
    },
  };
  structuredLog(overallStatus === "operational" ? "info" : "warn", "status.snapshot.completed", {
    status: overallStatus,
    score: snapshot.score,
    durationMs: snapshot.responseTimeMs,
    activeIncidentCount: activeIncidents.length,
    componentStates: Object.fromEntries(components.map((component) => [component.id, component.status])),
  });
  return snapshot;
}
