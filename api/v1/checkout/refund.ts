import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { refundPaymentChallenge } from "../../../server/commerce/checkout.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";
export default withApi(async (request) => { const session=await sessionFromRequest(request); const account=await persistSessionAccount(session); const body=await readJsonObject(request); return ok(request, await refundPaymentChallenge(request,session,{userId:account.userId,paymentId:requiredString(body,"paymentId",100),challengeId:typeof body.challengeId==="string"?body.challengeId:undefined})); }, ["POST"]);
