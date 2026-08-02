import { createHash } from "node:crypto";
import { integrationManifest } from "../developer/integration-readiness.js";
import { getNetworkProof, type NetworkProof } from "../network/proof.js";
import { getLaunchReadinessSnapshot } from "../releases/readiness.js";
import { getSecurityPosture } from "../security/posture.js";
import { getProjectTokenProof } from "../partners/project-token-proof.js";

type LaunchSnapshot = Awaited<ReturnType<typeof getLaunchReadinessSnapshot>>;

const application = {
  oneLiner: "Current CoFi turns offchain audiences into funded wallets and active token users through walletless USDC and project-token distribution on Arc.",
  problem: "Arc projects may already have players, customers, followers, or contributors, but most of those people do not have an Arc wallet, gas, or a safe claim path. Traditional airdrops require wallet lists and measure distribution rather than useful post-claim behavior.",
  solution: "A project assigns USDC or its Arc token to an email, social identity, private link, game account, or allowlist. Current verifies eligibility, creates an embedded wallet, sponsors the claim, settles it on Arc, and attributes activation and retention back to the campaign.",
  ecosystemValue: "Hosted claims, APIs, SDKs, React embeds, signed webhooks, and policy-bound agent tools let other Arc builders add walletless distribution without rebuilding the financial and identity infrastructure.",
} as const;

const criteria = [
  { id: "alignment", label: "Arc and Circle alignment", statement: "Arc settlement, USDC funding, Circle embedded wallets, gas sponsorship, CCTP, and Gateway are structural product dependencies.", proof: ["network-proof", "integration-manifest", "release-readiness"] },
  { id: "execution", label: "Shipping ability", statement: "The product includes deployed contracts, consumer and project interfaces, public APIs, an SDK, React embeds, agent tools, security controls, and operational evidence.", proof: ["repository", "openapi", "security"] },
  { id: "traction", label: "Traction and path to success", statement: "Only persisted testnet projects, campaigns, confirmed claims, funded wallets, and distinct activated users are shown as traction.", proof: ["network-proof", "public-evidence"] },
  { id: "impact", label: "Ecosystem impact", statement: "Games, communities, token projects, launch platforms, merchants, and agents can integrate one reusable activation layer.", proof: ["developers", "integration-manifest", "agent-tools"] },
] as const;

const shipped = [
  { id: "walletless-claims", label: "Walletless USDC and project-token claims", detail: "Identity-bound and allowlist claims create embedded wallets and sponsor Arc settlement." },
  { id: "campaigns", label: "Fully funded distribution campaigns", detail: "Merkle allocations, expirations, refunds, recipient management, referral attribution, and activation analytics." },
  { id: "circle-funding", label: "Circle-native funding paths", detail: "CCTP V2 and Gateway intent, signing, direct mint, campaign-vault settlement, and public transaction evidence." },
  { id: "developer-platform", label: "Reusable builder infrastructure", detail: "HMAC APIs, TypeScript SDK, React embed, durable webhooks, identity adapters, and integration certification." },
  { id: "agent-runtime", label: "Policy-bound AI agent payments", detail: "Scoped actions, spending limits, human approvals, Circle wallet challenges, and settlement evidence." },
  { id: "operations", label: "Production-style assurance", detail: "Release manifests, runtime bytecode checks, delayed governance, incident response, security package, and proof APIs." },
] as const;

const externalGates = [
  { id: "pilots", label: "External pilots", status: "outside-validation-required", target: "Five named Arc projects, 1,000 successful claims, and signed partner attestations." },
  { id: "audit", label: "Independent security review", status: "outside-validation-required", target: "Publish findings and remediate every critical or high-severity issue." },
  { id: "mainnet", label: "Arc mainnet release", status: "external-network-required", target: "Deploy the reviewed manifest after Arc mainnet and production Circle support are official." },
  { id: "legal", label: "$CURRENT legal review", status: "specialist-review-required", target: "Finalize token mechanics and launch disclosures with qualified counsel before any public sale or liquidity." },
] as const;

