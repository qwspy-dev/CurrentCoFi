import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { arcWallet } from "../../server/campaigns/settlement.js";
import { createEscrowAgreement, listEscrowAgreements, type EscrowMilestoneInput } from "../../server/escrow/service.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const wallet = arcWallet(session);
  if (request.method === "GET") return ok(request, await listEscrowAgreements({ userId: account.userId, walletAddress: wallet.address }));
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const body = await readJsonObject(request);
  if (!Array.isArray(body.milestones)) throw new ApiError(400, "INVALID_MILESTONES", "milestones must be an array.");
  const milestones = body.milestones.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "INVALID_MILESTONE", `Milestone ${index + 1} is invalid.`);
    const item = value as Record<string, unknown>;
    return {
      title: requiredString(item, "title", 100),
      amount: requiredString(item, "amount", 50),
      dueAt: requiredString(item, "dueAt", 100),
    } satisfies EscrowMilestoneInput;
  });
  return ok(request, await createEscrowAgreement({
    projectId: project.id, userId: account.userId, clientAddress: wallet.address,
    name: requiredString(body, "name", 100),
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    providerAddress: requiredString(body, "providerAddress", 100),
    arbitratorAddress: requiredString(body, "arbitratorAddress", 100),
    milestones,
  }), 201);
}, ["GET", "POST"]);
