import { getServerConfig } from "../config.js";
import { ApiError } from "../http.js";
import type { CircleWallet } from "../circle/client.js";

export const SESSION_COOKIE = "current_session";

export type CurrentSession = {
  version: 1;
  circleUserId: string;
  userToken: string;
  refreshToken: string;
  deviceId: string;
  provider: "google" | "email" | "apple" | "facebook";
  displayName: string;
  email?: string;
  wallets: CircleWallet[];
  accountId?: string;
  username?: string;
  issuedAt: number;
};

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function key() {
  const secret = getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  if (!secret) throw new ApiError(503, "SESSION_NOT_CONFIGURED", "Secure account sessions are not configured yet.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSession(session: CurrentSession) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function openSession(value: string) {
  try {
    const [ivValue, encryptedValue] = value.split(".");
    if (!ivValue || !encryptedValue) throw new Error("Malformed session");
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivValue) },
      await key(),
      fromBase64Url(encryptedValue),
    );
    const session = JSON.parse(new TextDecoder().decode(decrypted)) as CurrentSession;
    if (session.version !== 1 || Date.now() - session.issuedAt > 30 * 24 * 60 * 60 * 1_000) {
      throw new Error("Expired session");
    }
    return session;
  } catch {
    throw new ApiError(401, "INVALID_SESSION", "Your Current CoFi session has expired.");
  }
}

export function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function sessionFromRequest(request: Request) {
  const value = readCookie(request, SESSION_COOKIE);
  if (!value) throw new ApiError(401, "NOT_AUTHENTICATED", "Sign in to continue.");
  return openSession(value);
}

export function sessionCookie(value: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function publicSession(session: CurrentSession) {
  return {
    authenticated: true,
    circleUserId: session.circleUserId,
    provider: session.provider,
    displayName: session.displayName,
    email: session.email,
    wallets: session.wallets,
    accountId: session.accountId,
    username: session.username,
  };
}
