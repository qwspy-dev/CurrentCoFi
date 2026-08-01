import { persistSessionAccount } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { startSubscriptionChallenge } from "../../../server/commerce/subscriptions.js";
import { ok, readJsonObject, requiredString, withApi } from "../../../server/http.js";
export default withApi(async (request) => { const session=await sessionFromRequest(request); const account=await persistSessionAccount(session); const body=await readJsonObject(request); return ok(request,await startSubscriptionChallenge(request,session,{userId:account.userId,slug:requiredString(body,"slug",100),subscriptionId:typeof body.subscriptionId==="string"?body.subscriptionId:undefined,paymentId:typeof body.paymentId==="string"?body.paymentId:undefined,challengeId:typeof body.challengeId==="string"?body.challengeId:undefined})); }, ["POST"]);
