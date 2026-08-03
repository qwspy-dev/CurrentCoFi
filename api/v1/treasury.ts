import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";
import { createTreasuryBudget, createTreasuryProposal, decideTreasuryProposal, executeTreasuryProposal, listCommunityTreasury, upsertCommunityTreasury } from "../../server/treasury/repository.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request); const account = await persistSessionAccount(session); const project = await getOrCreatePersonalProject(account.userId, session.displayName); const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listCommunityTreasury(account.userId, project.id, origin));
  const body = await readJsonObject(request); const action = typeof body.action === "string" ? body.action : "setup";
  if (action === "setup") {
    const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET"); if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before configuring a treasury.");
    return ok(request, await upsertCommunityTreasury({ userId: account.userId, projectId: project.id, name: requiredString(body, "name", 80), description: typeof body.description === "string" ? body.description : undefined, treasuryAddress: wallet.address, origin }), 201);
  }
  if (action === "budget") return ok(request, await createTreasuryBudget({ userId: account.userId, treasuryId: requiredString(body, "treasuryId", 100), category: requiredString(body, "category", 50), limit: requiredString(body, "limit", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, periodStart: new Date(requiredString(body, "periodStart", 100)), periodEnd: new Date(requiredString(body, "periodEnd", 100)) }), 201);
  if (action === "proposal") return ok(request, await createTreasuryProposal({ userId: account.userId, treasuryId: requiredString(body, "treasuryId", 100), budgetId: typeof body.budgetId === "string" ? body.budgetId : undefined, title: requiredString(body, "title", 100), description: requiredString(body, "description", 2_000), category: requiredString(body, "category", 50), recipientAddress: requiredString(body, "recipientAddress", 100), amount: requiredString(body, "amount", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, proofUrl: typeof body.proofUrl === "string" ? body.proofUrl : undefined }), 201);
  if (action === "approve" || action === "reject") return ok(request, await decideTreasuryProposal({ userId: account.userId, proposalId: requiredString(body, "proposalId", 100), decision: action, note: typeof body.note === "string" ? body.note : undefined }));
  if (action === "execute") return ok(request, await executeTreasuryProposal(request, session, { userId: account.userId, proposalId: requiredString(body, "proposalId", 100), transferId: typeof body.transferId === "string" ? body.transferId : undefined, challengeId: typeof body.challengeId === "string" ? body.challengeId : undefined }));
  throw new ApiError(400, "INVALID_TREASURY_ACTION", "Choose a supported treasury action.");
}, ["GET", "POST"]);
