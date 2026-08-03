import { developerProjectOwner } from "../../../server/developer/distributions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";
import { createVestingBatch, listVestingBatches, type VestingIdentityType, type VestingRecipientInput } from "../../../server/vesting/repository.js";

function recipients(value: unknown): VestingRecipientInput[] { if (!Array.isArray(value)) throw new ApiError(400, "INVALID_VESTING_RECIPIENTS", "Recipients must be an array."); return value.map((item, index) => { const row = item as Record<string, unknown>; const type = String(row?.identityType ?? "email"); if (!item || typeof item !== "object" || !["email", "wallet", "x", "game", "custom"].includes(type)) throw new ApiError(400, "INVALID_VESTING_RECIPIENT", `Recipient ${index + 1} is invalid.`); return { displayName: requiredString(row, "displayName", 80), identityType: type as VestingIdentityType, identity: requiredString(row, "identity", 320), totalAmount: requiredString(row, "totalAmount", 60) }; }); }

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request); const owner = await developerProjectOwner(key.projectId); const origin = new URL(request.url).origin;
  if (request.method === "GET") { requireDeveloperPermission(key, "analytics:read"); return ok(request, await listVestingBatches(owner.userId, key.projectId, origin)); }
  requireDeveloperPermission(key, "campaigns:write"); const raw = await request.text(); if (raw.length > 262_144) throw new ApiError(413, "BODY_TOO_LARGE", "Vesting payloads are limited to 256 KB."); await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>; try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "Vesting payload must be valid JSON."); }
  return ok(request, await createVestingBatch({ userId: owner.userId, displayName: owner.displayName ?? "Current project", projectId: key.projectId, refundAddress: owner.refundAddress, origin, name: requiredString(body, "name", 100), description: requiredString(body, "description", 1_000), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, cliffAt: new Date(requiredString(body, "cliffAt", 100)), releaseCount: Number(body.releaseCount), intervalDays: Number(body.intervalDays), recipients: recipients(body.recipients) }), 201);
}, ["GET", "POST"]);
