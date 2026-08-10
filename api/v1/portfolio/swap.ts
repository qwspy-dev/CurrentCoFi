import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { confirmConsumerSwapChallenge, createConsumerSwapChallenge, quoteConsumerSwap } from "../../../server/accounts/swaps.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const action = requiredString(body, "action", 40);
  if (!["quote", "create", "confirm"].includes(action)) throw new ApiError(400, "INVALID_SWAP_ACTION", "Choose quote, create, or confirm.");
  const data = action === "quote"
    ? await quoteConsumerSwap({
        tokenAddress: requiredString(body, "tokenAddress", 100),
        usdcOut: requiredString(body, "usdcOut", 100),
      })
    : action === "confirm"
      ? await confirmConsumerSwapChallenge(request, session, {
          userId: account.userId,
          swapId: requiredString(body, "swapId", 100),
          challengeId: requiredString(body, "challengeId", 200),
        })
      : await createConsumerSwapChallenge(request, session, {
          userId: account.userId,
          tokenAddress: requiredString(body, "tokenAddress", 100),
          usdcOut: requiredString(body, "usdcOut", 100),
          expectedAmountInAtomic: requiredString(body, "expectedAmountInAtomic", 100),
        });
  return ok(request, data);
}, ["POST"]);
