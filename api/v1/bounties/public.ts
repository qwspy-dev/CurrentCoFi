import { publicBounty, submitBounty, type BountyContactType } from "../../../server/bounties/repository.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";

async function read(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) throw new ApiError(400, "BOUNTY_REQUIRED", "A bounty slug is required.");
  return ok(request, await publicBounty(slug, new URL(request.url).origin));
}

async function create(request: Request) {
  const body = await readJsonObject(request);
  for (const field of ["slug", "displayName", "contact", "workUrl", "workSummary"] as const) if (typeof body[field] !== "string") throw new ApiError(400, "INVALID_SUBMISSION", `${field} is required.`);
  const contactType = String(body.contactType ?? "email");
  if (!["email", "wallet", "x", "game", "custom"].includes(contactType)) throw new ApiError(400, "INVALID_CONTACT", "Choose a supported contact identity.");
  return ok(request, await submitBounty({ slug: body.slug as string, displayName: body.displayName as string, contactType: contactType as BountyContactType, contact: body.contact as string, workUrl: body.workUrl as string, workSummary: body.workSummary as string }), 201);
}

export default withApi((request) => request.method === "POST" ? create(request) : read(request), ["GET", "POST"]);
