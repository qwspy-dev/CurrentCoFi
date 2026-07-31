import {
  confirmAgentSettlementChallenge,
  createAgentSettlementChallenge,
} from "../../../server/agents/settlement.js";
import { developerSession } from "../../../server/developer/session.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const { session, account, project } = await developerSession(request);
  const body = await readJsonObject(request);
  if (
    typeof body.actionId !== "string" ||
    (body.action !== "approve" && body.action !== "deposit")
  ) {
    throw new ApiError(400, "INVALID_AGENT_SETTLEMENT", "actionId and an approve or deposit action are required.");
  }
  const shared = {
    request,
    session,
    userId: account.userId,
    projectId: project.id,
    actionId: body.actionId,
    action: body.action as "approve" | "deposit",
  };
  const result = typeof body.challengeId === "string"
    ? await confirmAgentSettlementChallenge({ ...shared, challengeId: body.challengeId })
    : await createAgentSettlementChallenge(shared);
  return ok(request, result);
}, ["POST"]);
