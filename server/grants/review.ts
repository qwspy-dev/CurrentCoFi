import {
  createEvidenceReport,
  createUserEvidenceReport,
  evidenceDigest,
  getPublicEvidenceReport,
  listProjectEvidenceReports,
  listUserEvidenceReports,
} from "../evidence/reports.js";

export const GRANT_REVIEW_SCHEMA_VERSION = "current-grant-review-v1";

type EvidenceReport = Awaited<ReturnType<typeof getPublicEvidenceReport>>;

const officialCriteria = [
  {
    id: "platform-alignment",
    label: "Strong platform alignment",
    summary: "Arc is the settlement layer and Circle products are meaningful architectural building blocks.",
  },
  {
    id: "shipping-ability",
    label: "Exceptional team and shipping ability",
    summary: "A production-style application, public APIs, SDKs, contracts, and operational controls are already shipped.",
  },
  {
    id: "traction",
    label: "Traction and path to success",
    summary: "Campaign, wallet, claim, activation, commerce, pilot, and integration evidence is measured rather than asserted.",
  },
  {
    id: "ecosystem-impact",
    label: "Ecosystem impact",
    summary: "Other Arc projects can use hosted flows, APIs, React embeds, webhooks, and agent tools instead of rebuilding distribution infrastructure.",
  },
] as const;

const architecture = [
  { product: "Arc", role: "Campaign, claim, escrow, fee, liquidity, partner-reserve, and release settlement." },
  { product: "USDC", role: "Campaign funding, sponsored gas budgets, product fees, checkout, subscriptions, and crosschain funding." },
  { product: "Circle Wallets", role: "Embedded accounts created during walletless email or social onboarding." },
  { product: "CCTP", role: "Native burn-and-mint USDC funding routes into Arc campaigns." },
  { product: "Gateway", role: "Unified Balance deposits and direct Arc mint evidence for project funding." },
  { product: "Developer platform", role: "Signed APIs, TypeScript SDK, React embed, webhooks, and policy-bound agent tools." },
] as const;

const proposedMilestones = [
  {
    id: "external-pilots",
    title: "Prove external project activation",
    measurement: "Complete 5 named pilots, 1,000 successful claims, and signed partner attestations tied to public evidence reports.",
    dependsOn: "External Arc projects and real recipient participation",
  },
  {
    id: "independent-review",
    title: "Complete independent security review",
    measurement: "Publish auditor findings, remediate every critical or high issue, and attach the final report to the public security package.",
    dependsOn: "Independent security auditor",
  },
  {
    id: "mainnet-release",
    title: "Deploy the governed Arc mainnet release",
    measurement: "Bind every production address and runtime bytecode hash to one release manifest with delayed governance and rollback evidence.",
    dependsOn: "Arc mainnet and production Circle configuration",
  },
  {
    id: "ecosystem-scale",
    title: "Expand reusable distribution infrastructure",
    measurement: "Reach 25 integrated projects across hosted links, React embeds, SDK/API, webhooks, and agent-driven rewards.",
    dependsOn: "Grant-supported integrations and ecosystem adoption",
  },
] as const;

function numberFrom(record: Record<string, unknown> | undefined, key: string) {
  return Number(record?.[key] ?? 0);
}

