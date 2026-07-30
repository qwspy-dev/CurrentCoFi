type JwtPayload = Record<string, unknown>;

function decodeSegment(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decode(token: string): JwtPayload | string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const value: unknown = JSON.parse(decodeSegment(payload));
    return typeof value === "object" && value !== null
      ? value as JwtPayload
      : typeof value === "string"
        ? value
        : null;
  } catch {
    return null;
  }
}
