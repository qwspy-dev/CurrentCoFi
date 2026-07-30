type ApiMeta = {
  requestId: string;
  timestamp: string;
  version: "v1";
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function meta(request: Request): ApiMeta {
  return {
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    version: "v1",
  };
}

function response(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...Object.fromEntries(new Headers(extraHeaders)),
    },
  });
}

export function ok<T>(request: Request, data: T, status = 200, headers?: HeadersInit) {
  return response({ ok: true as const, data, meta: meta(request) }, status, headers);
}

export function fail(request: Request, error: ApiError) {
  return response(
    {
      ok: false as const,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      meta: meta(request),
    },
    error.status,
  );
}

export function withApi(
  handler: (request: Request) => Promise<Response> | Response,
  methods: string[] = ["GET"],
) {
  return {
    async fetch(request: Request) {
      if (!methods.includes(request.method)) {
        return fail(request, new ApiError(405, "METHOD_NOT_ALLOWED", "This method is not supported."));
      }
      try {
        return await handler(request);
      } catch (error) {
        if (error instanceof ApiError) return fail(request, error);
        console.error("Unhandled Current CoFi API error", error);
        return fail(request, new ApiError(500, "INTERNAL_ERROR", "The request could not be completed."));
      }
    },
  };
}

export async function readJsonObject(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_BODY", "The request body must be an object.");
  }
  return value as Record<string, unknown>;
}

export function requiredString(body: Record<string, unknown>, field: string, maxLength = 2_000) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, "INVALID_FIELD", `${field} is required and must be a valid string.`, { field });
  }
  return value.trim();
}
