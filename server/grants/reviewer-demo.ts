import { createHash } from "node:crypto";
import { integrationManifest } from "../developer/integration-readiness.js";
import { getCampaignProofExplorer } from "../evidence/explorer.js";
import { getNetworkProof } from "../network/proof.js";

type CampaignExplorer = Awaited<ReturnType<typeof getCampaignProofExplorer>>;
type NetworkProof = Awaited<ReturnType<typeof getNetworkProof>>;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function reviewerDemoDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function buildReviewerDemo(input: {
  generatedAt: string;
  explorer: CampaignExplorer;
  network: NetworkProof;
  manifest: ReturnType<typeof integrationManifest>;
}) {
  const ranked = [...input.explorer.campaigns].sort((a, b) => {
    const score = (campaign: typeof a) => Number(Boolean(campaign.anchors.fundingTransactionHash)) * 4 + campaign.settlement.claimTransactions.length * 3 + campaign.activation.events * 2 + campaign.identity.attestations;
    return score(b) - score(a);
  });
  const campaign = ranked[0] ?? null;
  const fundingHash = campaign?.anchors.fundingTransactionHash ?? null;
  const settlementHash = campaign?.settlement.claimTransactions[0]?.hash ?? null;
  const runSeed = `${campaign?.digest ?? input.explorer.digest}:${input.manifest.digest}`;
  const replayId = `R-${reviewerDemoDigest(runSeed).slice(0, 12).toUpperCase()}`;
  const stages = [
    {
      id: "campaign-funded", index: 1, label: "Campaign funded", actor: "Arc campaign vault",
      status: fundingHash ? "verified-live-anchor" : "capability-verified",
      explanation: fundingHash ? "A persisted campaign funding transaction anchors the reward pool on Arc testnet." : "The campaign record exists, but no public funding hash is available for this replay.",
      evidence: { proofRef: campaign?.proofRef ?? null, transactionHash: fundingHash, merkleRoot: campaign?.anchors.merkleRoot ?? null },
    },
    {
      id: "wallet-created", index: 2, label: "Walletless account created", actor: "Circle embedded wallets",
      status: input.network.totals.fundedWallets > 0 ? "verified-aggregate-record" : "capability-verified",
      explanation: "The replay renders the no-wallet recipient path. Public proof exposes only the distinct funded-wallet count; no wallet or identity is disclosed.",
      evidence: { fundedWallets: input.network.totals.fundedWallets, privacyMode: "aggregate-only" },
    },
    {
      id: "claim-settled", index: 3, label: "Claim settled", actor: "Arc claim contract",
      status: settlementHash ? "verified-live-anchor" : "capability-verified",
      explanation: settlementHash ? "A confirmed recipient claim has a public Arc testnet settlement transaction." : "The selected campaign has no confirmed public settlement transaction yet.",
      evidence: { transactionHash: settlementHash, confirmedClaims: campaign?.settlement.confirmedClaims ?? 0, asset: campaign?.asset.symbol ?? null },
    },
    {
      id: "activation-attributed", index: 4, label: "Activation attributed", actor: "Current attribution API",
      status: (campaign?.activation.events ?? 0) > 0 ? "verified-aggregate-record" : "capability-verified",
      explanation: "A project-signed post-claim event advances the user from token recipient to measurable active user without publishing the user ID.",
      evidence: { events: campaign?.activation.events ?? 0, distinctUsers: campaign?.activation.distinctUsers ?? 0, eventTypes: campaign?.activation.eventTypes ?? {} },
    },
    {
      id: "proof-generated", index: 5, label: "Evidence generated", actor: "Public proof layer",
      status: campaign ? "digest-verified" : "capability-verified",
      explanation: "The campaign and network snapshots are canonicalized and hashed so a reviewer can detect any changed evidence.",
      evidence: { campaignDigest: campaign?.digest ?? null, explorerDigest: input.explorer.digest, networkDigest: input.network.digest },
    },
  ] as const;
  const verifiedStages = stages.filter((stage) => stage.status !== "capability-verified").length;
  const body = {
    schemaVersion: "current-reviewer-demo-v1" as const,
    product: "Current CoFi" as const,
    environment: "Arc testnet" as const,
    generatedAt: input.generatedAt,
    replayId,
    mode: "non-mutating-verified-replay" as const,
    boundary: "This experience replays persisted testnet evidence and product behavior. It does not create a new wallet, campaign, claim, activation, or transaction, and it does not count replay interactions as traction.",
    story: {
      headline: "One audience member becomes one funded, measurable user.",
      recipient: "Anonymous community member",
      project: "Anonymous Arc project",
      asset: campaign?.asset.symbol ?? "USDC",
      amountAtomic: campaign?.asset.claimedAmountAtomic ?? "0",
      decimals: campaign?.asset.decimals ?? 6,
      proofRef: campaign?.proofRef ?? null,
    },
    readiness: { stages: stages.length, verifiedStages, complete: verifiedStages === stages.length },
    stages,
    liveContext: {
      campaigns: input.network.totals.campaigns,
      confirmedClaims: input.network.totals.confirmedClaims,
      fundedWallets: input.network.totals.fundedWallets,
      activatedUsers: input.network.totals.activatedUsers,
      networkDigest: input.network.digest,
      integrationDigest: input.manifest.digest,
    },
    reviewerActions: [
      { id: "open-funding", label: "Open campaign funding on ArcScan", url: fundingHash ? `${input.explorer.explorerUrl}/tx/${fundingHash}` : null },
      { id: "open-settlement", label: "Open claim settlement on ArcScan", url: settlementHash ? `${input.explorer.explorerUrl}/tx/${settlementHash}` : null },
      { id: "inspect-campaign", label: "Inspect the anonymous campaign proof", url: "https://www.currentco.finance/#/proof-explorer" },
      { id: "inspect-api", label: "Read this replay as JSON", url: "https://www.currentco.finance/api/v1/reviewer-demo" },
    ],
    developerRecipe: {
      package: "@currentcofi/sdk",
      sequence: ["current.distributions.create()", "current.identities.attest()", "claim.completed webhook", "current.activations.submit()", "current.evidence.create()"],
      integrationPaths: input.manifest.paths.map((path) => ({ id: path.id, label: path.label })),
    },
    privacy: "No raw project name, campaign name, database ID, recipient identity, email, social handle, wallet address, API key, or private contact is included.",
  };
  return { ...body, digest: reviewerDemoDigest(body) };
}

export async function getReviewerDemo() {
  const [explorer, network] = await Promise.all([getCampaignProofExplorer(), getNetworkProof()]);
  return buildReviewerDemo({ generatedAt: new Date().toISOString(), explorer, network, manifest: integrationManifest() });
}
