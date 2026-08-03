import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";
import { createTreasuryBudget, createTreasuryProposal, listCommunityTreasury, upsertCommunityTreasury } from "../../../server/treasury/repository.js";
export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request); const owner = await developerProjectOwner(key.projectId); const origin = new URL(request.url).origin;
  if (request.method === "GET") { requireDeveloperPermission(key, "analytics:read"); return ok(request, await listCommunityTreasury(owner.userId, key.projectId, origin)); }
  requireDeveloperPermission(key, "campaigns:write"); const raw = await request.text(); if (raw.length > 65_536) throw new ApiError(413, "BODY_TOO_LARGE", "Treasury payloads are limited to 64 KB."); await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>; try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Treasury payload must be valid JSON."); }
  const action = typeof body.action === "string" ? body.action : "proposal";
  if (action === "setup") return ok(request, await upsertCommunityTreasury({ userId: owner.userId, projectId: key.projectId, name: requiredString(body, "name", 80), description: typeof body.description === "string" ? body.description : undefined, treasuryAddress: owner.refundAddress, origin }), 201);
  if (action === "budget") return ok(request, await createTreasuryBudget({ userId: owner.userId, treasuryId: requiredString(body, "treasuryId", 100), category: requiredString(body, "category", 50), limit: requiredString(body, "limit", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, periodStart: new Date(requiredString(body, "periodStart", 100)), periodEnd: new Date(requiredString(body, "periodEnd", 100)) }), 201);
  if (action === "proposal") return ok(request, await createTreasuryProposal({ userId: owner.userId, treasuryId: requiredString(body, "treasuryId", 100), budgetId: typeof body.budgetId === "string" ? body.budgetId : undefined, title: requiredString(body, "title", 100), description: requiredString(body, "description", 2_000), category: requiredString(body, "category", 50), recipientAddress: requiredString(body, "recipientAddress", 100), amount: requiredString(body, "amount", 60), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, proofUrl: typeof body.proofUrl === "string" ? body.proofUrl : undefined }), 201);
  throw new ApiError(400, "WALLET_APPROVAL_REQUIRED", "Treasury approval and payment execution must be completed by an authorized Circle wallet in the Current workspace.");
}, ["GET", "POST"]);
