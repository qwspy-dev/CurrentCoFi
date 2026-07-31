import { getPublicEvidenceReport } from "../../../server/evidence/reports.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const publicSlug = new URL(request.url).searchParams.get("slug");
  if (!publicSlug) {
    throw new ApiError(400, "EVIDENCE_SLUG_REQUIRED", "An evidence report identifier is required.");
  }
  return ok(request, await getPublicEvidenceReport(publicSlug), 200, {
    "cache-control": "public, max-age=60, stale-while-revalidate=300",
  });
}, ["GET"]);
