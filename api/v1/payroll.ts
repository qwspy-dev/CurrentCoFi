import { persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";
import { createPayrollSchedule, listPayroll, preparePayrollRun, setPayrollStatus, type PayrollMemberInput } from "../../server/payroll/repository.js";

function roster(value: unknown): PayrollMemberInput[] {
  if (!Array.isArray(value)) throw new ApiError(400, "INVALID_ROSTER", "Contributors must be an array.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ApiError(400, "INVALID_ROSTER", `Contributor ${index + 1} is invalid.`);
    const row = item as Record<string, unknown>;
    if (!["email", "wallet", "x", "game", "custom"].includes(String(row.identityType)) || typeof row.identity !== "string" || typeof row.amount !== "string") {
      throw new ApiError(400, "INVALID_ROSTER", `Contributor ${index + 1} needs a supported identity, identity type, and amount.`);
    }
    return { identityType: row.identityType as PayrollMemberInput["identityType"], identity: row.identity, amount: row.amount, displayName: typeof row.displayName === "string" ? row.displayName : undefined, role: typeof row.role === "string" ? row.role : undefined };
  });
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before setting up payroll.");
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";
  if (action === "prepare") {
    if (typeof body.scheduleId !== "string") throw new ApiError(400, "PAYROLL_REQUIRED", "Choose a payroll schedule.");
    return ok(request, await preparePayrollRun({ userId: account.userId, displayName: session.displayName, scheduleId: body.scheduleId, origin: new URL(request.url).origin }), 201);
  }
  if (action === "pause" || action === "resume") {
    if (typeof body.scheduleId !== "string") throw new ApiError(400, "PAYROLL_REQUIRED", "Choose a payroll schedule.");
    return ok(request, await setPayrollStatus(account.userId, body.scheduleId, action === "pause" ? "paused" : "active"));
  }
  if (typeof body.name !== "string") throw new ApiError(400, "INVALID_PAYROLL", "Payroll name is required.");
  const nextRunAt = new Date(String(body.nextRunAt ?? ""));
  if (Number.isNaN(nextRunAt.getTime())) throw new ApiError(400, "INVALID_RUN_DATE", "Choose a valid first pay date.");
  const result = await createPayrollSchedule({
    userId: account.userId,
    name: body.name,
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    cadenceDays: Number(body.cadenceDays ?? 14),
    nextRunAt,
    claimExpiresHours: Number(body.claimExpiresHours ?? 168),
    refundAddress: wallet.address,
    members: roster(body.members),
  });
  return ok(request, result, 201);
}

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  return ok(request, await listPayroll(account.userId));
}

export default withApi((request) => request.method === "POST" ? create(request) : read(request), ["GET", "POST"]);
