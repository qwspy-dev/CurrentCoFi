import { developerSession } from "../../server/developer/session.js";
import {
  createUserEvidenceReport,
  listUserEvidenceReports,
} from "../../server/evidence/reports.js";
import { ApiError, ok, readJsonObject, withApi } from "../../server/http.js";

function optionalDistributionId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new ApiError(400, "INVALID_CAMPAIGN", "distributionId must be a campaign UUID.");
  }
  return value;
}

async function create(request: Request) {
  const { account, project } = await developerSession(request);
  const body = await readJsonObject(request);
  const report = await createUserEvidenceReport({
    userId: account.userId,
    projectId: project.id,
    distributionId: optionalDistributionId(body.distributionId),
  });
  return ok(request, report, 201);
}

async function list(request: Request) {
  const { account } = await developerSession(request);
  return ok(request, { reports: await listUserEvidenceReports(account.userId) });
}

export default withApi(
  (request) => request.method === "POST" ? create(request) : list(request),
  ["GET", "POST"],
);
