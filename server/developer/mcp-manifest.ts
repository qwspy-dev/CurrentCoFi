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
    { name: "current_get_programmable_commerce", access: "scoped-project-key", kind: "read", purpose: "Read checkout links, atomic split receipts, affiliate payouts, and customer USDC rewards." },
    { name: "current_propose_programmable_checkout", access: "scoped-agent-key", kind: "write", approval: "I_APPROVE_CURRENT_CHECKOUT", purpose: "Propose a policy-bound walletless checkout without granting the agent custody or payment authority." },
    { name: "current_list_campaign_deliveries", access: "scoped-project-key", kind: "read", purpose: "Recover authorized encrypted private claim links and their handoff state." },
    { name: "current_record_campaign_handoff", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_DELIVERY_HANDOFF", purpose: "Record an operator-prepared private claim handoff without asserting third-party delivery." },
    { name: "current_list_community_bounties", access: "scoped-project-key", kind: "read", purpose: "Read prize custody, masked submissions, and bounty awards." },
    { name: "current_create_community_bounty", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_BOUNTY", purpose: "Prepare a prize-backed community bounty for authorized wallet funding." },
    { name: "current_list_verifiable_giveaways", access: "scoped-project-key", kind: "read", purpose: "Read funded giveaways, referrals, commitments, and deterministic draw proof." },
    { name: "current_create_verifiable_giveaway", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_GIVEAWAY", purpose: "Precommit randomness and prepare a walletless USDC or project-token giveaway." },
    { name: "current_list_public_mass_drops", access: "scoped-project-key", kind: "read", purpose: "Read capped pools, reservations, claims, and referral attribution." },
    { name: "current_create_public_mass_drop", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_PUBLIC_DROP", purpose: "Prepare a fully funded first-come walletless USDC or project-token pool." },
    { name: "current_list_launch_vesting", access: "scoped-project-key", kind: "read", purpose: "Read funded vesting batches, masked recipients, unlocks, and claims." },
    { name: "current_create_launch_vesting", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_VESTING", purpose: "Prepare identity-bound, time-locked USDC or project-token launch allocations." },
    { name: "current_get_community_treasury", access: "scoped-project-key", kind: "read", purpose: "Read budgets, proposals, and Arc payment receipts." },
    { name: "current_create_treasury_proposal", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_TREASURY_PROPOSAL", purpose: "Create a transparent non-custodial spending proposal." },
    { name: "current_propose_reward_distribution", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_DISTRIBUTION", purpose: "Propose a policy-bound walletless reward campaign." },
    { name: "current_submit_activation", access: "scoped-project-key", kind: "write", approval: "I_APPROVE_CURRENT_ACTIVATION", purpose: "Attribute a verified post-claim action." },
  ],
  safety: {
    projectModeRequires: ["CURRENT_MCP_MODE=project", "CURRENT_API_KEY", "CURRENT_SIGNING_SECRET"],
    maxRecipients: { default: 25, hardMaximum: 500 },
    mutations: ["Exact approval phrase", "HMAC-signed request", "Stable idempotency key where value movement is proposed", "Existing Current agent policy evaluation", "Authorized Circle wallet funding before a bounty opens"],
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
