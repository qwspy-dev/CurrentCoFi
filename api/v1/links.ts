import { persistSessionAccount, getOrCreatePersonalProject } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { createClaimLink, listClaimLinks } from "../../server/claims/links.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

function hours(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 168);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 24 * 30) {
    throw new ApiError(400, "INVALID_EXPIRATION", "Expiration must be between one hour and 30 days.");
  }
  return Math.round(parsed);
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before making a claim link.");
  const body = await readJsonObject(request);
  const amount = typeof body.amount === "string" ? body.amount : "";
  const message = typeof body.message === "string" ? body.message : undefined;
  const origin = new URL(request.url).origin;
  return ok(request, await createClaimLink({
    userId: account.userId,
    displayName: session.displayName,
    projectId: project.id,
    amount,
    message,
    expiresInHours: hours(body.expiresInHours),
    refundAddress: wallet.address,
    origin,
  }), 201);
}

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  return ok(request, { links: await listClaimLinks(account.userId) });
}

export default withApi(
  (request) => request.method === "POST" ? create(request) : read(request),
  ["GET", "POST"],
);
