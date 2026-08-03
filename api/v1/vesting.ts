import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";
import { createVestingBatch, listVestingBatches, type VestingIdentityType, type VestingRecipientInput } from "../../server/vesting/repository.js";

function recipients(value: unknown): VestingRecipientInput[] {
  if (!Array.isArray(value)) throw new ApiError(400, "INVALID_VESTING_RECIPIENTS", "Recipients must be an array.");
  return value.map((item, index) => { const row = item as Record<string, unknown>; const type = String(row?.identityType ?? "email"); if (!item || typeof item !== "object" || !["email", "wallet", "x", "game", "custom"].includes(type)) throw new ApiError(400, "INVALID_VESTING_RECIPIENT", `Recipient ${index + 1} is invalid.`); return { displayName: requiredString(row, "displayName", 80), identityType: type as VestingIdentityType, identity: requiredString(row, "identity", 320), totalAmount: requiredString(row, "totalAmount", 60) }; });
}

export default withApi(async (request) => {
  const session = await sessionFromRequest(request); const account = await persistSessionAccount(session); const project = await getOrCreatePersonalProject(account.userId, session.displayName); const origin = new URL(request.url).origin;
  if (request.method === "GET") return ok(request, await listVestingBatches(account.userId, project.id, origin));
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET"); if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before creating launch vesting.");
  const body = await readJsonObject(request);
  return ok(request, await createVestingBatch({ userId: account.userId, displayName: session.displayName, projectId: project.id, refundAddress: wallet.address, origin, name: requiredString(body, "name", 100), description: requiredString(body, "description", 1_000), tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined, cliffAt: new Date(requiredString(body, "cliffAt", 100)), releaseCount: Number(body.releaseCount), intervalDays: Number(body.intervalDays), recipients: recipients(body.recipients) }), 201);
}, ["GET", "POST"]);
