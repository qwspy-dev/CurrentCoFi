import { persistSessionAccount, getOrCreatePersonalProject } from "../../../server/accounts/repository.js";
import { sessionFromRequest } from "../../../server/auth/session.js";
import { resolveToken } from "../../../server/campaigns/repository.js";
import { ARC_TESTNET } from "../../../server/config.js";
import { ApiError, ok, readJsonObject, withApi } from "../../../server/http.js";

export default withApi(async (request) => {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const body = await readJsonObject(request);
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address) throw new ApiError(400, "TOKEN_ADDRESS_REQUIRED", "Enter an Arc token contract address.");
  const token = await resolveToken(project.id, address);
  return ok(request, {
    address: token.contractAddress,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    verified: token.verified,
    network: ARC_TESTNET.network,
    warning: token.verified
      ? null
      : "Contract metadata was read directly from Arc. Current CoFi does not endorse or guarantee this token.",
  });
}, ["POST"]);