const links = {
  product: "https://www.currentco.finance",
  networkProof: "https://www.currentco.finance/#/network-proof",
  networkProofApi: "https://www.currentco.finance/api/v1/network-proof",
  campaignProofs: "https://www.currentco.finance/#/proof-explorer",
  campaignProofsApi: "https://www.currentco.finance/api/v1/campaign-proofs",
  reviewerDemo: "https://www.currentco.finance/#/reviewer-demo",
  reviewerDemoApi: "https://www.currentco.finance/api/v1/reviewer-demo",
  projectTokenProof: "https://www.currentco.finance/#/project-token-proof",
  projectTokenProofApi: "https://www.currentco.finance/api/v1/project-token-proof",
  proofHealth: "https://www.currentco.finance/#/proof-health",
  proofHealthApi: "https://www.currentco.finance/api/v1/proof-health",
  developers: "https://www.currentco.finance/#/developers",
  integrationManifest: "https://www.currentco.finance/api/v1/integration-manifest",
  openapi: "https://www.currentco.finance/api/v1/openapi",
  security: "https://www.currentco.finance/#/security",
  securityApi: "https://www.currentco.finance/api/v1/security",
  launchReadiness: "https://www.currentco.finance/#/launch",
  operations: "https://www.currentco.finance/#/operations",
  repository: "https://github.com/qwspy-dev/CurrentCoFi",
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function dossierDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function buildGrantDossier(input: {
  generatedAt: string;
  network: NetworkProof;
  launch: LaunchSnapshot | null;
  launchError?: string | null;
  projectToken?: Awaited<ReturnType<typeof getProjectTokenProof>> | null;
  projectTokenError?: string | null;
}) {
  const security = getSecurityPosture();
  const manifest = integrationManifest();
  const body = {
    schemaVersion: "current-public-grant-dossier-v1",
    product: "Current CoFi",
    environment: "Arc testnet",
    generatedAt: input.generatedAt,
    boundary: "This dossier proves internally and publicly verifiable testnet work. It does not claim an external audit, Arc mainnet deployment, token legal approval, or external pilot traction.",
    application,
    criteria,
    architecture: [
      { product: "Arc", role: "Campaign custody, claim settlement, fee routing, liquidity controls, partner reserves, and release proof." },
      { product: "USDC", role: "Campaign funding, gas budgets, product fees, checkout, subscriptions, and crosschain settlement." },
      { product: "Circle Wallets", role: "Embedded accounts created during walletless recipient onboarding." },
      { product: "CCTP V2", role: "Native USDC burn-and-mint routes into Arc campaign vaults." },
      { product: "Gateway", role: "Unified Balance funding and direct Arc mint evidence." },
      { product: "Current developer platform", role: "APIs, SDKs, embeds, webhooks, identity adapters, analytics, and agent tools." },
    ],
    shipped,
    liveProof: {
      network: input.network,
      release: input.launch ? {
        available: true,
        configured: input.launch.configured,
        readinessScore: input.launch.readinessScore,
        active: Boolean(input.launch.release?.active),
        verifiedComponents: input.launch.components.filter((item) => item.valid && item.addressMatches).length,
        componentCount: input.launch.components.length,
        proofMode: input.launch.proofMode ?? "Arc testnet release verification",
      } : { available: false, configured: false, readinessScore: 0, active: false, verifiedComponents: 0, componentCount: 0, proofMode: input.launchError ?? "Release proof unavailable" },
      security: {
        internalReadinessScore: security.assurance.internalReadinessScore,
        implementedControls: security.assurance.implementedControls,
        externalAuditStatus: security.assurance.externalAuditStatus,
        mainnetApproved: security.assurance.mainnetApproved,
        commit: security.reviewPackage.commit,
      },
      integration: {
        digest: manifest.digest,
        paths: manifest.paths.length,
        endpoints: manifest.endpoints.length,
        circleStack: manifest.circleStack,
      },
      projectToken: input.projectToken ? {
        available: true,
        proofMode: input.projectToken.proofMode,
        complete: input.projectToken.readiness.complete,
        verifiedStages: input.projectToken.readiness.verifiedStages,
        stages: input.projectToken.readiness.stages,
        symbol: input.projectToken.asset?.symbol ?? null,
        deposited: input.projectToken.asset?.totalDeposited ?? "0",
        campaignFunded: input.projectToken.asset?.totalCampaignFunded ?? "0",
        recipientCapacity: input.projectToken.campaign?.recipientCount ?? 0,
        claimEvidence: input.projectToken.settlement?.claimEvidence ?? "unavailable",
        settlementClaimed: input.projectToken.settlement?.claimed ?? false,
        settlementAmount: input.projectToken.settlement?.totalAmount ?? "0",
        settlementTransactionHash: input.projectToken.settlement?.claimTransactionHash ?? null,
        digest: input.projectToken.digest,
        boundary: input.projectToken.boundary,
      } : { available: false, complete: false, verifiedStages: 0, stages: 5, proofMode: input.projectTokenError ?? "Project-token proof unavailable" },
    },
    externalGates,
    proposedGrantMilestones: [
      { id: "pilot-cohort", title: "External activation pilots", measurement: "5 named pilots, 1,000 confirmed claims, signed attestations, and published claim-to-activation funnels." },
      { id: "independent-audit", title: "Independent contract review", measurement: "Public final report with all critical and high findings remediated and re-tested." },
      { id: "mainnet-release", title: "Governed Arc mainnet deployment", measurement: "Production addresses and runtime code hashes bound to one delayed, guardian-protected release manifest." },
      { id: "ecosystem-scale", title: "Builder distribution network", measurement: "25 active project integrations spanning hosted claims, embeds, SDK/API, webhooks, and agent rewards." },
    ],
    reviewerLinks: links,
    privacy: "Only aggregate network counts, public contract evidence, source-code references, and product-level assertions are included. Recipient identities, wallet addresses, API keys, private pilot contacts, and account data are excluded.",
  };
  return { ...body, digest: dossierDigest(body) };
}

export async function getGrantDossier() {
  const [networkResult, launchResult] = await Promise.allSettled([getNetworkProof(), getLaunchReadinessSnapshot()]);
  // Arc's public testnet RPC is intentionally conservative. Keep the heavier
  // partner-vault reads out of the release-verification burst so the dossier
  // remains complete even when the provider applies per-second limits.
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  const [projectTokenResult] = await Promise.allSettled([getProjectTokenProof()]);
  const network = networkResult.status === "fulfilled" ? networkResult.value : await getNetworkProof();
  return buildGrantDossier({
    generatedAt: new Date().toISOString(),
    network,
    launch: launchResult.status === "fulfilled" ? launchResult.value : null,
    launchError: launchResult.status === "rejected" ? "Arc release verification is temporarily unavailable." : null,
    projectToken: projectTokenResult.status === "fulfilled" ? projectTokenResult.value : null,
    projectTokenError: projectTokenResult.status === "rejected" ? "Arc project-token verification is temporarily unavailable." : null,
  });
}
