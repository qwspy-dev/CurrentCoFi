import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  openapi: "3.1.0",
  info: {
    title: "Current CoFi API",
    version: "1.3.0-campaigns",
    description: "Walletless USDC and project-token distribution infrastructure for Arc.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": { get: { summary: "Service and dependency health" } },
    "/meta": { get: { summary: "Public chain, capability, and product metadata" } },
    "/auth/config": { get: { summary: "Public Circle wallet authentication configuration" } },
    "/auth/device-token": { post: { summary: "Create a Circle device-bound login token" } },
    "/auth/email-token": { post: { summary: "Begin a Circle email OTP login" } },
    "/auth/initialize": { post: { summary: "Create an Arc testnet smart-contract account wallet" } },
    "/auth/session": {
      get: { summary: "Read the encrypted Current CoFi account session" },
      post: { summary: "Verify Circle identity and create the account session" },
      delete: { summary: "Sign out and clear the account session" },
    },
    "/auth/refresh": { post: { summary: "Refresh Circle credentials and the encrypted account session" } },
    "/links": {
      get: { summary: "List claim links owned by the signed-in account" },
      post: { summary: "Create a persistent, signed walletless USDC claim link" },
    },
    "/links/resolve": { post: { summary: "Resolve a signed claim token into a safe public preview" } },
    "/campaigns": {
      get: { summary: "List owned campaigns with verified settlement analytics" },
      post: { summary: "Create a Merkle-allowlisted USDC or project-token campaign" },
    },
    "/campaigns/fund": { post: { summary: "Approve and fully fund a campaign vault on Arc" } },
    "/campaigns/manage": { post: { summary: "Cancel a campaign or refund an expired campaign" } },
    "/campaigns/recipients": { get: { summary: "List masked recipient allocations and settlement states" } },
    "/campaigns/analytics": { get: { summary: "Read live campaign targeting, claims, and activation totals" } },
  },
  "x-current-cofi": {
    liveResourceGroups: [
      "auth", "users", "wallets", "projects", "tokens", "distributions",
      "allocations", "campaigns", "claims", "campaign-analytics",
    ],
    plannedResourceGroups: [
      "referrals", "activation-ingestion", "api-keys", "webhooks", "agents",
    ],
  },
}), ["GET"]);
