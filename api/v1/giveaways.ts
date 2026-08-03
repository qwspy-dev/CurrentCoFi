import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { createGiveaway, drawGiveaway, listGiveaways, winningGiveawayClaim } from "../../server/giveaways/repository.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request); const account = await persistSessionAccount(session); const project = await getOrCreatePersonalProject(account.userId, session.displayName); const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listGiveaways(account.userId, project.id, origin));
  const body = await readJsonObject(request); const action = typeof body.action === "string" ? body.action : "create";
  if (action === "draw") return ok(request, await drawGiveaway(account.userId, requiredString(body, "giveawayId", 100), origin));
  if (action === "winning-claim") return ok(request, await winningGiveawayClaim(account.userId, requiredString(body, "giveawayId", 100), origin));
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET"); if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before publishing a giveaway.");
  const deadline = new Date(requiredString(body, "entryDeadline", 100));
  return ok(request, await createGiveaway({ userId: account.userId, displayName: session.displayName, projectId: project.id, refundAddress: wallet.address, origin, title: requiredString(body, "title", 100), description: requiredString(body, "description", 1_000), amount: requiredString(body, "amount", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, entryDeadline: deadline, maxEntries: Number(body.maxEntries ?? 1_000) }), 201);
}, ["GET", "POST"]);
