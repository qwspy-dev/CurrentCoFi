import { createHash } from "node:crypto";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import {
  activationEvents, agentActions, allocations, apiKeys, claims, distributions,
  evidenceReports, identityAttestations, webhookDeliveries, webhookEndpoints,
  vestingBatches,
} from "../db/schema.js";
import { getDb } from "../db/client.js";

const manifestBody = {
  schemaVersion: "current-integration-v1",
  product: "Current CoFi",
  network: "Arc testnet",
  message: "Turn offchain audiences into funded wallets and active token users.",
  publishedAt: "2026-08-01T00:00:00.000Z",
  paths: [
    { id: "server-sdk", label: "Server SDK", bestFor: "Games, token projects, communities", package: "@currentcofi/sdk" },
    { id: "react-embed", label: "React embed", bestFor: "Claim experiences inside existing products", package: "@currentcofi/react" },
    { id: "rest-hmac", label: "REST + HMAC", bestFor: "Any backend stack", spec: "/api/v1/openapi" },
    { id: "agent-tools", label: "Agent tools", bestFor: "Policy-bound AI reward flows", package: "@currentcofi/mcp", manifest: "/api/v1/mcp-manifest" },
  ],
  circleStack: ["Arc settlement", "USDC", "Circle embedded wallets", "Gas Station", "CCTP V2", "Gateway"],
  endpoints: [
    { method: "POST", path: "/api/v1/developer/tokens/inspect", purpose: "Validate exact Arc project-token metadata before distribution", permission: "campaigns:write", signed: true },
    { method: "POST", path: "/api/v1/developer/links", purpose: "Create a private walletless USDC or project-token claim link", permission: "claims:write", signed: true },
    { method: "POST", path: "/api/v1/developer/social-payments", purpose: "Create a non-custodial USDC or project-token request, tip, or split", permission: "campaigns:write", signed: true },
    { method: "POST", path: "/api/v1/developer/distributions", purpose: "Create identity-bound USDC or project-token distributions", permission: "distributions:write", signed: true },
    { method: "POST", path: "/api/v1/developer/bounties", purpose: "Create and award fully funded community work bounties", permission: "campaigns:write", signed: true },
    { method: "GET", path: "/api/v1/developer/bounties", purpose: "Read masked bounty submissions and Arc prize status", permission: "analytics:read", signed: false },
    { method: "POST", path: "/api/v1/developer/giveaways", purpose: "Create or draw a verifiable walletless giveaway", permission: "campaigns:write", signed: true },
    { method: "GET", path: "/api/v1/developer/giveaways", purpose: "Read masked entries, referral attribution, funding, and draw proof", permission: "analytics:read", signed: false },
    { method: "POST", path: "/api/v1/developer/drops", purpose: "Create a capped public USDC or project-token drop", permission: "campaigns:write", signed: true },
    { method: "GET", path: "/api/v1/developer/drops", purpose: "Read reward capacity, claims, and referral attribution", permission: "analytics:read", signed: false },
    { method: "POST", path: "/api/v1/developer/vesting", purpose: "Create walletless USDC or project-token launch vesting with enforced unlocks", permission: "campaigns:write", signed: true },
    { method: "GET", path: "/api/v1/developer/vesting", purpose: "Read masked recipients, funding, tranche unlocks, and claims", permission: "analytics:read", signed: false },
    { method: "GET", path: "/api/v1/developer/treasury", purpose: "Read published budgets, spending proposals, and Arc receipts", permission: "analytics:read", signed: false },
    { method: "GET", path: "/api/v1/developer/brand", purpose: "Read the project's hosted-experience brand system", permission: "analytics:read", signed: false },
    { method: "POST", path: "/api/v1/developer/brand", purpose: "Publish safe branded claims, drops, bounties, giveaways, and embeds", permission: "campaigns:write", signed: true },
    { method: "POST", path: "/api/v1/developer/treasury", purpose: "Configure budgets or create a proposal without granting fund-moving authority", permission: "campaigns:write", signed: true },
    { method: "POST", path: "/api/v1/developer/identity-attestations", purpose: "Bind an offchain identity to an exact recipient wallet", permission: "identities:write", signed: true },
    { method: "POST", path: "/api/v1/developer/claim-conditions", purpose: "Verify a wallet-bound action before campaign settlement", permission: "identities:write", signed: true },
    { method: "POST", path: "/api/v1/developer/activations", purpose: "Attribute valuable post-claim actions", permission: "activations:write", signed: true },
    { method: "GET", path: "/api/v1/developer/analytics", purpose: "Read claim, activation, referral, and retention outcomes", permission: "analytics:read", signed: false },
    { method: "GET", path: "/api/v1/developer/integration-readiness", purpose: "Read the project integration checklist", permission: "analytics:read", signed: false },
  ],
  webhookEvents: ["identity.verified", "claim.completed", "activation.completed", "referral.credited", "campaign.expired", "refund.completed", "bounty.created", "bounty.submitted", "bounty.awarded", "giveaway.created", "giveaway.entered", "giveaway.drawn", "public_drop.created", "public_drop.reserved", "vesting.created", "treasury.created", "treasury.budget_created", "treasury.proposal_created", "treasury.proposal_approved", "treasury.proposal_rejected", "treasury.payment_executed"],
  security: ["Hashed API keys", "HMAC-signed mutations", "Five-minute replay window", "Project-scoped permissions", "Idempotent write operations", "Signed webhook delivery"],
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function integrationManifest() {
  return { ...manifestBody, digest: createHash("sha256").update(stable(manifestBody)).digest("hex") };
}

type Check = { id: string; label: string; detail: string; weight: number; complete: boolean; count: number };

export async function integrationReadiness(projectId: string) {
  const db = getDb();
  const [activeKey, usedKey, webhook, delivered, campaign, confirmedClaim, activation, identity, agent, evidence, vesting] = await Promise.all([
    db.select({ total: count() }).from(apiKeys).where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt))),
    db.select({ total: count() }).from(apiKeys).where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt), isNotNull(apiKeys.lastUsedAt))),
    db.select({ total: count() }).from(webhookEndpoints).where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookEndpoints.enabled, true))),
    db.select({ total: count() }).from(webhookDeliveries).innerJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id)).where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookDeliveries.status, "delivered"))),
    db.select({ total: count() }).from(distributions).where(eq(distributions.projectId, projectId)),
    db.select({ total: count() }).from(claims).innerJoin(allocations, eq(claims.allocationId, allocations.id)).innerJoin(distributions, eq(allocations.distributionId, distributions.id)).where(and(eq(distributions.projectId, projectId), eq(claims.status, "confirmed"))),
    db.select({ total: count() }).from(activationEvents).where(eq(activationEvents.projectId, projectId)),
    db.select({ total: count() }).from(identityAttestations).where(eq(identityAttestations.projectId, projectId)),
    db.select({ total: count() }).from(agentActions).where(eq(agentActions.projectId, projectId)),
    db.select({ total: count() }).from(evidenceReports).where(eq(evidenceReports.projectId, projectId)),
    db.select({ total: count() }).from(vestingBatches).where(eq(vestingBatches.projectId, projectId)),
  ]);
  const item = (id: string, label: string, detail: string, weight: number, rows: Array<{ total: number }>): Check => ({ id, label, detail, weight, count: rows[0]?.total ?? 0, complete: (rows[0]?.total ?? 0) > 0 });
  const checks = [
    item("api-key", "Create a scoped API key", "Authenticate a server, agent, or trusted integration.", 10, activeKey),
    item("authenticated-call", "Complete an authenticated request", "Prove the key is connected to a real integration.", 10, usedKey),
    item("webhook", "Enable a signed webhook", "Receive durable lifecycle events in your product.", 10, webhook),
    item("webhook-delivery", "Verify one webhook delivery", "Prove end-to-end event handling and replay safety.", 10, delivered),
    item("campaign", "Create a funded distribution", "Create a walletless USDC or project-token current.", 10, campaign),
    item("launch-vesting", "Commit a launch vesting schedule", "Prove a project-token or USDC allocation can be funded before authorizer-enforced unlocks.", 5, vesting),
    item("identity", "Attest an offchain identity", "Bind the user your product knows to an exact Arc wallet.", 10, identity),
    item("claim", "Confirm a walletless claim", "Settle a recipient allocation on Arc.", 15, confirmedClaim),
    item("activation", "Report a post-claim activation", "Measure the action that makes the user valuable.", 10, activation),
    item("agent", "Exercise an agent policy", "Optional proof that machine actions stay inside project limits.", 5, agent),
    item("evidence", "Freeze a grant evidence report", "Create a digest-verified reviewer artifact.", 5, evidence),
  ];
  const score = checks.reduce((total, check) => total + (check.complete ? check.weight : 0), 0);
  return { schemaVersion: "current-readiness-v1", projectId, score, level: score >= 90 ? "grant-ready" : score >= 65 ? "pilot-ready" : score >= 35 ? "integrating" : "foundation", completed: checks.filter(check => check.complete).length, total: checks.length, checks, next: checks.find(check => !check.complete) ?? null, generatedAt: new Date().toISOString() };
}
