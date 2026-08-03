import { publicDrop, reservePublicDrop } from "../../../server/drops/repository.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const origin = new URL(request.url).origin;
  if (request.method === "GET") {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    return ok(request, await publicDrop(slug, origin));
  }
  const body = await readJsonObject(request);
  return ok(request, await reservePublicDrop({ publicSlug: requiredString(body, "slug", 100), displayName: requiredString(body, "displayName", 80), email: requiredString(body, "email", 320), referredByCode: typeof body.referredByCode === "string" ? body.referredByCode : undefined, origin }), 201);
}, ["GET", "POST"]);
