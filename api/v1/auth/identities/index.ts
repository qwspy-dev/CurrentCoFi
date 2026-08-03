import { listAccountIdentities } from "../../../../server/accounts/repository.js";
import { createExternalAuthorization, externalIdentityAvailability } from "../../../../server/auth/external-identities.js";
import { sessionFromRequest } from "../../../../server/auth/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../../server/http.js";

async function read(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session.accountId) throw new ApiError(409, "ACCOUNT_NOT_PERSISTED", "Finish creating your Current account before managing identities.");
  return ok(request, {
    identities: await listAccountIdentities(session.accountId),
    available: externalIdentityAvailability(),
  });
}

async function create(request: Request) {
  const session = await sessionFromRequest(request);
  const body = await readJsonObject(request);
  const provider = requiredString(body, "provider", 20);
  return ok(request, { provider, authorizeUrl: await createExternalAuthorization(request, session, provider) });
}

export default withApi(
  (request) => request.method === "POST" ? create(request) : read(request),
  ["GET", "POST"],
);
