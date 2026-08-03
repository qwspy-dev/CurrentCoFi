import { persistSessionAccount } from "../../server/accounts/repository.js";
import { getAccountPortfolio } from "../../server/accounts/portfolio.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet to view the portfolio.");
  return ok(request, await getAccountPortfolio(account.userId, wallet.address));
});