async function packageFromEvidence(report: EvidenceReport) {
  const snapshot = report.snapshot as Record<string, unknown>;
  const project = snapshot.project as Record<string, unknown> | undefined;
  const network = snapshot.network as Record<string, unknown> | undefined;
  const readiness = snapshot.readiness as Record<string, unknown> | undefined;
  const totals = snapshot.totals as Record<string, unknown> | undefined;
  const criteria = Array.isArray(readiness?.criteria) ? readiness.criteria as Array<Record<string, unknown>> : [];
  const securityCriterion = criteria.find((item) => item.id === "security-review-readiness");
  const releaseCriterion = criteria.find((item) => item.id === "release-readiness");
  const missingProof = criteria.filter((item) => !item.passed).map((item) => ({
    id: String(item.id ?? "pending"),
    label: String(item.label ?? "Pending evidence"),
    evidence: String(item.evidence ?? "Not yet proven"),
  }));
  const packageBody = {
    schemaVersion: GRANT_REVIEW_SCHEMA_VERSION,
    evidence: {
      id: report.id,
      publicSlug: report.publicSlug,
      schemaVersion: report.schemaVersion,
      digest: report.digest,
      integrity: report.integrity ?? { valid: true, recalculatedDigest: report.digest },
      generatedAt: snapshot.generatedAt,
    },
    application: {
      project: String(project?.name ?? "Current CoFi"),
      website: String(project?.websiteUrl ?? "https://www.currentco.finance"),
      oneLiner: "Current CoFi turns offchain audiences into funded wallets and active token users through walletless USDC and project-token distribution on Arc.",
      problem: "Arc projects need users, but wallet installation, gas, addresses, fragmented identity, and unmeasured airdrops create a steep onboarding barrier.",
      solution: "Projects assign USDC or their own Arc token to an email, social identity, private link, or allowlist. Current verifies eligibility, creates an embedded wallet, sponsors the claim, and measures activation after distribution.",
      whyArc: "Arc is not an optional payment rail: campaign custody, claims, product fees, governed protocol reserves, and public proof settle on Arc while USDC remains the primary unit of account.",
      ecosystemValue: "One integration gives games, token communities, creators, launch platforms, merchants, and AI agents reusable walletless distribution infrastructure.",
    },
    officialCriteria,
    architecture,
    proof: {
      readinessScore: numberFrom(readiness, "score"),
      campaigns: numberFrom(totals, "campaigns"),
      targetedRecipients: numberFrom(totals, "recipients"),
      claims: numberFrom(totals, "claims"),
      walletsCreated: numberFrom(totals, "walletsCreated"),
      activations: numberFrom(totals, "activations"),
      activeApiKeys: numberFrom(totals, "activeApiKeys"),
      activeWebhooks: numberFrom(totals, "activeWebhooks"),
      pilots: numberFrom(totals, "pilots"),
      checkoutVolume: String(totals?.checkoutVolume ?? "0"),
      subscriptionVolume: String(totals?.subscriptionVolume ?? "0"),
      network: String(network?.name ?? "Arc testnet"),
      chainId: Number(network?.chainId ?? 0),
      usdcAddress: String(network?.usdcAddress ?? ""),
      campaignVaultAddress: network?.campaignVaultAddress ? String(network.campaignVaultAddress) : null,
      releaseReadiness: Boolean(releaseCriterion?.passed),
      securityPackageReady: Boolean(securityCriterion?.passed),
    },
    shipped: [
      "Walletless email/social onboarding with embedded Circle wallets and sponsored claims",
      "USDC and arbitrary Arc project-token campaigns with identity-bound and allowlist allocations",
      "CCTP and Gateway campaign funding evidence",
      "Referral attribution, signed activation events, campaign quality controls, and retention analytics",
      "Project-scoped Discovery acquisition funnels from anonymous attention to confirmed Arc claims and signed activations",
      "Prize-backed community bounties and commit-reveal walletless giveaways with privacy-safe evidence",
      "Merchant checkout, subscriber-approved recurring USDC, and milestone escrow",
      "TypeScript SDK, React embed, signed webhooks, API keys, and policy-bound AI agent runtime",
      "Governed $CURRENT fee routing, liquidity, partner reserves, venue qualification, and release rehearsal",
      "Public observability, security review package, pilot attestations, and immutable grant evidence",
    ],
    proposedMilestones,
    honestGaps: missingProof.length ? missingProof : [{
      id: "external-validation",
      label: "External validation remains required",
      evidence: "Independent audit, production mainnet deployment, and real external pilots cannot be self-attested by the Current CoFi team.",
    }],
    reviewerLinks: {
      product: "https://www.currentco.finance",
      developers: "https://www.currentco.finance/#/developers",
      security: "https://www.currentco.finance/#/security",
      operations: "https://www.currentco.finance/#/operations",
      launchReadiness: "https://www.currentco.finance/#/launch",
      repository: "https://github.com/qwspy-dev/CurrentCoFi",
      evidenceApi: `https://www.currentco.finance/api/v1/evidence/public?slug=${encodeURIComponent(report.publicSlug)}`,
    },
    privacy: "This package contains aggregate product metrics, public Arc anchors, and project-level evidence only. Recipient identities, login data, secrets, and private contact details are excluded.",
  };
  return { ...packageBody, digest: await evidenceDigest(packageBody) };
}

export async function getPublicGrantReview(publicSlug: string) {
  return packageFromEvidence(await getPublicEvidenceReport(publicSlug));
}

export async function createUserGrantReview(input: { userId: string; projectId: string; distributionId?: string }) {
  const report = await createUserEvidenceReport(input);
  return packageFromEvidence({ ...report, integrity: { valid: true, recalculatedDigest: report.digest } });
}

export async function listUserGrantReviews(userId: string) {
  return listUserEvidenceReports(userId);
}

export async function createDeveloperGrantReview(input: { projectId: string; distributionId?: string; createdByKeyId: string }) {
  const report = await createEvidenceReport(input);
  return packageFromEvidence({ ...report, integrity: { valid: true, recalculatedDigest: report.digest } });
}

export async function listDeveloperGrantReviews(projectId: string) {
  return listProjectEvidenceReports(projectId);
}
