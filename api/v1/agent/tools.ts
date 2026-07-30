import { ok, withApi } from "../../../server/http.js";

export default withApi((request) => ok(request, {
  protocol: "current-cofi-agent-tools",
  version: "1.0.0",
  network: "ARC-TESTNET",
  authentication: {
    type: "scoped-api-key",
    signature: "HMAC-SHA256",
    timestampHeader: "x-current-timestamp",
    signatureHeader: "x-current-signature",
  },
  tools: [
    {
      name: "create_distribution",
      description: "Create a funded-wallet onboarding campaign for USDC or an Arc project token.",
      method: "POST",
      path: "/api/v1/developer/distributions",
      permission: "campaigns:write",
      input: {
        name: "string",
        tokenAddress: "optional Arc ERC-20 address; omit for USDC",
        recipients: "array of { identityType, identity, amount }",
        expiresInHours: "1-720",
        activationEvent: "optional project event type",
        referralReward: "optional project-defined reward label",
      },
    },
    {
      name: "submit_activation",
      description: "Submit a verified post-claim activation for attribution and webhook delivery.",
      method: "POST",
      path: "/api/v1/developer/activations",
      permission: "activations:write",
      input: {
        externalEventId: "string",
        eventType: "string",
        distributionId: "uuid",
        walletAddress: "0x address",
        occurredAt: "ISO-8601",
        payload: "object",
      },
    },
    {
      name: "campaign_analytics",
      description: "Read campaign, recipient, claim, and activation totals.",
      method: "GET",
      path: "/api/v1/developer/analytics",
      permission: "analytics:read",
    },
  ],
}), ["GET"]);
