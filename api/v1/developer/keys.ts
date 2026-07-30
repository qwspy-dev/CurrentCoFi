import { developerSession } from "../../../server/developer/session.js";
import {
  createDeveloperKey,
  listDeveloperKeys,
  revokeDeveloperKey,
} from "../../../server/developer/keys.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const { project } = await developerSession(request);
  if (request.method === "GET") return ok(request, { keys: await listDeveloperKeys(project.id) });
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";
  if (action === "revoke") {
    if (typeof body.keyId !== "string") throw new ApiError(400, "KEY_ID_REQUIRED", "keyId is required.");
    return ok(request, await revokeDeveloperKey(project.id, body.keyId));
  }
  const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : undefined;
  const policies = body.policies && typeof body.policies === "object" && !Array.isArray(body.policies)
    ? body.policies as Record<string, unknown>
    : undefined;
  return ok(request, await createDeveloperKey({
    projectId: project.id,
    name: typeof body.name === "string" ? body.name : "",
    kind: body.kind === "agent" ? "agent" : "project",
    permissions,
    policies,
    expiresInDays: typeof body.expiresInDays === "number" ? body.expiresInDays : undefined,
  }), 201);
}, ["GET", "POST"]);
