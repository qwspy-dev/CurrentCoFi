import { createGrantReviewerBundle } from "../../server/grants/reviewer-bundle.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const { manifest } = await createGrantReviewerBundle();
  return ok(request, manifest, 200, { "cache-control": "public, max-age=30, s-maxage=30" });
});
