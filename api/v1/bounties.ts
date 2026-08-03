import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { createBounty, listBounties, reviewBounty, winningClaim } from "../../server/bounties/repository.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  return ok(request, await listBounties(account.userId, project.id, new URL(request.url).origin));
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const wallet = session.wallets.find((item) => item.blockchain === "ARC-TESTNET");
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "Create your Arc wallet before publishing a bounty.");
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";
  if (action === "shortlist" || action === "reject" || action === "award") {
    if (typeof body.bountyId !== "string" || typeof body.submissionId !== "string") throw new ApiError(400, "SUBMISSION_REQUIRED", "Choose a bounty submission.");
    return ok(request, await reviewBounty({ userId: account.userId, bountyId: body.bountyId, submissionId: body.submissionId, action, origin: new URL(request.url).origin }));
  }
  if (action === "winning-claim") {
    if (typeof body.bountyId !== "string") throw new ApiError(400, "BOUNTY_REQUIRED", "Choose a bounty.");
    return ok(request, await winningClaim(account.userId, body.bountyId, new URL(request.url).origin));
  }
  for (const field of ["title", "summary", "category", "amount"] as const) if (typeof body[field] !== "string") throw new ApiError(400, "INVALID_BOUNTY", `${field} is required.`);
  const deadline = new Date(String(body.submissionDeadline ?? ""));
  if (Number.isNaN(deadline.getTime())) throw new ApiError(400, "INVALID_DEADLINE", "Choose a valid submission deadline.");
  return ok(request, await createBounty({
    userId: account.userId,
    displayName: session.displayName,
    projectId: project.id,
    refundAddress: wallet.address,
    origin: new URL(request.url).origin,
    title: body.title as string,
    summary: body.summary as string,
    category: body.category as string,
    amount: body.amount as string,
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    submissionDeadline: deadline,
  }), 201);
}

export default withApi((request) => request.method === "POST" ? create(request) : read(request), ["GET", "POST"]);
