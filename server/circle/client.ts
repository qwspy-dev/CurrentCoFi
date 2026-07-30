import { getServerConfig } from "../config.js";
import { ApiError } from "../http.js";

const CIRCLE_BASE_URL = "https://api.circle.com";

type CircleEnvelope<T> = {
  data?: T;
  code?: number;
  message?: string;
  error?: string;
};

export type CircleWallet = {
  id: string;
  address: string;
  blockchain: string;
  state: string;
  accountType: "SCA" | "EOA";
  userId?: string;
  name?: string;
  refId?: string;
};

export function circleConfigured() {
  const config = getServerConfig();
  return Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID);
}

export async function circleRequest<T>(
  request: Request,
  path: string,
  options: { method?: string; body?: unknown; userToken?: string } = {},
) {
  const apiKey = getServerConfig().CIRCLE_API_KEY;
  if (!apiKey) {
    throw new ApiError(503, "CIRCLE_NOT_CONFIGURED", "Circle wallet services are not configured yet.");
  }
  const response = await fetch(`${CIRCLE_BASE_URL}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "x-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
      ...(options.userToken ? { "x-user-token": options.userToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as CircleEnvelope<T>;
  if (!response.ok || !payload.data) {
    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      `CIRCLE_${payload.code ?? response.status}`,
      payload.message ?? payload.error ?? "Circle could not complete the wallet request.",
    );
  }
  return payload.data;
}

export function createDeviceToken(request: Request, deviceId: string) {
  return circleRequest<{ deviceToken: string; deviceEncryptionKey: string }>(
    request,
    "/v1/w3s/users/social/token",
    { body: { idempotencyKey: crypto.randomUUID(), deviceId } },
  );
}

export function createEmailToken(request: Request, deviceId: string, email: string) {
  return circleRequest<{ deviceToken: string; deviceEncryptionKey: string; otpToken: string }>(
    request,
    "/v1/w3s/users/email/token",
    { body: { idempotencyKey: crypto.randomUUID(), deviceId, email } },
  );
}

export function initializeArcWallet(request: Request, userToken: string) {
  return circleRequest<{ challengeId: string }>(
    request,
    "/v1/w3s/user/initialize",
    {
      userToken,
      body: {
        idempotencyKey: crypto.randomUUID(),
        accountType: "SCA",
        blockchains: ["ARC-TESTNET"],
        metadata: [{ name: "Current CoFi", refId: "current-cofi-primary" }],
      },
    },
  );
}

export function getCircleUser(request: Request, userToken: string) {
  return circleRequest<{ id: string; status: string }>(request, "/v1/w3s/user", { userToken });
}

export async function listArcWallets(request: Request, userToken: string) {
  const data = await circleRequest<{ wallets: CircleWallet[] }>(
    request,
    "/v1/w3s/wallets?blockchain=ARC-TESTNET&pageSize=10",
    { userToken },
  );
  return data.wallets;
}

export function refreshCircleToken(
  request: Request,
  userToken: string,
  refreshToken: string,
  deviceId: string,
) {
  return circleRequest<{
    userToken: string;
    encryptionKey: string;
    refreshToken: string;
    userID: string;
  }>(
    request,
    "/v1/w3s/users/token/refresh",
    {
      userToken,
      body: { idempotencyKey: crypto.randomUUID(), refreshToken, deviceId },
    },
  );
}
