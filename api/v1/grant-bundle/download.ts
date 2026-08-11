import { createGrantReviewerBundle } from "../../../server/grants/reviewer-bundle.js";
import { withApi } from "../../../server/http.js";

export default withApi(async () => {
  const { archive } = await createGrantReviewerBundle();
  return new Response(archive as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": "attachment; filename=\"current-cofi-circle-reviewer-bundle.zip\"",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
