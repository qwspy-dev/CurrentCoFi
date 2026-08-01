import { getReadiness } from "../config.js";

export type SecurityControl = {
  id: string;
  name: string;
  status: "implemented" | "pending-external-review";
  evidence: string;
};

const privilegedRoles = [
  { role: "Protocol owner", authority: "Queues governed protocol changes and rotates operational configuration.", boundary: "Production ownership is intended for a multisignature; high-impact actions pass through delayed governors." },
  { role: "Independent guardian", authority: "Cancels queued release, venue, liquidity, partner-vault, and buyback operations and can pause supported modules.", boundary: "Cannot execute queued operations or withdraw user distributions." },
  { role: "Claim authorizer", authority: "Signs wallet-bound claim authorizations after identity verification.", boundary: "Cannot redirect a signed claim, alter its amount, or withdraw escrowed assets." },
  { role: "Project administrator", authority: "Creates, funds, pauses, and recovers its own campaigns.", boundary: "Project-scoped access and allocation proofs prevent access to another workspace." },
  { role: "Scoped API or agent key", authority: "Performs only the actions and volumes granted by its project policy.", boundary: "HMAC signatures, timestamp tolerance, idempotency, rate limits, and human approval thresholds are enforced server-side." },
] as const;

const fundFlows = [
  { flow: "Campaign distribution", custody: "Project token or USDC is escrowed in a dedicated Arc vault.", release: "A recipient-bound signature or Merkle proof releases the exact allocation once; expiration enables recovery to the configured sender." },
  { flow: "Product fees", custody: "USDC is separated into buyback, gas, liquidity, and operations accounting buckets.", release: "Market execution is batched through an allowlisted adapter and governed constraints rather than occurring on every claim." },
  { flow: "Protocol liquidity", custody: "Paired $CURRENT and USDC reserves remain in a dedicated vault.", release: "Only approved adapters and delayed governance can deploy or remove positions; emergency idle withdrawal requires a paused vault." },
  { flow: "Partner reserves", custody: "Partner assets are segregated by token inside a dedicated reserve vault.", release: "Governed operations may fund fully specified campaign allocations or return idle reserves to the registered treasury." },
] as const;

export function getSecurityPosture() {
  const readiness = getReadiness();
  const controls: SecurityControl[] = [
    { id: "runtime-bytecode", name: "Exact runtime bytecode verification", status: "implemented", evidence: "The active release manifest binds every critical address to a versioned runtime code hash." },
    { id: "delayed-governance", name: "Delayed protocol governance", status: "implemented", evidence: "Buyback, liquidity, partner, venue, and release changes use public queues before execution." },
    { id: "guardian", name: "Independent cancellation and pause", status: "implemented", evidence: "A separate guardian can cancel queued changes and pause supported critical paths without gaining execution authority." },
    { id: "claim-replay", name: "Claim replay and redirect resistance", status: "implemented", evidence: "One-time claim state, recipient-bound authorizations, expirations, and domain-separated signatures are covered by adversarial tests." },
    { id: "identity-privacy", name: "Offchain identity privacy", status: "implemented", evidence: "Raw email and social identities are never placed onchain; only project-scoped hashes and wallet-bound attestations are used." },
    { id: "developer-auth", name: "Scoped developer and agent authorization", status: "implemented", evidence: "Keys are stored as hashes and requests enforce scopes, HMAC signatures, timestamp tolerance, idempotency, and server-side policy." },
    { id: "session-crypto", name: "Encrypted account sessions", status: "implemented", evidence: readiness.internalAuth ? "Production session encryption and internal authorization secrets are configured." : "The control exists but production configuration is incomplete." },
    { id: "operational-response", name: "Monitoring and incident response", status: "implemented", evidence: "Structured request logs, component health checks, scheduled monitoring, SLOs, and an incident ledger are live." },
    { id: "browser-boundary", name: "Browser security boundary", status: "implemented", evidence: "HSTS, frame denial, MIME sniffing protection, a restrictive base policy, no-referrer behavior, and permissions controls are deployed." },
    { id: "dependency-gate", name: "Dependency and security CI gate", status: "implemented", evidence: "Production dependency advisories and source-level baseline checks run in the repository security workflow." },
    { id: "external-audit", name: "Independent external smart-contract review", status: "pending-external-review", evidence: "The audit package is ready, but no independent auditor has issued a final report. Current CoFi does not claim otherwise." },
  ];
  const implemented = controls.filter((control) => control.status === "implemented").length;
  return {
    product: "Current CoFi",
    network: "Arc testnet",
    assurance: {
      internalReadinessScore: Math.round((implemented / (controls.length - 1)) * 100),
      implementedControls: implemented,
      totalInternalControls: controls.length - 1,
      externalAuditStatus: "pending",
      mainnetApproved: false,
      statement: "Security readiness is internally evidenced on Arc testnet. Mainnet approval requires independent review and remediation closure.",
    },
    controls,
    privilegedRoles,
    fundFlows,
    reviewPackage: {
      scope: "https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/security/audit-scope.json",
      threatModel: "https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/security-threat-model.md",
      invariants: "https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/security-invariants.md",
      auditorGuide: "https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/external-audit-package.md",
      disclosure: "https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/SECURITY.md",
      repository: "https://github.com/qwspy-dev/CurrentCoFi",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    },
    generatedAt: new Date().toISOString(),
  };
}
