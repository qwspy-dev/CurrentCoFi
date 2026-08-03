import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { confirmWalletTransferChallenge, createWalletTransferChallenge } from "../../../server/accounts/transfers.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const body = await readJsonObject(request);
  const data = typeof body.challengeId === "string"
    ? await confirmWalletTransferChallenge(request, session, {
        userId: account.userId,
        transferId: requiredString(body, "transferId", 100),
        challengeId: body.challengeId,
      })
    : await createWalletTransferChallenge(request, session, {
        userId: account.userId,
        tokenAddress: requiredString(body, "tokenAddress", 100),
        destination: requiredString(body, "destination", 100),
        amount: requiredString(body, "amount", 100),
        note: typeof body.note === "string" ? body.note : undefined,
      });
  return ok(request, data);
}, ["POST"]);
