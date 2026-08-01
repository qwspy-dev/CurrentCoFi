import { developerSession } from "../../server/developer/session.js";
import { createUserGrantReview, listUserGrantReviews } from "../../server/grants/review.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

function distributionId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new ApiError(400, "INVALID_CAMPAIGN", "distributionId must be a campaign UUID.");
  }
  return value;
}

async function create(request: Request) {
  const { account, project } = await developerSession(request);
  const body = await readJsonObject(request);
  return ok(request, await createUserGrantReview({
    userId: account.userId,
    projectId: project.id,
    distributionId: distributionId(body.distributionId),
  }), 201);
}

async function list(request: Request) {
  const { account } = await developerSession(request);
  return ok(request, { packages: await listUserGrantReviews(account.userId) });
}

export default withApi((request) => request.method === "POST" ? create(request) : list(request), ["GET", "POST"]);
