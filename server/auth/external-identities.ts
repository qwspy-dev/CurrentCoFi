import { linkExternalIdentity, type ExternalIdentityProvider } from "../accounts/repository.js";
import { getServerConfig } from "../config.js";
import { ApiError } from "../http.js";
import { constantTimeEqual, openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";
import type { CurrentSession } from "./session.js";

type OAuthState = {
  version: 1;
  provider: "x" | "discord";
  userId: string;
  verifier: string;
  issuedAt: number;
};

type OAuthProfile = {
  subject: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

function origin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function redirectUri(request: Request, provider: OAuthState["provider"]) {
  return `${origin(request)}/api/v1/auth/identities/callback?provider=${provider}`;
}

function credentials(provider: OAuthState["provider"]) {
  const config = getServerConfig();
  if (provider === "x" && config.X_OAUTH_CLIENT_ID && config.X_OAUTH_CLIENT_SECRET) {
    return { clientId: config.X_OAUTH_CLIENT_ID, clientSecret: config.X_OAUTH_CLIENT_SECRET };
  }
  if (provider === "discord" && config.DISCORD_OAUTH_CLIENT_ID && config.DISCORD_OAUTH_CLIENT_SECRET) {
    return { clientId: config.DISCORD_OAUTH_CLIENT_ID, clientSecret: config.DISCORD_OAUTH_CLIENT_SECRET };
  }
  throw new ApiError(503, "IDENTITY_PROVIDER_NOT_CONFIGURED", `${provider === "x" ? "X" : "Discord"} linking is waiting for its provider credentials.`);
}

export function externalIdentityAvailability() {
  const config = getServerConfig();
  return {
    x: Boolean(config.X_OAUTH_CLIENT_ID && config.X_OAUTH_CLIENT_SECRET),
    discord: Boolean(config.DISCORD_OAUTH_CLIENT_ID && config.DISCORD_OAUTH_CLIENT_SECRET),
    telegram: Boolean(config.TELEGRAM_BOT_USERNAME && config.TELEGRAM_BOT_TOKEN),
  };
}

export async function createExternalAuthorization(
  request: Request,
  session: CurrentSession,
  provider: string,
) {
  if (provider !== "x" && provider !== "discord") {
    throw new ApiError(400, "INVALID_IDENTITY_PROVIDER", "Choose X or Discord for OAuth identity linking.");
  }
  if (!session.accountId) throw new ApiError(409, "ACCOUNT_NOT_PERSISTED", "Finish creating your Current account before linking a social identity.");
  const { clientId } = credentials(provider);
  const verifier = randomSecret(48);
  const challenge = await sha256(verifier);
  const state = await sealSecret(JSON.stringify({
    version: 1,
    provider,
    userId: session.accountId,
    verifier,
    issuedAt: Date.now(),
  } satisfies OAuthState));
  const authorize = provider === "x"
    ? new URL("https://x.com/i/oauth2/authorize")
    : new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri(request, provider));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", provider === "x" ? "users.read tweet.read" : "identify");
  if (provider === "x") {
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "S256");
  }
  return authorize.toString();
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw new ApiError(502, "IDENTITY_PROVIDER_FAILED", "The identity provider could not complete the verification.");
  return payload;
}

async function exchangeCode(request: Request, state: OAuthState, code: string): Promise<OAuthProfile> {
  const { clientId, clientSecret } = credentials(state.provider);
  const tokenUrl = state.provider === "x" ? "https://api.x.com/2/oauth2/token" : "https://discord.com/api/oauth2/token";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(request, state.provider),
    client_id: clientId,
  });
  if (state.provider === "x") body.set("code_verifier", state.verifier);
  if (state.provider === "discord") body.set("client_secret", clientSecret);
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(state.provider === "x" ? { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` } : {}),
    },
    body,
  });
  const token = await readJson(tokenResponse);
  if (typeof token.access_token !== "string") throw new ApiError(502, "IDENTITY_PROVIDER_FAILED", "The identity provider did not return an access token.");
  const userResponse = await fetch(
    state.provider === "x"
      ? "https://api.x.com/2/users/me?user.fields=name,username,profile_image_url"
      : "https://discord.com/api/users/@me",
    { headers: { authorization: `Bearer ${token.access_token}` } },
  );
  const user = await readJson(userResponse);
  const profile = state.provider === "x" && user.data && typeof user.data === "object"
    ? user.data as Record<string, unknown>
    : user;
  if (typeof profile.id !== "string") throw new ApiError(502, "IDENTITY_PROVIDER_FAILED", "The identity provider did not return a stable account identifier.");
  const discordAvatar = state.provider === "discord" && typeof profile.avatar === "string"
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    : undefined;
  return {
    subject: profile.id,
    username: typeof profile.username === "string" ? profile.username : undefined,
    displayName: typeof profile.name === "string"
      ? profile.name
      : typeof profile.global_name === "string"
        ? profile.global_name
        : undefined,
    avatarUrl: typeof profile.profile_image_url === "string" ? profile.profile_image_url : discordAvatar,
  };
}

export async function completeExternalAuthorization(
  request: Request,
  session: CurrentSession,
  provider: string,
  stateValue: string,
  code: string,
) {
  let state: OAuthState;
  try {
    state = JSON.parse(await openSecret(stateValue)) as OAuthState;
  } catch {
    throw new ApiError(400, "INVALID_OAUTH_STATE", "This social connection request is invalid or expired.");
  }
  if (
    state.version !== 1 ||
    (state.provider !== "x" && state.provider !== "discord") ||
    state.provider !== provider ||
    state.userId !== session.accountId ||
    Date.now() - state.issuedAt > 10 * 60 * 1_000
  ) {
    throw new ApiError(400, "INVALID_OAUTH_STATE", "This social connection request is invalid or expired.");
  }
  const profile = await exchangeCode(request, state, code);
  await linkExternalIdentity(state.userId, state.provider, profile.subject, profile);
  return state.provider;
}

export async function verifyTelegramIdentity(
  session: CurrentSession,
  payload: Record<string, unknown>,
) {
  const config = getServerConfig();
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_BOT_USERNAME) {
    throw new ApiError(503, "IDENTITY_PROVIDER_NOT_CONFIGURED", "Telegram linking is waiting for its bot credentials.");
  }
  if (!session.accountId) throw new ApiError(409, "ACCOUNT_NOT_PERSISTED", "Finish creating your Current account before linking Telegram.");
  const hash = typeof payload.hash === "string" ? payload.hash : "";
  const authDate = Number(payload.auth_date);
  const id = typeof payload.id === "number" || typeof payload.id === "string" ? String(payload.id) : "";
  if (!hash || !id || !Number.isFinite(authDate) || Math.abs(Date.now() / 1_000 - authDate) > 600) {
    throw new ApiError(400, "INVALID_TELEGRAM_IDENTITY", "The Telegram login response is invalid or expired.");
  }
  const fields = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && ["string", "number"].includes(typeof value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(config.TELEGRAM_BOT_TOKEN)));
  const hmacKey = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Buffer.from(await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(fields))).toString("hex");
  if (!constantTimeEqual(signature, hash)) {
    throw new ApiError(401, "INVALID_TELEGRAM_IDENTITY", "Telegram could not verify this identity.");
  }
  await linkExternalIdentity(session.accountId, "telegram", id, {
    username: typeof payload.username === "string" ? payload.username : undefined,
    displayName: [payload.first_name, payload.last_name].filter((value) => typeof value === "string").join(" ") || undefined,
    avatarUrl: typeof payload.photo_url === "string" ? payload.photo_url : undefined,
  });
  return "telegram" satisfies ExternalIdentityProvider;
}
