import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  openapi: "3.1.0",
  info: {
    title: "Current CoFi API",
    version: "1.7.0-governance",
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
    "/referrals": {
      get: { summary: "Read referral codes, claims, and verified activation attribution" },
      post: { summary: "Create an attributable referral code for a campaign" },
    },
    "/developer/keys": {
      get: { summary: "List scoped project and agent API keys" },
      post: { summary: "Create or revoke a scoped API key" },
    },
    "/developer/webhooks": {
      get: { summary: "List signed webhook endpoints and durable delivery attempts" },
      post: { summary: "Create, pause, test, or retry a signed webhook endpoint" },
    },
    "/developer/activations": {
      post: { summary: "Ingest an HMAC-signed post-claim activation event" },
    },
    "/developer/distributions": {
      post: { summary: "Create a signed walletless USDC or project-token distribution" },
    },
    "/developer/analytics": {
      get: { summary: "Read project analytics with a scoped API key" },
    },
    "/token/economy": {
      get: { summary: "Read the public $CURRENT economy, access tiers, and governed buyback proof" },
      post: { summary: "Approve, execute, and activate a project lock or route a product fee" },
    },
    "/agent/tools": {
      get: { summary: "Read the machine-readable Current CoFi agent tool manifest" },
    },
  },
  "x-current-cofi": {
    liveResourceGroups: [
      "auth", "users", "wallets", "projects", "tokens", "distributions",
      "allocations", "campaigns", "claims", "campaign-analytics", "referrals",
      "activation-ingestion", "api-keys", "webhooks", "agents", "sdk",
      "embedded-components", "current-token", "project-locks", "fee-routing",
      "project-access-tiers", "buyback-governance",
    ],
    plannedResourceGroups: [],
  },
}), ["GET"]);
