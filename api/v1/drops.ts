import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { createPublicDrop, listPublicDrops } from "../../server/drops/repository.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listPublicDrops(account.userId, project.id, origin));
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before publishing a public drop.");
  const body = await readJsonObject(request);
  return ok(request, await createPublicDrop({
    userId: account.userId, displayName: session.displayName, projectId: project.id, refundAddress: wallet.address, origin,
    title: requiredString(body, "title", 100), description: requiredString(body, "description", 1_000), claimAmount: requiredString(body, "claimAmount", 60),
    maxClaims: Number(body.maxClaims ?? 100), expiresInHours: Number(body.expiresInHours ?? 168), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
  }), 201);
}, ["GET", "POST"]);
