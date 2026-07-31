import { authenticateDeveloperKey, requireDeveloperPermission } from "../../../server/developer/keys.js";
import { ok, withApi } from "../../../server/http.js";
import { economySnapshot } from "../../../server/token/economy.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "analytics:read");
  const snapshot = await economySnapshot();
  return ok(request, {
    network: snapshot.network,
    explorerUrl: snapshot.explorerUrl,
    addresses: snapshot.addresses ? {
      current: snapshot.addresses.current,
      feeRouter: snapshot.addresses.feeRouter,
      liquidityVault: snapshot.addresses.liquidityVault,
      liquidityGovernor: snapshot.addresses.liquidityGovernor,
      liquidityAdapter: snapshot.addresses.testnetLiquidityAdapter,
    } : null,
    allocationBps: snapshot.allocations?.liquidityBps ?? 2_000,
    liquidity: snapshot.liquidity,
  });
}, ["GET"]);
