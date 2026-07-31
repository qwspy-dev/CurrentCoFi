import { getCircleUser, listUserWallets } from "../../../server/circle/client.js";
import { persistSessionAccount } from "../../../server/accounts/repository.js";
import {
  clearSessionCookie,
  publicSession,
  sealSession,
  sessionCookie,
  sessionFromRequest,
  type CurrentSession,
} from "../../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

async function create(request: Request) {
  const body = await readJsonObject(request);
  const userToken = requiredString(body, "userToken", 10_000);
  const refreshToken = requiredString(body, "refreshToken", 10_000);
  const deviceId = requiredString(body, "deviceId", 200);
  const provider = requiredString(body, "provider", 20) as CurrentSession["provider"];
  if (!["google", "email", "apple", "facebook"].includes(provider)) {
    throw new ApiError(400, "INVALID_PROVIDER", "Unsupported identity provider.");
  }
  const circleUser = await getCircleUser(request, userToken);
  const wallets = await listUserWallets(request, userToken);
  const profile = body.profile && typeof body.profile === "object"
    ? body.profile as Record<string, unknown>
    : {};
  const session: CurrentSession = {
    version: 1,
    circleUserId: circleUser.id,
    userToken,
    refreshToken,
    deviceId,
    provider,
    displayName: typeof profile.displayName === "string" ? profile.displayName.slice(0, 100) : "Current user",
    email: typeof profile.email === "string" ? profile.email.slice(0, 320).toLowerCase() : undefined,
    wallets,
    issuedAt: Date.now(),
  };
  const account = await persistSessionAccount(session);
  session.accountId = account.userId;
  session.username = account.username;
  return ok(request, publicSession(session), 201, { "set-cookie": sessionCookie(await sealSession(session)) });
}

async function read(request: Request) {
  return ok(request, publicSession(await sessionFromRequest(request)));
}

async function remove(request: Request) {
  return ok(request, { authenticated: false }, 200, { "set-cookie": clearSessionCookie() });
}

export default withApi(
  (request) => request.method === "POST" ? create(request) : request.method === "DELETE" ? remove(request) : read(request),
  ["GET", "POST", "DELETE"],
);
