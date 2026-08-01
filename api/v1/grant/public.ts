import { getPublicGrantReview } from "../../../server/grants/review.js";
import { ApiError, ok, withApi } from "../../../server/http.js";

async function read(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) throw new ApiError(400, "GRANT_SLUG_REQUIRED", "A grant review identifier is required.");
  return ok(request, await getPublicGrantReview(slug));
}

export default withApi(read);
