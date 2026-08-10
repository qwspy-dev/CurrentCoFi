import { getOrCreatePersonalProject, persistSessionAccount } from "../../server/accounts/repository.js";
import { projectActivityCsv, listProjectActivity } from "../../server/activity/repository.js";
import { sessionFromRequest } from "../../server/auth/session.js";
import { ok, withApi } from "../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const url = new URL(request.url);
  const input = {
    userId: account.userId,
    projectId: project.id,
    days: Number(url.searchParams.get("days") ?? 30),
    category: url.searchParams.get("category") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
  };
  if (url.searchParams.get("format") === "csv") {
    const csv = await projectActivityCsv(input);
    return new Response(csv, { headers: { "cache-control": "no-store", "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="current-project-activity-${new Date().toISOString().slice(0, 10)}.csv"`, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });
  }
  return ok(request, await listProjectActivity(input));
}, ["GET"]);
