import { resolveToken } from "../../../../server/campaigns/repository.js";
import { ARC_TESTNET } from "../../../../server/config.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../../server/developer/keys.js";
import { ApiError, ok, withApi } from "../../../../server/http.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "campaigns:write");
  const raw = await request.text();
  if (raw.length > 8_192) throw new ApiError(413, "BODY_TOO_LARGE", "Token inspection payloads are limited to 8 KB.");
  await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The token inspection payload must be valid JSON."); }
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address) throw new ApiError(400, "TOKEN_ADDRESS_REQUIRED", "Enter an Arc token contract address.");
  const token = await resolveToken(key.projectId, address);
  return ok(request, {
    address: token.contractAddress,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    verified: token.verified,
    network: ARC_TESTNET.network,
    warning: token.verified ? null : "Metadata was read onchain and is not an endorsement by Current CoFi.",
  });
}, ["POST"]);
