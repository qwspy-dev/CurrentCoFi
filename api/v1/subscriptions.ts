import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { createSubscriptionPlan, listSubscriptionWorkspace, pauseSubscriptionPlan } from "../../server/commerce/subscriptions.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request); const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName); const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listSubscriptionWorkspace({ userId: account.userId, projectId: project.id, origin }));
  const body = await readJsonObject(request);
  if (body.action === "create-plan") return ok(request, await createSubscriptionPlan({ projectId: project.id, userId: account.userId, title: requiredString(body, "title", 100), description: typeof body.description === "string" ? body.description : undefined, amount: requiredString(body, "amount", 50), intervalDays: Number(body.intervalDays), successUrl: typeof body.successUrl === "string" ? body.successUrl : undefined, origin }), 201);
  if (body.action === "set-status") return ok(request, await pauseSubscriptionPlan({ userId: account.userId, projectId: project.id, planId: requiredString(body, "planId", 100), status: body.status === "active" ? "active" : "paused" }));
  throw new ApiError(400, "INVALID_SUBSCRIPTION_ACTION", "Use create-plan or set-status.");
}, ["GET", "POST"]);
