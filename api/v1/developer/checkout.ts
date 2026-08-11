import { createCheckoutLink, listMerchantCommerce, upsertMerchant, type CheckoutSplitInput } from "../../../server/commerce/checkout.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request); const origin = new URL(request.url).origin;
  if (request.method === "GET") { requireDeveloperPermission(key, "analytics:read"); return ok(request, await listMerchantCommerce({ projectId: key.projectId, origin })); }
  requireDeveloperPermission(key, "campaigns:write"); const raw = await request.text();
  if (raw.length > 32_768) throw new ApiError(413, "BODY_TOO_LARGE", "Checkout payloads are limited to 32 KB.");
  await verifySignedDeveloperRequest(request, key, raw); let body: Record<string, unknown>;
  try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The checkout payload must be valid JSON."); }
  if (body.action === "setup") return ok(request, await upsertMerchant({ projectId: key.projectId, displayName: requiredString(body, "displayName", 80), settlementAddress: requiredString(body, "settlementAddress", 100), description: typeof body.description === "string" ? body.description : undefined }), 201);
  const splits = Array.isArray(body.splits) ? body.splits.map((item) => { const row = item as Record<string, unknown>; return { kind: String(row.kind), label: String(row.label ?? ""), recipientAddress: typeof row.recipientAddress === "string" ? row.recipientAddress : undefined, basisPoints: Number(row.basisPoints) } as CheckoutSplitInput; }) : undefined;
  return ok(request, await createCheckoutLink({ projectId: key.projectId, actorKeyId: key.id, title: requiredString(body, "title", 100), description: typeof body.description === "string" ? body.description : undefined, amount: requiredString(body, "amount", 50), expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined, successUrl: typeof body.successUrl === "string" ? body.successUrl : undefined, origin, settlementAddress: typeof body.settlementAddress === "string" ? body.settlementAddress : undefined, merchantName: typeof body.merchantName === "string" ? body.merchantName : undefined, splits }), 201);
}, ["GET", "POST"]);
