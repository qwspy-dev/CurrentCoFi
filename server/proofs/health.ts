import { createHash } from "node:crypto";
import { getCampaignProofExplorer } from "../evidence/explorer.js";
import { integrationManifest } from "../developer/integration-readiness.js";
import { getNetworkProof } from "../network/proof.js";
import { getProjectTokenProof } from "../partners/project-token-proof.js";
import { getLaunchReadinessSnapshot } from "../releases/readiness.js";
import { getSecurityPosture } from "../security/posture.js";

type ProofCheck = {
  id: string;
  label: string;
  status: "verified" | "degraded" | "unavailable";
  statement: string;
  evidence: string | null;
  digest: string | null;
  externalGate: string | null;
};

const links = {
  network: "https://www.currentco.finance/#/network-proof",
  campaigns: "https://www.currentco.finance/#/proof-explorer",
  projectToken: "https://www.currentco.finance/#/project-token-proof",
  release: "https://www.currentco.finance/#/launch",
  security: "https://www.currentco.finance/#/security",
  integration: "https://www.currentco.finance/#/integration-lab",
  grantDossier: "https://www.currentco.finance/#/grant-dossier",
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function proofHealthDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function assembleProofHealth(input: {
  generatedAt: string;
  network: Awaited<ReturnType<typeof getNetworkProof>> | null;
  campaigns: Awaited<ReturnType<typeof getCampaignProofExplorer>> | null;
  projectToken: Awaited<ReturnType<typeof getProjectTokenProof>> | null;
  release: Awaited<ReturnType<typeof getLaunchReadinessSnapshot>> | null;
  integration: ReturnType<typeof integrationManifest>;
  security: ReturnType<typeof getSecurityPosture>;
}) {
  const releaseVerified = Boolean(input.release?.configured && input.release.readinessScore === 100 && input.release.release?.active && input.release.components.every((item) => item.valid && item.addressMatches));
  const projectTokenVerified = Boolean(input.projectToken?.readiness.complete && input.projectToken.readiness.verifiedStages === input.projectToken.readiness.stages && input.projectToken.settlement?.claimed && input.projectToken.settlement.state === "completed");
  const checks: ProofCheck[] = [
    {
      id: "network-record",
      label: "Verified network record",
      status: input.network?.configured && Boolean(input.network.digest) ? "verified" : input.network ? "degraded" : "unavailable",
      statement: input.network?.configured ? `${input.network.totals.campaigns} persisted campaigns and ${input.network.totals.confirmedClaims} confirmed claims are counted from verified records only.` : "The persisted Arc testnet record is not connected.",
      evidence: links.network,
      digest: input.network?.digest ?? null,
      externalGate: "External pilot traction remains separate from protocol-owned demonstrations.",
    },
    {
      id: "campaign-evidence",
      label: "Privacy-safe campaign evidence",
      status: input.campaigns?.configured && Boolean(input.campaigns.digest) ? "verified" : input.campaigns ? "degraded" : "unavailable",
      statement: input.campaigns?.configured ? `${input.campaigns.totals.campaigns} campaign records expose funding, settlement, activation, and recovery evidence without recipient identities.` : "Campaign evidence is not connected.",
      evidence: links.campaigns,
      digest: input.campaigns?.digest ?? null,
      externalGate: null,
    },
    {
      id: "project-token-settlement",
      label: "Arbitrary-token settlement",
      status: projectTokenVerified ? "verified" : input.projectToken ? "degraded" : "unavailable",
      statement: projectTokenVerified ? `${input.projectToken!.settlement!.totalAmount} CPT completed the governed reserve-to-recipient path with zero remaining.` : "The arbitrary ERC-20 settlement proof is incomplete.",
      evidence: links.projectToken,
      digest: input.projectToken?.digest ?? null,
      externalGate: "CPT has no monetary value and is not an external partner endorsement.",
    },
    {
      id: "release-integrity",
      label: "Release and bytecode integrity",
      status: releaseVerified ? "verified" : input.release ? "degraded" : "unavailable",
      statement: releaseVerified ? `${input.release!.components.length}/${input.release!.components.length} registered contracts match the reviewed addresses and runtime bytecode.` : "The active Arc release manifest did not pass every integrity check.",
      evidence: links.release,
      digest: input.release?.release?.manifestHash ? String(input.release.release.manifestHash) : null,
      externalGate: "This is an Arc testnet deployment rehearsal, not Arc mainnet approval.",
    },
    {
      id: "builder-interface",
      label: "Builder interface integrity",
      status: input.integration.digest && input.integration.endpoints.length >= 5 ? "verified" : "degraded",
      statement: `${input.integration.paths.length} integration paths and ${input.integration.endpoints.length} scoped endpoints are bound to one public manifest.`,
      evidence: links.integration,
      digest: input.integration.digest,
      externalGate: null,
    },
    {
      id: "security-boundary",
      label: "Security boundary",
      status: input.security.assurance.internalReadinessScore === 100 ? "verified" : "degraded",
      statement: `${input.security.assurance.implementedControls}/${input.security.assurance.totalInternalControls} internal controls are implemented; independent review is still explicitly pending.`,
      evidence: links.security,
      digest: proofHealthDigest({ controls: input.security.controls, reviewPackage: input.security.reviewPackage }),
      externalGate: "Independent smart-contract audit and remediation closure are still required.",
    },
  ];
  const verified = checks.filter((check) => check.status === "verified").length;
  const body = {
    schemaVersion: "current-grant-proof-health-v1",
    product: "Current CoFi",
    environment: "Arc testnet",
    generatedAt: input.generatedAt,
    status: verified === checks.length ? "healthy" : checks.some((check) => check.status === "unavailable") ? "unavailable" : "degraded",
    score: Math.round((verified / checks.length) * 100),
    verifiedChecks: verified,
    totalChecks: checks.length,
    boundary: "This record verifies Current CoFi's public testnet evidence surfaces and internal controls. It does not self-attest external pilots, an independent audit, legal approval, or Arc mainnet deployment.",
    checks,
    reviewerLinks: { ...links, api: "https://www.currentco.finance/api/v1/proof-health" },
    privacy: "Only aggregate testnet records, public transaction evidence, contract integrity, and published interface metadata are evaluated. Recipient identities, wallets, API keys, sessions, and private project records are excluded.",
  } as const;
  return { ...body, digest: proofHealthDigest(body) };
}

export async function getProofHealth() {
  const integration = integrationManifest();
  const security = getSecurityPosture();
  const [networkResult, campaignResult, releaseResult] = await Promise.allSettled([
    getNetworkProof(),
    getCampaignProofExplorer(),
    getLaunchReadinessSnapshot(),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  const [projectTokenResult] = await Promise.allSettled([getProjectTokenProof()]);
  return assembleProofHealth({
    generatedAt: new Date().toISOString(),
    network: networkResult.status === "fulfilled" ? networkResult.value : null,
    campaigns: campaignResult.status === "fulfilled" ? campaignResult.value : null,
    release: releaseResult.status === "fulfilled" ? releaseResult.value : null,
    projectToken: projectTokenResult.status === "fulfilled" ? projectTokenResult.value : null,
    integration,
    security,
  });
}
