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
      "arc-claim-vault",
      "sponsored-claim-execution",
      "merkle-project-campaigns",
      "arbitrary-erc20-distribution",
      "campaign-recovery",
      "live-distribution-analytics",
      "referral-attribution",
      "signed-activation-ingestion",
      "scoped-developer-keys",
      "durable-signed-webhooks",
      "policy-bound-agent-keys",
      "agent-tool-manifest",
      "developer-distribution-api",
      "typescript-sdk",
      "embedded-claim-components",
    ],
    nextModules: ["current-token-economy"],
    laterModules: ["agent-wallet-actions"],
    roadmapModules: ["merchant-checkout", "escrow", "subscriptions", "crosschain-usdc-funding"],
  },
}), ["GET"]);
