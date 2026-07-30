import { getOrCreatePersonalProject, persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import {
  beginEconomyAction,
  beginEconomyExecution,
  confirmEconomyApproval,
  confirmEconomyExecution,
  economySnapshot,
  listEconomyActions,
} from "../../../server/token/economy.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

async function read(request: Request) {
  try {
    const session = await sessionFromRequest(request);
    const account = await persistSessionAccount(session);
    const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
    const [snapshot, actions] = await Promise.all([
      economySnapshot(wallet?.address),
      listEconomyActions(account.userId),
    ]);
    return ok(request, { ...snapshot, actions });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return ok(request, { ...(await economySnapshot()), actions: [] });
    }
    throw error;
  }
}

async function write(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const body = await readJsonObject(request);
  if (body.stage === "approve") {
    if (typeof body.actionId === "string" && typeof body.challengeId === "string") {
      return ok(request, await confirmEconomyApproval(
        request, session, account.userId, body.actionId, body.challengeId,
      ));
    }
    if (body.kind !== "project-lock" && body.kind !== "product-fee") {
      throw new ApiError(400, "INVALID_ECONOMY_KIND", "Choose a project lock or product fee.");
    }
    return ok(request, await beginEconomyAction(
      request,
      session,
      account.userId,
      project.id,
      {
        kind: body.kind,
        amount: body.amount,
        durationDays: body.durationDays,
        reference: body.reference,
      },
    ), 201);
  }
  if (body.stage === "execute") {
    const actionId = requiredString(body, "actionId", 100);
    const data = typeof body.challengeId === "string"
      ? await confirmEconomyExecution(request, session, account.userId, actionId, body.challengeId)
      : await beginEconomyExecution(request, session, account.userId, actionId);
    return ok(request, data);
  }
  throw new ApiError(400, "INVALID_ECONOMY_STAGE", "Stage must be approve or execute.");
}

export default withApi(
  (request) => request.method === "GET" ? read(request) : write(request),
  ["GET", "POST"],
);
