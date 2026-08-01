import { sessionFromRequest } from "../../../server/auth/session.js";
import { confirmEscrowActionChallenge, createEscrowActionChallenge, type EscrowAction } from "../../../server/escrow/service.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";

const ACTIONS = new Set<EscrowAction>(["approve-token", "fund", "submit", "approve", "dispute", "resolve", "request-cancellation", "accept-cancellation", "refund-expired"]);

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const body = await readJsonObject(request);
  const agreementId = requiredString(body, "agreementId", 100);
  const action = String(body.action) as EscrowAction;
  if (!ACTIONS.has(action)) throw new ApiError(400, "INVALID_ESCROW_ACTION", "Choose a supported escrow action.");
  const position = body.position === undefined ? undefined : Number(body.position);
  if (position !== undefined && (!Number.isInteger(position) || position < 0 || position > 31)) throw new ApiError(400, "INVALID_MILESTONE", "position must identify a valid milestone.");
  const challengeId = typeof body.challengeId === "string" ? body.challengeId : null;
  const data = challengeId
    ? await confirmEscrowActionChallenge(request, session, { agreementId, action, challengeId, position })
    : await createEscrowActionChallenge(request, session, {
      agreementId, action, position,
      proof: typeof body.proof === "string" ? body.proof : undefined,
      providerAward: typeof body.providerAward === "string" ? body.providerAward : undefined,
    });
  return ok(request, data);
}, ["POST"]);
