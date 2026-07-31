import { developerSession } from "../../server/developer/session.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../server/http.js";
import { createIncident, isIncidentSeverity, isIncidentStatus, listPublicIncidents, updateIncident } from "../../server/observability/incidents.js";

export default withApi(async (request) => {
  const { account } = await developerSession(request);
  if (request.method === "GET") return ok(request, { incidents: await listPublicIncidents(100) });
  const body = await readJsonObject(request);
  const action = requiredString(body, "action", 32);
  if (action === "create") {
    const severity = requiredString(body, "severity", 16);
    if (!isIncidentSeverity(severity)) throw new ApiError(400, "INVALID_SEVERITY", "severity must be minor, major, or critical.");
    const affectedComponents = Array.isArray(body.affectedComponents)
      ? body.affectedComponents.filter((value): value is string => typeof value === "string" && value.length <= 64)
      : [];
    const incident = await createIncident({ userId: account.userId, title: requiredString(body, "title", 160), summary: requiredString(body, "summary", 2_000), severity, affectedComponents });
    return ok(request, { incident }, 201);
  }
  if (action === "update") {
    const status = requiredString(body, "status", 32);
    if (!isIncidentStatus(status)) throw new ApiError(400, "INVALID_INCIDENT_STATUS", "status must be investigating, identified, monitoring, or resolved.");
    const incident = await updateIncident({ userId: account.userId, incidentId: requiredString(body, "incidentId", 64), status, message: requiredString(body, "message", 2_000) });
    return ok(request, { incident });
  }
  throw new ApiError(400, "INVALID_ACTION", "action must be create or update.");
}, ["GET", "POST"]);
