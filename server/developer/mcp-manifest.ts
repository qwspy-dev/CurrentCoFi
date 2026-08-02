import { createHash } from "node:crypto";

const body = {
  schemaVersion: "current-mcp-v1",
  protocol: "Model Context Protocol",
  protocolRevision: "2026-07-28",
  product: "Current CoFi",
  network: "Arc testnet",
  package: "@currentcofi/mcp",
  version: "0.1.0",
  transport: "stdio",
  distribution: {
    sourceReady: true,
    registryStatus: "publication-required",
    localCommand: "node packages/mcp/dist/index.js",
    futureRegistryCommand: "npx -y @currentcofi/mcp",
  },
  defaultMode: "read-only",
  message: "Turn offchain audiences into funded wallets and active token users through policy-bound agent tools.",
  tools: [
    { name: "current_get_proof_health", access: "public", kind: "read", purpose: "Verify live grant evidence and external boundaries." },
    { name: "current_get_network_proof", access: "public", kind: "read", purpose: "Read privacy-safe Arc testnet traction." },
    { name: "current_get_grant_application", access: "public", kind: "read", purpose: "Read the canonical Circle application packet." },
    { name: "current_get_integration_manifest", access: "public", kind: "read", purpose: "Discover builder integration paths." },
    { name: "current_get_campaign_analytics", access: "scoped-project-key", kind: "read", purpose: "Read project activation outcomes." },
    { name: "current_propose_reward_distribution", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_DISTRIBUTION", purpose: "Propose a policy-bound walletless reward campaign." },
    { name: "current_submit_activation", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_ACTIVATION", purpose: "Attribute a verified post-claim action." },
  ],
  safety: {
    projectModeRequires: ["CURRENT_MCP_MODE=project", "CURRENT_API_KEY", "CURRENT_SIGNING_SECRET"],
    maxRecipients: { default: 25, hardMaximum: 500 },
    mutations: ["Exact approval phrase", "HMAC-signed request", "Stable idempotency key where value movement is proposed", "Existing Current agent policy evaluation"],
    custody: "The MCP server never receives wallet private keys or seed phrases.",
    settlementBoundary: "approval_required and awaiting_settlement do not mean funds moved; completed requires Arc transaction evidence.",
    distributionBoundary: "The tested package is available in the public repository; npm registry publication is an external release step.",
  },
  source: "https://github.com/qwspy-dev/CurrentCoFi/tree/codex/sdk-embeds/packages/mcp",
  documentation: "https://www.currentco.finance/#/developers",
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function mcpManifest() {
  return { ...body, digest: createHash("sha256").update(stable(body)).digest("hex") };
}
