import { initializeArcWallet, listArcWallets } from "../../../server/circle/client.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const body = await readJsonObject(request);
  const userToken = requiredString(body, "userToken", 10_000);
  try {
    const data = await initializeArcWallet(request, userToken);
    return ok(request, { initialized: false, challengeId: data.challengeId, wallets: [] });
  } catch (error) {
    if (error instanceof ApiError && error.code === "CIRCLE_155106") {
      const wallets = await listArcWallets(request, userToken);
      return ok(request, { initialized: true, challengeId: null, wallets });
    }
    throw error;
  }
}, ["POST"]);
