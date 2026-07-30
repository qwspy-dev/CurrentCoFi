import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, {
  openapi: "3.1.0",
  info: {
    title: "Current CoFi API",
    version: "1.0.0-foundation",
    description: "Walletless USDC and project-token distribution infrastructure for Arc.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": { get: { summary: "Service and dependency health" } },
    "/meta": { get: { summary: "Public chain, capability, and product metadata" } },
  },
  "x-current-cofi": {
    plannedResourceGroups: [
      "auth", "users", "wallets", "projects", "tokens", "distributions",
      "allocations", "claims", "referrals", "activations", "api-keys", "webhooks", "agents",
    ],
  },
}), ["GET"]);
