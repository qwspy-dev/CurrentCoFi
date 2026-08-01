import { createSubscriptionPlan, listSubscriptionWorkspace } from "../../../server/commerce/subscriptions.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const key=await authenticateDeveloperKey(request); const origin=new URL(request.url).origin;
  if(request.method==="GET"){requireDeveloperPermission(key,"analytics:read");return ok(request,await listSubscriptionWorkspace({projectId:key.projectId,origin}));}
  requireDeveloperPermission(key,"campaigns:write");const raw=await request.text();if(raw.length>32_768)throw new ApiError(413,"BODY_TOO_LARGE","Subscription payloads are limited to 32 KB.");await verifySignedDeveloperRequest(request,key,raw);let body:Record<string,unknown>;try{body=JSON.parse(raw||"{}")}catch{throw new ApiError(400,"INVALID_JSON","The subscription payload must be valid JSON.")}
  return ok(request,await createSubscriptionPlan({projectId:key.projectId,actorKeyId:key.id,title:requiredString(body,"title",100),description:typeof body.description==="string"?body.description:undefined,amount:requiredString(body,"amount",50),intervalDays:Number(body.intervalDays),successUrl:typeof body.successUrl==="string"?body.successUrl:undefined,origin}),201);
}, ["GET","POST"]);
