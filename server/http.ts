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

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export function ok<T>(request: Request, data: T, status = 200) {
  return response({ ok: true as const, data, meta: meta(request) }, status);
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
