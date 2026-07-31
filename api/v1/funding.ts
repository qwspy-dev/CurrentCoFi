import { persistSessionAccount } from "../../server/accounts/repository.js";
import {
  sealSession,
  sessionCookie,
  sessionFromRequest,
} from "../../server/auth/session.js";
import {
  createFundingIntent,
  crosschainCatalog,
  listFundingIntents,
  prepareBridgeChallenge,
  prepareSourceWallet,
  syncFundingIntent,
} from "../../server/crosschain/service.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  return ok(request, {
    catalog: crosschainCatalog(),
    intents: await listFundingIntents(account.userId),
  });
}

async function write(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  session.accountId = account.userId;
  const body = await readJsonObject(request);
  const action = requiredString(body, "action", 40);
  if (action === "create") {
    return ok(request, await createFundingIntent(
      account.userId,
      session,
      requiredString(body, "distributionId", 100),
      requiredString(body, "sourceChain", 40),
      requiredString(body, "idempotencyKey", 200),
    ), 201);
  }
  const intentId = requiredString(body, "intentId", 100);
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : undefined;
  if (action === "wallet") {
    const data = await prepareSourceWallet(request, session, intentId, challengeId);
    if (data.complete && data.wallets) {
      session.wallets = data.wallets;
      await persistSessionAccount(session);
      return ok(request, data, 200, { "set-cookie": sessionCookie(await sealSession(session)) });
    }
    return ok(request, data);
  }
  if (action === "approve" || action === "burn") {
    return ok(request, await prepareBridgeChallenge(request, session, intentId, action, challengeId));
  }
  if (action === "sync") {
    return ok(request, await syncFundingIntent(account.userId, intentId));
  }
  throw new ApiError(400, "INVALID_FUNDING_ACTION", "Unsupported crosschain funding action.");
}

export default withApi(
  (request) => request.method === "POST" ? write(request) : read(request),
  ["GET", "POST"],
);
