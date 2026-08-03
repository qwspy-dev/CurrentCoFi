import { completeExternalAuthorization } from "../../../../server/auth/external-identities.js";
import { sessionFromRequest } from "../../../../server/auth/session.js";

function returnTo(request: Request, values: Record<string, string>) {
  const url = new URL(request.url);
  const target = new URL("/", `${url.protocol}//${url.host}`);
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  target.hash = "/settings";
  return target;
}

const handler = {
  async fetch(request: Request) {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const code = url.searchParams.get("code") ?? "";
    if (url.searchParams.get("error")) {
      return Response.redirect(returnTo(request, { identityError: "cancelled" }).toString());
    }
    try {
      const linked = await completeExternalAuthorization(request, await sessionFromRequest(request), provider, state, code);
      return Response.redirect(returnTo(request, { identityLinked: linked }).toString());
    } catch (error) {
      const codeValue = error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "link_failed";
      return Response.redirect(returnTo(request, { identityError: codeValue }).toString());
    }
  },
};

export default handler;
