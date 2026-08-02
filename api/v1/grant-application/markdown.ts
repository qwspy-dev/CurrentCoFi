import { getGrantApplicationPacket, grantApplicationMarkdown } from "../../../server/grants/application-packet.js";
import { withApi } from "../../../server/http.js";

export default withApi(async () => {
  const packet = await getGrantApplicationPacket();
  return new Response(grantApplicationMarkdown(packet), {
    status: 200,
    headers: {
      "cache-control": "public, max-age=30, stale-while-revalidate=120",
      "content-disposition": "attachment; filename=current-cofi-circle-grant-application.md",
      "content-type": "text/markdown; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}, ["GET"]);
