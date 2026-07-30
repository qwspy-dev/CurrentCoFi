import { getPublicConfig } from "../../server/config.js";
import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  ...getPublicConfig(),
  product: {
    message: "Turn offchain audiences into funded wallets and active token users.",
    liveModules: [
      "foundation-api",
      "public-network-metadata",
      "circle-auth-orchestration",
      "embedded-wallet-session",
      "account-recovery",
      "persistent-accounts",
      "signed-claim-links",
    ],
    nextModules: ["arc-claim-vault", "sponsored-claim-execution", "project-distributions"],
    laterModules: ["campaign-attribution", "developer-platform", "agent-permissions", "current-token-economy"],
    roadmapModules: ["merchant-checkout", "escrow", "subscriptions", "crosschain-usdc-funding"],
  },
}), ["GET"]);
