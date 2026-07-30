import type { ApiResponse, HealthData } from "./types";

export class CurrentApiClient {
  constructor(private readonly baseUrl = "/api/v1") {}

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { accept: "application/json", ...init?.headers },
    });
    const payload = await response.json() as ApiResponse<T>;
    if (!payload.ok) throw new Error(payload.error.message);
    return payload.data;
  }

  post<T>(path: string, body?: unknown) {
    return this.get<T>(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T>(path: string) {
    return this.get<T>(path, { method: "DELETE" });
  }

  health() {
    return this.get<HealthData>("/health");
  }
}

export const currentApi = new CurrentApiClient();
