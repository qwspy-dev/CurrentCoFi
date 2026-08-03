import { createHash } from "node:crypto";
import { getGrantDossier, type GrantDossier } from "./dossier.js";

const officialGrantSource = {
  name: "Circle Developer Grants",
  url: "https://www.circle.com/grant",
  applicationUrl: "https://www.circle.com/grant/application",
  researchedAt: "2026-08-01",
  applicationWindowObserved: "closed-check-back-soon",
  criteria: [
    "Strong platform alignment",
    "Exceptional teams and proven shipping ability",
    "Traction and a credible path to success",
    "Ecosystem impact and expanded USDC utility",
  ],
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function answer(id: string, prompt: string, response: string, evidence: string[]) {
  return { id, prompt, response, wordCount: countWords(response), evidence };
}

export function applicationPacketDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function buildGrantApplicationPacket(input: { generatedAt: string; dossier: GrantDossier }) {
  const { dossier } = input;
  const totals = dossier.liveProof.network.totals;
  const applicationAnswers = [
    answer(
      "project-overview",
      "What are you building?",
      "Current CoFi is Arc-native walletless distribution and activation infrastructure. Projects assign USDC or their own Arc token to an email, social identity, game account, private link, or allowlist before the recipient has a wallet. Current verifies eligibility, creates an embedded Circle wallet, sponsors the claim, settles value on Arc, and measures which recipients become active and retained users. The same flow is available through hosted pages, APIs, a TypeScript SDK, React embeds, signed webhooks, and policy-bound agent tools.",
      [dossier.reviewerLinks.product, dossier.reviewerLinks.reviewerDemo, dossier.reviewerLinks.developers],
    ),
    answer(
      "problem",
      "What problem does the product solve?",
      "Arc projects can have followers, players, customers, or contributors without having wallet addresses for them. Existing airdrops assume recipients already understand wallets and gas, then measure tokens sent instead of useful behavior after a claim. That creates onboarding abandonment, bot-heavy distribution, fragmented identity checks, and no reliable link between campaign spending and retained users. Current removes the wallet prerequisite while keeping allocations fully funded, claims inspectable, recipient data private, and activation attributable.",
      [dossier.reviewerLinks.campaignProofs, dossier.reviewerLinks.networkProof],
    ),
    answer(
      "platform-alignment",
      "Why are Arc and Circle core to the product?",
      "Arc is Current CoFi's settlement and coordination layer, not an optional chain choice. Campaign vaults, claims, fee routing, partner reserves, liquidity controls, and release proofs are designed for Arc. USDC is the primary unit for campaign funding, gas budgets, fees, checkout, subscriptions, and crosschain settlement. Circle Wallets create embedded recipient accounts; Gas Station removes claim friction; CCTP provides native burn-and-mint funding routes; Gateway supports unified USDC balances and direct Arc minting. Removing this stack would break the intended product flow rather than merely change a payment method.",
      [dossier.reviewerLinks.launchReadiness, dossier.reviewerLinks.projectTokenProof, dossier.reviewerLinks.integrationManifest],
    ),
    answer(
      "shipping",
      "What has the team already shipped?",
      "Current CoFi has shipped a production-style Arc testnet platform spanning walletless USDC and arbitrary ERC-20 claims, a verified multi-asset recipient portfolio, unified settlement activity, fully funded campaigns, embedded wallet onboarding, sponsored settlement, campaign recovery, referrals, signed activation events, retention analytics, merchant checkout, subscriptions, milestone escrow, CCTP and Gateway funding, developer APIs, SDKs, React embeds, durable webhooks, and an installable MCP server with seven tested, policy-bound agent tools. Governed token-economy contracts, operational monitoring, and public security and release evidence are also live. Public proof endpoints expose canonical digests, deployed addresses, runtime-bytecode checks, settlement transactions, and privacy-safe aggregate usage.",
      [dossier.reviewerLinks.repository, dossier.reviewerLinks.openapi, dossier.reviewerLinks.proofHealth],
    ),
    answer(
      "traction",
      "What traction or credible path to success can you demonstrate?",
      `Current publishes only persisted, verified Arc testnet records: ${totals.projects} project workspaces, ${totals.campaigns} campaigns, ${totals.recipientsTargeted} targeted recipients, ${totals.confirmedClaims} confirmed claims, ${totals.fundedWallets} funded wallets, and ${totals.activatedUsers} distinct activated users at the time this packet was generated. These figures prove the complete internal product loop but are not presented as external partner traction. The next measurable step is five named Arc pilots, 1,000 confirmed claims, signed partner attestations, and public claim-to-activation funnels. A pilot intake and evidence system is already shipped so external usage can be verified instead of asserted.`,
      [dossier.reviewerLinks.networkProof, dossier.reviewerLinks.campaignProofs, dossier.reviewerLinks.reviewerDemo],
    ),
    answer(
      "ecosystem-impact",
      "How does this strengthen Arc and expand USDC utility?",
      "Current gives every Arc game, token community, creator platform, marketplace, and AI agent one reusable way to turn an offchain audience into funded wallets and measurable users. Each integration can create embedded wallets, sponsored Arc claims, USDC campaign balances, project-token settlement, referrals, activation events, and repeat transactions without rebuilding identity, custody, attribution, and recovery infrastructure. This creates a distribution surface for other Arc builders, increases practical USDC movement, and makes launches accountable to activation and retention rather than raw airdrop volume.",
      [dossier.reviewerLinks.developers, dossier.reviewerLinks.integrationManifest, dossier.reviewerLinks.mcpManifest, dossier.reviewerLinks.openapi],
    ),
    answer(
      "business-model",
      "What is the business model?",
      "Personal claims can remain free or near cost. Commercial revenue comes from project campaign fees, successful-claim fees, sponsored-gas budgets, advanced analytics, promoted placement, branded experiences, API usage, merchant checkout, subscriptions, escrow, crosschain funding, and enterprise integrations. Fees are denominated primarily in USDC. The protocol includes a transparent governed fee router for any product-fee allocation to the $CURRENT economy, but production token mechanics, public liquidity, and launch disclosures remain subject to qualified legal review before activation.",
      [dossier.reviewerLinks.product, dossier.reviewerLinks.security, dossier.reviewerLinks.operations],
    ),
    answer(
      "use-of-grant",
      "What would grant support unlock?",
      "Grant support would accelerate work that converts the shipped testnet platform into externally validated Arc infrastructure: onboarding and supporting five pilot projects, subsidizing their first walletless distributions, completing an independent smart-contract review and remediation cycle, hardening Circle integrations for production, preparing the governed Arc mainnet release, publishing integration examples, and expanding the SDK, embeds, agent tools, documentation, and partner support needed to reach 25 active project integrations. A final funding amount and milestone disbursement schedule should be agreed with Circle rather than invented in advance.",
      [dossier.reviewerLinks.security, dossier.reviewerLinks.launchReadiness, dossier.reviewerLinks.developers],
    ),
  ];

  const packetBody = {
    schemaVersion: "current-circle-grant-application-v1",
    product: "Current CoFi",
    environment: "Arc testnet",
    generatedAt: input.generatedAt,
    status: "submission-ready-pending-applicant-and-external-input",
    boundary: "This packet is a verified submission draft. It does not claim an open application window, external pilots, an independent audit, token legal approval, Arc mainnet deployment, or a Circle endorsement.",
    officialGrantSource,
    executiveSummary: dossier.application.oneLiner,
    applicationAnswers,
    architecture: dossier.architecture,
    shipped: dossier.shipped,
    evidenceSnapshot: {
      networkDigest: dossier.liveProof.network.digest,
      projects: totals.projects,
      campaigns: totals.campaigns,
      targetedRecipients: totals.recipientsTargeted,
      confirmedClaims: totals.confirmedClaims,
      fundedWallets: totals.fundedWallets,
      activatedUsers: totals.activatedUsers,
      releaseReadinessScore: dossier.liveProof.release.readinessScore,
      verifiedReleaseComponents: dossier.liveProof.release.verifiedComponents,
      releaseComponentCount: dossier.liveProof.release.componentCount,
      securityReadinessScore: dossier.liveProof.security.internalReadinessScore,
      externalAuditStatus: dossier.liveProof.security.externalAuditStatus,
      integrationDigest: dossier.liveProof.integration.digest,
      projectTokenComplete: dossier.liveProof.projectToken?.complete ?? false,
      dossierDigest: dossier.digest,
    },
    proposedMilestones: dossier.proposedGrantMilestones.map((milestone, index) => ({
      ...milestone,
      sequence: index + 1,
      acceptanceEvidence: index === 0
        ? ["Named pilot attestations", "Confirmed claim transactions", "Public activation funnels"]
        : index === 1
          ? ["Independent final report", "Remediation commit", "Passing adversarial regression suite"]
          : index === 2
            ? ["Mainnet release manifest", "Runtime bytecode verification", "Governance and rollback evidence"]
            : ["25 certified integrations", "Public integration manifests", "Aggregate usage report"],
    })),
    externalGates: dossier.externalGates,
    applicantInputs: [
      { id: "founder-profile", label: "Founder and team biographies", reason: "Only the applicants can provide accurate professional backgrounds and ownership details." },
      { id: "legal-entity", label: "Legal entity and jurisdiction", reason: "Entity details and applicable screenings must come from the applicants." },
      { id: "funding-request", label: "Requested USDC amount", reason: "The amount should follow pilot, audit, and mainnet cost estimates and Circle milestone design." },
      { id: "contact-details", label: "Applicant contact information", reason: "Private contact data is intentionally excluded from this public packet." },
    ],
    submissionChecklist: {
      internallyComplete: ["Product narrative", "Arc and Circle architecture", "Shipped scope", "Public testnet evidence", "Measurable milestones", "External-gap register", "Technical review links"],
      awaitingApplicant: ["Founder biographies", "Legal entity", "Private contact details", "Requested amount"],
      awaitingExternal: ["Application window reopening", "Named pilots", "Independent audit", "Arc mainnet production availability", "$CURRENT legal review"],
    },
    reviewerLinks: dossier.reviewerLinks,
    privacy: dossier.privacy,
  };
  return { ...packetBody, digest: applicationPacketDigest(packetBody) };
}

export type GrantApplicationPacket = ReturnType<typeof buildGrantApplicationPacket>;

export function grantApplicationMarkdown(packet: GrantApplicationPacket) {
  const lines = [
    "# Current CoFi — Circle Developer Grant Application Packet",
    "",
    `Generated: ${packet.generatedAt}`,
    `Environment: ${packet.environment}`,
    `Integrity digest: ${packet.digest}`,
    "",
    `> ${packet.boundary}`,
    "",
    "## Executive summary",
    "",
    packet.executiveSummary,
    "",
    ...packet.applicationAnswers.flatMap((item) => [
      `## ${item.prompt}`,
      "",
      item.response,
      "",
      `Evidence: ${item.evidence.join(" · ")}`,
      "",
    ]),
    "## Proposed milestones",
    "",
    ...packet.proposedMilestones.flatMap((item) => [
      `### ${item.sequence}. ${item.title}`,
      "",
      item.measurement,
      "",
      `Acceptance evidence: ${item.acceptanceEvidence.join("; ")}`,
      "",
    ]),
    "## Applicant inputs still required",
    "",
    ...packet.applicantInputs.map((item) => `- **${item.label}:** ${item.reason}`),
    "",
    "## Reviewer links",
    "",
    ...Object.entries(packet.reviewerLinks).map(([label, url]) => `- **${label}:** ${url}`),
    "",
    `Privacy: ${packet.privacy}`,
  ];
  return lines.join("\n");
}

export async function getGrantApplicationPacket() {
  return buildGrantApplicationPacket({ generatedAt: new Date().toISOString(), dossier: await getGrantDossier() });
}
