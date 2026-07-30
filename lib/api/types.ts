export type ApiMeta = { requestId: string; timestamp: string; version: "v1" };
export type ApiSuccess<T> = { ok: true; data: T; meta: ApiMeta };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthData = {
  status: "operational" | "degraded";
  service: string;
  version: string;
  network: string;
  services: {
    arc: { configured: boolean; reachable: boolean; chainId: number | null; latencyMs?: number };
    database: { configured: boolean; reachable: boolean; latencyMs?: number };
  };
  readiness: Record<string, boolean>;
};
