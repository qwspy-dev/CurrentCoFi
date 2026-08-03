import { getOrCreatePersonalProject, persistSessionAccount, resolveCurrentUsername } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";
import { createSocialPayment, listSocialPayments, type SocialPaymentKind } from "../../server/payments/social.js";

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  return ok(request, await listSocialPayments(account.userId, new URL(request.url).origin));
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before making a payment.");
  const body = await readJsonObject(request);
  const kind = requiredString(body, "kind", 20) as SocialPaymentKind;
  let recipient;
  if (kind === "send") {
    recipient = await resolveCurrentUsername(requiredString(body, "username", 40));
    if (!recipient) throw new ApiError(404, "CURRENT_USER_NOT_FOUND", "That Current username does not have an active Arc wallet yet.");
    if (recipient.id === account.userId) throw new ApiError(400, "SELF_PAYMENT", "Choose another Current user to send to.");
  }
  const shares = Array.isArray(body.shares) ? body.shares.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "INVALID_SPLIT", "Each split needs a label and amount.");
    const item = value as Record<string, unknown>;
    return { label: typeof item.label === "string" ? item.label : undefined, amount: typeof item.amount === "string" ? item.amount : "" };
  }) : undefined;
  return ok(request, await createSocialPayment({
    userId: account.userId,
    creatorAddress: wallet.address,
    recipientUserId: recipient?.id,
    recipientAddress: recipient?.walletAddress,
    projectId: project.id,
    kind,
    title: requiredString(body, "title", 100),
    note: typeof body.note === "string" ? body.note : undefined,
    amount: typeof body.amount === "string" ? body.amount : undefined,
    shares,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
    origin: new URL(request.url).origin,
  }), 201);
}

export default withApi((request) => request.method === "POST" ? create(request) : read(request), ["GET", "POST"]);
