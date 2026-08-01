import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { arcWallet } from "../../server/campaigns/settlement.js";
import { createCheckoutLink, listMerchantCommerce, upsertMerchant } from "../../server/commerce/checkout.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request); const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName); const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listMerchantCommerce({ userId: account.userId, projectId: project.id, origin }));
  const body = await readJsonObject(request); const wallet = arcWallet(session);
  if (body.action === "setup") return ok(request, await upsertMerchant({ projectId: project.id, userId: account.userId, displayName: requiredString(body, "displayName", 80), settlementAddress: typeof body.settlementAddress === "string" ? body.settlementAddress : wallet.address, description: typeof body.description === "string" ? body.description : undefined, logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined }));
  if (body.action !== "create-checkout") throw new ApiError(400, "INVALID_MERCHANT_ACTION", "Use setup or create-checkout.");
  return ok(request, await createCheckoutLink({ projectId: project.id, userId: account.userId, title: requiredString(body, "title", 100), description: typeof body.description === "string" ? body.description : undefined, amount: requiredString(body, "amount", 50), expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined, successUrl: typeof body.successUrl === "string" ? body.successUrl : undefined, origin }), 201);
}, ["GET", "POST"]);
