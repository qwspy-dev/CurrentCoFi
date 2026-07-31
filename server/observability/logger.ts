export type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

export function structuredLog(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    level,
    message,
    service: "current-cofi-api",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export function safeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 8).join("\n") }
    : { message: String(error) };
}
