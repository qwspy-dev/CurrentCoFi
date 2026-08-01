import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { subscriptionActionChallenge } from "../../../server/commerce/subscriptions.js";
import { ApiError, ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";
export default withApi(async (request) => { const session=await sessionFromRequest(request); const account=await persistSessionAccount(session); const body=await readJsonObject(request); if(body.action!=="renew"&&body.action!=="cancel")throw new ApiError(400,"INVALID_SUBSCRIPTION_ACTION","Use renew or cancel."); return ok(request,await subscriptionActionChallenge(request,session,{userId:account.userId,action:body.action,subscriptionId:requiredString(body,"subscriptionId",100),paymentId:typeof body.paymentId==="string"?body.paymentId:undefined,challengeId:typeof body.challengeId==="string"?body.challengeId:undefined})); }, ["POST"]);
