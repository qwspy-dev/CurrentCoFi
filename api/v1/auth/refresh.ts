import { refreshCircleToken, listUserWallets } from "../../../server/circle/client.js";
import { publicSession, sealSession, sessionCookie, sessionFromRequest } from "../../../server/auth/session.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const refreshed = await refreshCircleToken(
    request,
    session.userToken,
    session.refreshToken,
    session.deviceId,
  );
  session.userToken = refreshed.userToken;
  session.refreshToken = refreshed.refreshToken;
  session.wallets = await listUserWallets(request, refreshed.userToken);
  session.issuedAt = Date.now();
  return ok(
    request,
    {
      session: publicSession(session),
      walletAuth: { userToken: refreshed.userToken, encryptionKey: refreshed.encryptionKey },
    },
    200,
    { "set-cookie": sessionCookie(await sealSession(session)) },
  );
}, ["POST"]);
