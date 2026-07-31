"use client";

import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Bell, Bot,
  Braces, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Code2,
  Copy, Download, Eye, ExternalLink, FileCheck2, Fingerprint, Gauge, Gift,
  Globe2, Handshake, HelpCircle, KeyRound, Layers3, Link2, Lock, LogOut, Menu,
  MoreHorizontal, Network, Pause, Play, Plus, Radar, Radio, RefreshCw, Search,
  Rocket, Settings, Share2, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Target,
  TestTube2, TrendingUp, Upload, Users, Wallet, Webhook, X, Zap
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { currentApi } from "@/lib/api/client";
import { useCircleWalletAuth } from "@/lib/auth/circle-wallet";
import { CurrentClaimEmbed } from "@/packages/react/src";

type View =
  | "home" | "claim" | "overview" | "create" | "onboarding" | "campaigns"
  | "new-campaign" | "funding" | "recipients" | "referrals" | "analytics" | "pilots" | "evidence" | "token"
  | "developers" | "api-keys" | "webhooks" | "agents" | "settings" | "states";

type ClaimStep = "ready" | "auth" | "creating" | "claiming" | "success";
type CircleAuth = ReturnType<typeof useCircleWalletAuth>;
type ClaimPreview = {
  id: string;
  status: string;
  fundingStatus: string;
  claimable: boolean;
  amount: string;
  asset: string;
  network: string;
  project: { name: string; logoUrl: string | null };
  message: string;
  sender: string;
  expiresAt: string | null;
  identityBinding: {
    required: boolean;
    type: string | null;
    recipient: string | null;
    status: "sign-in-required" | "link-secured";
    supported: boolean;
    verifier: "project-attestation" | "current-session" | "link-secret";
  };
};

type WalletActionResult = {
  complete?: boolean;
  challengeId?: string;
  pending?: boolean;
  status?: string;
  transactionHash?: string | null;
};

type CampaignRecord = {
  id: string;
  name: string;
  status: string;
  asset: string;
  tokenAddress: string;
  totalAmount: string;
  claimedAmount: string;
  recipientCount: number;
  claimedCount: number;
  claimRate: number;
  expiresAt: string | null;
  createdAt: string;
  fundingTxHash: string | null;
  activationEvent: unknown;
  claimMode: "allowlist" | "identity-bound";
};

type FundingIntent = {
  id: string;
  distributionId: string;
  sourceChain: string;
  destinationChain: string;
  destinationAddress: string;
  amountAtomic: string;
  protocolFeeAtomic: string;
  forwardFeeAtomic: string;
  totalBurnAtomic: string;
  status: string;
  sourceTransactionHash: string | null;
  destinationTransactionHash: string | null;
  campaignFundingTransactionHash: string | null;
  createdAt: string;
  source: { label: string; explorer: string; transactionUrl: string | null };
  destination: { explorer: string; transactionUrl: string | null };
  stages: Array<{ id: string; label: string; complete: boolean }>;
};

type FundingState = {
  catalog: {
    sourceChains: Array<{ code: string; label: string; domain: number; usdcAddress: string }>;
    destination: { code: string; domain: number };
    transport: string;
  };
  intents: FundingIntent[];
};

type GatewayFundingIntent = {
  id: string;
  distributionId: string;
  sourceChain: string;
  destinationAddress: string;
  sourceWalletAddress: string | null;
  amountAtomic: string;
  maxFeeAtomic: string;
  status: string;
  depositTransactionHash: string | null;
  transferId: string | null;
  mintTransactionHash: string | null;
  campaignFundingTransactionHash: string | null;
  createdAt: string;
  source: { label: string; explorer: string; transactionUrl: string | null };
  destination: { explorer: string; transactionUrl: string | null };
  stages: Array<{ id: string; label: string; complete: boolean }>;
};

type GatewayFundingState = {
  catalog: {
    sourceChains: Array<{ code: string; label: string; domain: number; usdcAddress: string }>;
    destination: { code: string; domain: number; usdcAddress: string };
    transport: string;
    signerRequirement: string;
    maxFeeAtomic: string;
  };
  unifiedBalance: {
    total: string;
    unavailable?: boolean;
    reason?: string;
    balances: Array<{ domain: number; balance: string; chain: string; label: string }>;
    wallets: Array<{ id: string; address: string; blockchain: string; accountType: string }>;
  };
  intents: GatewayFundingIntent[];
};

type CampaignRecipient = {
  id: string;
  campaignId: string;
  campaignName: string;
  identity: string;
  identityType: string;
  amount: string;
  asset: string;
  status: string;
  claimed: boolean;
  updatedAt: string;
};

type CampaignAnalytics = {
  totals: {
    campaigns: number;
    liveCampaigns: number;
    targeted: number;
    claimed: number;
    activations: number;
    claimRate: number;
    activationRate: number;
    identityBoundCampaigns: number;
    identityBoundTargeted: number;
    identityBoundClaims: number;
    identityAttestations: number;
    consumedIdentityAttestations: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    targeted: number;
    claimed: number;
    claimRate: number;
    activations: number;
  }>;
};

type EvidenceCriterion = {
  id: string;
  label: string;
  weight: number;
  passed: boolean;
  evidence: string;
};

type EvidenceCampaign = {
  id: string;
  name: string;
  status: string;
  asset: { symbol: string; address: string; totalAmount: string; claimedAmount: string };
  targeting: { claimMode: string; targeted: number; claimed: number; claimRate: number };
  activation: { requestedEvent: string | null; total: number; rate: number };
  identityVerification: { attestations: number; consumedAttestations: number };
  anchors: {
    merkleRoot: string | null;
    vaultAddress: string | null;
    fundingTransactionHash: string | null;
    claimTransactions: Array<{ hash: string; confirmedAt: string | null }>;
  };
};

type EvidenceSnapshot = {
  generatedAt: string;
  purpose: string;
  privacy: string;
  project: { id: string; slug: string; name: string; description: string | null };
  network: {
    name: string;
    chainId: number;
    explorerUrl: string;
    usdcAddress: string;
    campaignVaultAddress: string | null;
  };
  readiness: {
    score: number;
    earned: number;
    possible: number;
    criteria: EvidenceCriterion[];
  };
  totals: {
    campaigns: number;
    fundedCampaigns: number;
    recipients: number;
    claims: number;
    walletsCreated: number;
    activations: number;
    identityAttestations: number;
    claimRate: number;
    activationRate: number;
    activeApiKeys: number;
    activeWebhooks: number;
  };
  campaigns: EvidenceCampaign[];
  auditTrail: Array<{
    action: string;
    resourceType: string;
    resourceId: string | null;
    createdAt: string;
  }>;
};

type EvidenceReport = {
  id: string;
  publicSlug: string;
  schemaVersion: string;
  digest: string;
  distributionId: string | null;
  readinessScore: number;
  snapshot: EvidenceSnapshot;
  createdAt: string;
  integrity?: { valid: boolean; recalculatedDigest: string };
};

type EvidenceReportSummary = {
  id: string;
  publicSlug: string;
  schemaVersion: string;
  digest: string;
  distributionId: string | null;
  readinessScore: number;
  project: { name: string; slug: string };
  totals: { campaigns: number; recipients: number; claims: number; activations: number };
  createdAt: string;
};

type PilotRecord = {
  id: string;
  publicSlug: string;
  partnerName: string;
  partnerWebsite: string | null;
  useCase: string;
  status: "onboarding" | "ready" | "live" | "measuring" | "complete";
  integrationMode: string;
  requestedIntegrations: string[];
  targets: { recipients: number; claimRate: number; activationRate: number };
  successCriteria: Record<string, unknown>;
  notes: string | null;
  readinessScore: number;
  targetMet: boolean;
  milestones: Array<{ id: string; label: string; passed: boolean; evidence: string }>;
  campaign: null | {
    id: string;
    name: string;
    status: string;
    recipientCount: number;
    fundingTxHash: string | null;
    merkleRoot: string | null;
    asset: string;
    claims: number;
    activations: number;
    claimRate: number;
    activationRate: number;
  };
  attestation: null | {
    signerName: string;
    signerRole: string;
    statement: string;
    digest: string;
    attestedAt: string;
  };
  startsAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PublicPilot = {
  project: { name: string; websiteUrl: string | null };
  pilot: PilotRecord;
  attestationStatement: string;
};

type CampaignRecipientDraft = {
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  amount: string;
};

type CreatedCampaign = {
  id: string;
  status: string;
  name: string;
  asset: { address: string; symbol: string; name: string; decimals: number };
  recipientCount: number;
  totalAmount: string;
  totalAmountAtomic: string;
  merkleRoot: string;
  claimMode: "allowlist" | "identity-bound";
  expiresAt: string;
  links: Array<{ identity: string; identityType: string; amount: string; claimUrl: string }>;
};

type ReferralState = {
  totals: { referrals: number; claimed: number; activated: number; activationRate: number };
  codes: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    code: string;
    referrerName: string;
    createdAt: string;
  }>;
  sources: Array<{
    referrerUserId: string;
    name: string;
    code: string;
    claimed: number;
    activated: number;
    activationRate: number;
  }>;
};

type DeveloperKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  kind: "project" | "agent";
  permissions: string[];
  policies: Record<string, unknown>;
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type CreatedDeveloperKey = DeveloperKeyRecord & {
  token: string;
  signingSecret: string;
  warning: string;
};

type AgentActionRecord = {
  id: string;
  agentName: string;
  kind: string;
  status: string;
  riskLevel: string;
  amountAtomic: string;
  assetAddress: string | null;
  recipientCount: number;
  campaignName: string;
  policyDecision: { outcome?: string; reasons?: string[] };
  result: {
    distributionId?: string;
    name?: string;
    status?: string;
    settlementStatus?: string;
    fundingTransactionHash?: string | null;
  };
  settlement: {
    id: string;
    status: string;
    transactionHash: string | null;
    failureCode: string | null;
    settledAt: string | null;
    stages: Array<{ id: string; label: string; complete: boolean }>;
  } | null;
  failureCode: string | null;
  reviewedAt: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgentRuntimeState = {
  totals: { actions: number; approvalRequired: number; awaitingSettlement: number; completed: number; blocked: number };
  actions: AgentActionRecord[];
};

type WebhookState = {
  endpoints: Array<{
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  deliveries: Array<{
    id: string;
    endpointId: string;
    eventType: string;
    eventId: string;
    status: string;
    attempts: number;
    responseStatus: number | null;
    responseError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

type TokenEconomyState = {
  configured: boolean;
  rpcStatus?: "live" | "degraded";
  verifiedAt?: string | null;
  network: string;
  explorerUrl?: string;
  addresses: null | {
    current: string;
    lockVault: string;
    feeRouter: string;
    accessManager?: string;
    buybackGovernor?: string;
    testnetAdapter?: string;
    liquidityVault?: string;
    liquidityGovernor?: string;
    testnetLiquidityAdapter?: string;
  };
  metrics: null | {
    totalSupply: string;
    totalLocked: string;
    totalProductFees: string;
    buybackReserve: string;
    totalBuybackUSDC: string;
    totalCurrentPurchased: string;
    totalCurrentBurned: string;
    totalCurrentProtocolLocked: string;
  };
  walletCurrent: null | { display: string; atomic: string };
  allocations?: { buybackBps: number; gasBps: number; liquidityBps: number; operationsBps: number };
  governance?: {
    configured: boolean;
    governorOwnsRouter: boolean;
    adapterAllowed: boolean;
    guardian: string | null;
    minimumDelaySeconds: number;
    totalQueued: number;
    totalExecuted: number;
    totalCancelled: number;
    totalAccessActivations: number;
  };
  liquidity?: {
    configured: boolean;
    governorOwnsVault: boolean;
    adapterAllowed: boolean;
    guardian: string | null;
    minimumDelaySeconds: number;
    totalQueued: number;
    totalExecuted: number;
    totalCancelled: number;
    idleCurrent: string;
    idleUsdc: string;
    currentDeployed: string;
    usdcDeployed: string;
    liquidityShares: string;
    currentReturned: string;
    usdcReturned: string;
    positionsCreated: number;
    positionsRemoved: number;
    venue: string;
    proofMode: string;
  };
  accessTiers?: Array<{ name: string; requirement: string; recipientLimit: number }>;
  projectAccess?: {
    tier: number;
    tierName: string;
    expiresAt: number;
    lockId: string;
    owner: string;
  } | null;
  recentActions: Array<{
    id: string;
    kind: string;
    reference: string;
    amount: string;
    transactionHash: string | null;
    accessTier?: string | null;
    accessExpiresAt?: number | null;
    createdAt: string;
  }>;
  actions: Array<{
    id: string;
    kind: string;
    reference: string;
    amount: string;
    durationDays: number | null;
    status: string;
    transactionHash: string | null;
    createdAt: string;
  }>;
};

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseRecipientCsv(value: string, defaultAmount: string): CampaignRecipientDraft[] {
  const rows = value.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (!rows.length) return [];
  const firstCells = rows[0].split(",").map((cell) => cell.trim().replace(/^"|"$/g, "").toLowerCase());
  const start = firstCells[0] === "identity" ||
    firstCells[0] === "email" ||
    firstCells[0] === "wallet" ||
    firstCells.includes("identity_type") ||
    firstCells.includes("amount")
    ? 1
    : 0;
  return rows.slice(start).map((row, index) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let cursor = 0; cursor < row.length; cursor += 1) {
      const character = row[cursor];
      if (character === '"' && row[cursor + 1] === '"') {
        current += '"';
        cursor += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    const identity = cells[0] ?? "";
    const inferred = identity.includes("@") && !identity.startsWith("@")
      ? "email"
      : identity.startsWith("0x")
        ? "wallet"
        : identity.startsWith("@")
          ? "x"
          : "custom";
    const suppliedType = cells[1]?.toLowerCase();
    const identityType = ["email", "wallet", "x", "game", "custom"].includes(suppliedType)
      ? suppliedType
      : inferred;
    const amount = cells[2] || (suppliedType && !["email", "wallet", "x", "game", "custom"].includes(suppliedType)
      ? cells[1]
      : defaultAmount);
    if (!identity || !amount) throw new Error(`Recipient row ${index + 1 + start} needs an identity and amount.`);
    return { identity, identityType, amount } as CampaignRecipientDraft;
  });
}

function downloadCampaignLinks(campaign: CreatedCampaign) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csv = [
    "identity,identity_type,amount,asset,claim_url",
    ...campaign.links.map((link) => [
      escape(link.identity),
      link.identityType,
      link.amount,
      campaign.asset.symbol,
      escape(link.claimUrl),
    ].join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-claim-links.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function evidenceShareUrl(publicSlug: string) {
  return `${location.origin}/?evidence=${encodeURIComponent(publicSlug)}#/evidence`;
}

function pilotShareUrl(publicSlug: string) {
  return `${location.origin}/?pilot=${encodeURIComponent(publicSlug)}#/pilots`;
}

function downloadEvidenceReport(report: EvidenceReport) {
  const payload = JSON.stringify({
    reportId: report.id,
    schemaVersion: report.schemaVersion,
    digest: report.digest,
    integrity: report.integrity ?? { valid: true },
    snapshot: report.snapshot,
  }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.snapshot.project.slug}-current-cofi-evidence.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function useCampaignNetwork(enabled: boolean) {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) {
      setCampaigns([]);
      setAnalytics(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await currentApi.get<{ campaigns: CampaignRecord[]; analytics: CampaignAnalytics }>("/campaigns");
      setCampaigns(result.campaigns);
      setAnalytics(result.analytics);
    } catch (networkError) {
      setError(networkError instanceof Error ? networkError.message : "Campaign data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    const task = window.setTimeout(() => { void refresh() }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);
  return { campaigns, analytics, loading, error, refresh };
}

async function confirmWalletAction(
  path: string,
  body: Record<string, unknown>,
  challengeId: string,
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const result = await currentApi.post<WalletActionResult>(path, { ...body, challengeId });
    if (!result.pending) return result;
    await pause(1_500);
  }
  throw new Error("Arc is still confirming this action. You can safely try again in a moment.");
}

function formatAtomic(value:string) {
  const numeric=Number(value)/1_000_000;
  return numeric.toLocaleString(undefined,{maximumFractionDigits:6});
}

const validViews = new Set<View>([
  "home", "claim", "overview", "create", "onboarding", "campaigns",
  "new-campaign", "funding", "recipients", "referrals", "analytics", "pilots", "evidence", "token",
  "developers", "api-keys", "webhooks", "agents", "settings", "states",
]);

function viewFromHash(hash: string): View | null {
  if (hash.startsWith("#state=")) return "claim";
  if (!hash.startsWith("#/")) return null;
  const value = hash.slice(2) as View;
  return validViews.has(value) ? value : null;
}

const appNav = [
  { label: "Workspace", items: [
    ["overview", "Overview", Gauge], ["onboarding", "Project setup", Globe2],
    ["create", "Create link", Link2],
    ["funding", "Crosschain funding", Globe2], ["campaigns", "Campaigns", Layers3], ["recipients", "Recipients", Users],
    ["referrals", "Referrals", Network], ["analytics", "Analytics", BarChart3],
    ["pilots", "Pilot operations", Handshake],
    ["evidence", "Grant evidence", FileCheck2],
  ]},
  { label: "Protocol", items: [
    ["token", "$CURRENT", CircleDollarSign], ["developers", "Developers", Code2],
    ["agents", "AI agents", Bot],
  ]},
] as const;

function Brand({ light = false, onClick }: { light?: boolean; onClick?: () => void }) {
  return (
    <button className={`cofi-brand ${light ? "is-light" : ""}`} onClick={onClick} aria-label="Current CoFi home">
      <span className="cofi-glyph" aria-hidden="true"><i/><i/><i/></span>
      <span>current</span><em>cofi</em>
    </button>
  );
}

function Button({
  children, tone = "blue", onClick, disabled = false, type = "button"
}: {
  children: React.ReactNode; tone?: "blue" | "cyan" | "dark" | "light" | "ghost";
  onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return <button className={`cofi-button tone-${tone}`} onClick={onClick} disabled={disabled} type={type}>{children}</button>;
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? "light" : ""}`}>{children}</div>;
}

function Status({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "green" | "grey" | "red" | "blue" }) {
  return <span className={`status status-${tone}`}><i/>{children}</span>;
}

function FluidCanvas({ mode = "network", className = "" }: { mode?: "network" | "branches" | "orbit"; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0, width = 0, height = 0, active = true;
    const resize = () => {
      const b = canvas.getBoundingClientRect();
      width = b.width; height = b.height;
      const dpr = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.25 : 1.75);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paths = Array.from({ length: mode === "branches" ? 14 : 10 }, (_, i) => ({
      y: .12 + (i / (mode === "branches" ? 15 : 11)) * .76,
      speed: .018 + (i % 5) * .006,
      offset: (i * .173) % 1,
    }));
    const point = (p: number, i: number, t: number) => {
      const sy = height * .5, ey = height * paths[i].y;
      const sx = mode === "orbit" ? width * .5 : width * .1;
      const ex = mode === "orbit" ? width * (.5 + Math.cos(i * .63) * .39) : width * .93;
      const wave = Math.sin(t * .00035 + i * .8) * height * .035;
      const inv = 1 - p;
      const c1x = mode === "orbit" ? width * .55 : width * .34;
      const c2x = mode === "orbit" ? ex - width * .08 : width * .68;
      return {
        x: inv ** 3 * sx + 3 * inv ** 2 * p * c1x + 3 * inv * p ** 2 * c2x + p ** 3 * ex,
        y: inv ** 3 * sy + 3 * inv ** 2 * p * (sy + wave) + 3 * inv * p ** 2 * (ey - wave) + p ** 3 * ey,
      };
    };
    const draw = (t: number) => {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(width * .55, height * .5, 0, width * .55, height * .5, width * .62);
      glow.addColorStop(0, "rgba(37,232,225,.15)"); glow.addColorStop(.55, "rgba(23,59,255,.06)"); glow.addColorStop(1, "rgba(2,7,19,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      paths.forEach((path, i) => {
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const q = point(s / 60, i, t);
          if (s) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        }
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "rgba(37,232,225,.04)");
        grad.addColorStop(.6, "rgba(37,232,225,.30)");
        grad.addColorStop(1, i % 3 === 0 ? "rgba(32,214,107,.55)" : "rgba(23,59,255,.42)");
        ctx.strokeStyle = grad; ctx.lineWidth = i % 4 === 0 ? 1.4 : .8; ctx.stroke();
        for (let k = 0; k < 3; k++) {
          const p = reduce ? .75 : (path.offset + k / 3 + t * .001 * path.speed) % 1;
          const q = point(p, i, t);
          const green = i % 3 === 0 && p > .78;
          ctx.shadowBlur = 12; ctx.shadowColor = green ? "#20D66B" : "#25E8E1";
          ctx.fillStyle = green ? "#20D66B" : "#25E8E1";
          ctx.beginPath(); ctx.arc(q.x, q.y, 1.5 + (i % 3) * .4, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.shadowBlur = 0;
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active && !reduce) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    });
    resize(); observer.observe(canvas); draw(0);
    addEventListener("resize", resize);
    const visibility = () => { active = !document.hidden; if (active && !reduce) frame = requestAnimationFrame(draw); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [mode]);
  return <canvas className={`fluid-canvas ${className}`} ref={canvasRef} aria-hidden="true"/>;
}

function Marketing({ go }: { go: (v: View) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !root.current) return;
    const context = gsap.context(() => {
      gsap.from("[data-hero-line]", { yPercent: 115, duration: 1.05, stagger: .09, ease: "power4.out" });
      gsap.from("[data-hero-rest]", { y: 24, opacity: 0, duration: .72, stagger: .08, delay: .55, ease: "power3.out" });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 64, opacity: 0, duration: .9, ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 82%", once: true }
        });
      });
      if (matchMedia("(min-width: 769px)").matches) {
        const phases = gsap.utils.toArray<HTMLElement>(".story-phase");
        const nodes = gsap.utils.toArray<HTMLElement>(".story-node");
        const story = gsap.timeline({
          scrollTrigger: { trigger: ".story-scroll", start: "top top", end: "+=240%", scrub: 1, pin: ".story-stage" }
        });
        phases.forEach((phase, i) => {
          story.to(phases, { opacity: (_, target) => target === phase ? 1 : 0, y: (_, target) => target === phase ? 0 : 18, duration: .35 }, i * .65);
          story.to(nodes.slice(0, 4 + i * 4), { opacity: 1, scale: 1, stagger: .02, duration: .3 }, i * .65);
        });
      }
      gsap.to(".fee-orbit-inner", {
        rotate: 360, ease: "none",
        scrollTrigger: { trigger: ".token-story", start: "top bottom", end: "bottom top", scrub: 1.2 }
      });
    }, root);
    return () => context.revert();
  }, []);

  return (
    <div className="site" ref={root}>
      <header className="marketing-nav">
        <Brand light onClick={() => go("home")}/>
        <nav aria-label="Main navigation">
          <a href="#network">Network</a><a href="#product">Product</a>
          <a href="#developers">Developers</a><a href="#current">$CURRENT</a>
        </nav>
        <div className="nav-actions">
          <button className="nav-text" onClick={() => go("overview")}>Sign in</button>
          <Button tone="light" onClick={() => go("new-campaign")}>Launch a current <ArrowUpRight size={15}/></Button>
          <button className="menu-trigger" aria-label="Open navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
        </div>
      </header>
      {menu && <div className="mobile-ocean-menu">
        {["Network","Product","Developers","$CURRENT"].map(item => <a key={item} href={`#${item === "$CURRENT" ? "current" : item.toLowerCase()}`} onClick={() => setMenu(false)}>{item}<ArrowUpRight/></a>)}
        <Button tone="cyan" onClick={() => go("new-campaign")}>Launch a current <ArrowRight/></Button>
      </div>}

      <main>
        <section className="cinematic-hero">
          <div className="hero-media" aria-hidden="true">
            <video className="hero-video" autoPlay muted playsInline loop poster="/media/currentdes-start.jpg" style={{opacity: motionPaused ? 0 : 1}}>
              <source src="/media/currentdes-hero.mp4" type="video/mp4"/>
            </video>
            <div className="hero-shade"/>
          </div>
          <div className="hero-copy-new">
            <Eyebrow light><Sparkles/> THE ACTIVATION LAYER FOR ARC</Eyebrow>
            <h1><span><b data-hero-line>Turn any audience</b></span><span><b data-hero-line>into active</b></span><span className="cyan"><b data-hero-line>token users.</b></span></h1>
            <p data-hero-rest>Distribute USDC or your project token to anyone. No wallet, gas, or crypto knowledge required. Every claim creates a funded account and a measurable user.</p>
            <div className="hero-actions" data-hero-rest>
              <Button tone="cyan" onClick={() => go("new-campaign")}>Create a distribution <ArrowRight/></Button>
              <button className="experience-link" onClick={() => go("claim")}><span><Play/></span>Experience a claim</button>
            </div>
          </div>
          <div className="hero-bottom" data-hero-rest>
            <div><strong>8,241</strong><span>wallets funded</span></div>
            <div><strong>18</strong><span>project currents</span></div>
            <div><strong>63.8%</strong><span>activated users</span></div>
            <button aria-label={motionPaused ? "Play hero animation" : "Pause hero animation"} onClick={() => setMotionPaused(!motionPaused)}>{motionPaused ? <Play/> : <Pause/>}</button>
          </div>
        </section>

        <section className="proof-section" id="network">
          <Eyebrow>LIVE NETWORK</Eyebrow>
          <div className="proof-number" data-reveal><small>Assets distributed</small><strong>$128,604,218</strong></div>
          <div className="proof-grid" data-reveal>
            <div><b>42,814</b><span>funded wallets</span></div>
            <div><b>31,207</b><span>activated users</span></div>
            <div><b>184</b><span>live campaigns</span></div>
            <div><b>0</b><span>gas required to claim</span></div>
          </div>
          <div className="partner-current" aria-label="Built for projects, games, communities, creators, and agents">
            {[["T","Tidebreak"],["O","Openplay"],["N","Noma"],["K","Kairo"],["V","Vessel"],["A","Axiom"],["F","Flux"]].map(([mark,name]) => <span key={name}><i>{mark}</i>{name}</span>)}
          </div>
        </section>

        <section className="story-scroll" id="product">
          <div className="story-stage">
            <div className="story-title"><Eyebrow light>YOU SCROLL, VALUE FLOWS</Eyebrow><h2>What is<br/><em>Current CoFi?</em></h2></div>
            <div className="story-visual">
              <FluidCanvas mode="network"/>
              <div className="story-source"><span>C</span><small>PROJECT SOURCE</small></div>
              <div className="story-nodes">{Array.from({length:12},(_,i)=><span className={`story-node n-${i}`} key={i}>{i > 7 ? <Wallet/> : <Users/>}</span>)}</div>
            </div>
            <div className="story-copy">
              <article className="story-phase">
                <span>01 / 03</span><h3>Fund the current.</h3>
                <p>Deposit USDC or any supported project token into a fully funded distribution.</p>
              </article>
              <article className="story-phase">
                <span>02 / 03</span><h3>Reach beyond wallets.</h3>
                <p>Assign value to emails, social identities, game accounts, QR codes, or private links.</p>
              </article>
              <article className="story-phase">
                <span>03 / 03</span><h3>Activate real users.</h3>
                <p>Create embedded wallets, sponsor every claim, attribute referrals, and measure retention.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="possibilities">
          <Eyebrow>ONE PROTOCOL, MANY CURRENTS</Eyebrow>
          <h2 data-reveal>Move value through<br/>the communities that create it.</h2>
          <div className="word-current">
            {["Token launches","Social payments","Game rewards","Bounties","Referrals","Agent payments","Event drops","Community payroll"].map(x=><span key={x}>{x}<i/></span>)}
          </div>
        </section>

        <section className="claim-feature">
          <div className="claim-feature-copy" data-reveal>
            <Eyebrow>WALLETLESS CLAIMS</Eyebrow>
            <h2>A funded account appears when the value arrives.</h2>
            <p>Recipients open a link, sign in, and claim. Current CoFi verifies identity, creates the embedded wallet, sponsors gas, and records the activation.</p>
            <ul><li><Check/>USDC and project tokens</li><li><Check/>Email, social, game account, QR, or link</li><li><Check/>Expiration, recovery, and refunds</li></ul>
            <Button tone="dark" onClick={() => go("claim")}>Experience the claim <ArrowRight/></Button>
          </div>
          <div className="claim-device-scene" data-reveal>
            <FluidCanvas mode="network"/>
            <div className="claim-phone">
              <div className="phone-sensor"/><span className="mini-project">T</span>
              <small>Tidebreak sent you</small><strong>2,500 TIDE</strong><em>≈ $42.80</em>
              <div className="identity-chip"><Fingerprint/>Claim with your social identity</div>
              <button>Claim — no gas required</button>
            </div>
            <span className="claim-event event-one"><Wallet/>Wallet created</span>
            <span className="claim-event event-two"><CheckCircle2/>User activated</span>
          </div>
        </section>

        <section className="surface-section">
          <div className="surface-heading" data-reveal><Eyebrow>THE OPERATING LAYER</Eyebrow><h2>Distribution is only the beginning.</h2></div>
          <div className="surface-grid">
            <article className="surface-card dark" data-reveal>
              <span>01</span><Network/><h3>Campaigns + attribution</h3><p>Import recipients, branch referral currents, define activation events, and see exactly which sources create retained users.</p>
              <div className="mini-funnel">{["Targeted","Opened","Wallet","Claimed","Active"].map((x,i)=><span key={x} style={{"--w":`${100-i*13}%`} as React.CSSProperties}><b>{x}</b></span>)}</div>
            </article>
            <article className="surface-card water" id="developers" data-reveal>
              <span>02</span><Braces/><h3>Built for software and agents</h3><p>One API for distributions, claims, referrals, activation events, webhooks, and policy-bound autonomous rewards.</p>
              <pre><code><i>const</i> current = <i>await</i> cofi.distributions.create({"{"}<br/>  asset: <b>&quot;USDC&quot;</b>, recipients: audience,<br/>  walletless: <b>true</b>, attribution: <b>true</b><br/>{"}"})</code></pre>
              <Button tone="dark" onClick={() => go("developers")}>Explore the developer layer <ArrowRight/></Button>
            </article>
          </div>
        </section>

        <section className="token-story" id="current">
          <div className="token-copy-new" data-reveal>
            <Eyebrow light>THE PRODUCT FEE CURRENT</Eyebrow>
            <h2>Every product fee reinforces <em>$CURRENT.</em></h2>
            <p>A transparent portion of Current CoFi fees accumulates in USDC and purchases `$CURRENT` from the market in efficient batches. Projects also lock `$CURRENT` to access larger distribution currents, advanced attribution, promotion, and sponsored claims.</p>
            <div className="allocation-row"><span><b>35%</b>Buyback reserve</span><span><b>25%</b>Gas sponsorship</span><span><b>20%</b>Liquidity</span><span><b>20%</b>Operations</span></div>
            <Button tone="cyan" onClick={() => go("token")}>View the transparent current <ArrowRight/></Button>
          </div>
          <div className="fee-orbit" data-reveal>
            <FluidCanvas mode="orbit"/>
            <div className="fee-orbit-inner"><span className="current-coin">$C</span><i/><i/><i/></div>
            <span className="orbit-label l-a">USDC fees</span><span className="orbit-label l-b">market buy</span><span className="orbit-label l-c">burn · lock · liquidity</span>
          </div>
        </section>

        <section className="roadmap-scene">
          <div data-reveal><Eyebrow>THE CURRENT EXPANDS</Eyebrow><h2>One distribution layer.<br/>An entire community economy.</h2></div>
          <div className="roadmap-current" data-reveal>
            {[["Now","Token + USDC distribution"],["Next","Merchant checkout"],["Next","Milestone escrow"],["Next","Subscriptions"],["Later","Cross-chain USDC"]].map(([time,title],i)=><article key={title}><span>{i+1}</span><small>{time}</small><h3>{title}</h3></article>)}
          </div>
        </section>

        <section className="final-current">
          <FluidCanvas mode="branches"/>
          <div data-reveal><Eyebrow light>THE NEXT AUDIENCE IS ALREADY WAITING</Eyebrow><h2>Start the current.</h2><p>Turn an offchain community into funded wallets, active users, and measurable growth.</p><Button tone="cyan" onClick={() => go("new-campaign")}>Create a distribution <ArrowRight/></Button></div>
        </section>
      </main>
      <footer className="site-footer"><Brand/><p>Walletless distribution and activation infrastructure for the Arc economy.</p><div><button onClick={()=>go("developers")}>Developers</button><button onClick={()=>go("token")}>$CURRENT</button><a href="#product">Product</a></div><small>© 2026 Current CoFi · Testnet experience</small></footer>
    </div>
  );
}

function ClaimView({ go, auth }: { go: (v: View) => void; auth: CircleAuth }) {
  const [step,setStep] = useState<ClaimStep>("ready");
  const [emailMode,setEmailMode] = useState(false);
  const [email,setEmail] = useState("");
  const [claimToken] = useState(()=>typeof location==="undefined"?null:new URLSearchParams(location.search).get("claim"));
  const [referralCode] = useState(()=>typeof location==="undefined"?null:new URLSearchParams(location.search).get("ref"));
  const [preview,setPreview] = useState<ClaimPreview|null>(null);
  const [previewState,setPreviewState] = useState<"demo"|"loading"|"live"|"error">(()=>claimToken?"loading":"demo");
  const [claimError,setClaimError] = useState<string|null>(null);
  const claimStartedRef = useRef(false);
  useEffect(()=>{
    if(!claimToken)return;
    currentApi.post<ClaimPreview>("/links/resolve",{token:claimToken})
      .then(data=>{setPreview(data);setPreviewState("live")})
      .catch(()=>setPreviewState("error"));
  },[claimToken]);
  const settleClaim = useCallback(async () => {
    if(!claimToken){setStep(auth.account?"success":"auth");return}
    setClaimError(null);setStep("claiming");
    try{
      const started=await currentApi.post<WalletActionResult>("/links/claim",{token:claimToken,referralCode});
      if(!started.complete){
        if(!started.challengeId)throw new Error("Circle did not return a wallet approval.");
        await auth.executeChallenge(started.challengeId);
        await confirmWalletAction("/links/claim",{token:claimToken,referralCode},started.challengeId);
      }
      setPreview(current=>current?{...current,status:"confirmed",claimable:false}:current);
      setStep("success");
    }catch(claimFailure){
      claimStartedRef.current=false;
      setClaimError(claimFailure instanceof Error?claimFailure.message:"The claim could not be completed.");
      setStep(auth.account?"ready":"auth");
    }
  },[auth,claimToken,referralCode]);
  const claim=()=>{
    if(!auth.account){setStep("auth");return}
    claimStartedRef.current=true;void settleClaim();
  };
  useEffect(()=>{
    if(!claimToken||!auth.account||step!=="auth"||claimStartedRef.current)return;
    claimStartedRef.current=true;void settleClaim();
  },[auth.account,claimToken,settleClaim,step]);
  const visibleStep: ClaimStep = previewState==="live"&&preview&&!preview.claimable&&step!=="success"
    ? "ready"
    : auth.state==="redirecting"||auth.state==="verifying"||auth.state==="creating-wallet"
      ? "creating"
      : auth.state==="error"
        ? "auth"
        : step;
  const unavailableLabel = preview?.status==="confirmed"
    ? "Already claimed"
    : preview?.status==="expired"
      ? "Claim expired"
      : preview?.fundingStatus==="awaiting_funding"
        ? "Awaiting sender funding"
        : "Claim unavailable";
  const unavailableNote = preview?.status==="confirmed"
    ? "This value has already settled into its recipient wallet."
    : preview?.status==="expired"
      ? "The claim window ended and the sender can recover the funds."
      : preview?.fundingStatus==="awaiting_funding"
        ? "This link is secured, but its Arc vault has not been funded yet."
        : "This claim can no longer be completed.";
  return (
    <main className="claim-route">
      <FluidCanvas mode="network"/>
      <header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Secured on Arc testnet</span></header>
      <section className="claim-shell" aria-live="polite">
        {visibleStep === "ready" && <>
          {previewState==="loading"?<div className="creating-state"><span className="creating-orbit"><i/><i/><Link2/></span><small>VERIFYING SECURE LINK</small><h2>Following the current…</h2></div>:previewState==="error"?<><span className="claim-brand-avatar"><X/></span><small>LINK UNAVAILABLE</small><h2>This current cannot be opened.</h2><p className="auth-copy">The link may be invalid, expired, or already removed.</p><Button tone="ghost" onClick={()=>go("home")}>Return home</Button></>:<>
          <span className="claim-brand-avatar">{(preview?.project.name??"Tidebreak")[0]}</span><small>{preview?.sender??"Tidebreak"} sent you</small><h1>{preview?.amount??"2,500"} <em>{preview?.asset??"TIDE"}</em></h1>{!preview&&<p className="claim-usd">≈ $42.80</p>}
          <blockquote>{preview?.message||(preview?"A funded claim is waiting for you on Arc.":"Welcome to the Tidebreak Genesis current.")}</blockquote>
          <div className="claim-meta"><span><Clock3/>{preview?.expiresAt?`Expires ${new Date(preview.expiresAt).toLocaleDateString()}`:"Expires in 6 days"}</span><span><Zap/>Gas sponsored</span></div>
          {preview?.identityBinding.required&&<div className="claim-identity-binding"><ShieldCheck/><div><b>Identity-bound reward</b><small>{preview.identityBinding.verifier==="project-attestation"?`Your ${preview.identityBinding.type?.toUpperCase()} identity must be verified by the project and bound to this wallet.`:`Only ${preview.identityBinding.recipient??`the assigned ${preview.identityBinding.type}`} can claim after verification.`}</small></div></div>}
          <Button tone="blue" onClick={claim} disabled={Boolean(preview&&!preview.claimable)}>{preview&&!preview.claimable?unavailableLabel:"Claim your tokens"} <ArrowRight/></Button><p className="claim-note">{preview&&!preview.claimable?unavailableNote:"No wallet or payment required."}</p>
          {claimError&&<p className="auth-system-note is-error"><X/>{claimError}</p>}
          </>}
        </>}
        {visibleStep === "auth" && <>
          <button className="claim-back" onClick={()=>setStep("ready")}><ArrowLeft/>Back</button><span className="claim-brand-avatar"><Fingerprint/></span><small>CREATE YOUR CURRENT ACCOUNT</small><h2>Claim with an identity you already use.</h2>
          <p className="auth-copy">Your embedded wallet is created automatically in the background.</p>
          {!emailMode&&<><button className="auth-provider" onClick={auth.startGoogle} disabled={!auth.config?.methods.google}><b>G</b>Continue with Google</button>
          <button className="auth-provider" onClick={()=>setEmailMode(true)} disabled={!auth.config?.methods.email}><b>@</b>Continue with email</button>
          <button className="auth-provider" disabled><b>𝕏</b>X identity — campaign binding</button></>}
          {emailMode&&<form className="auth-email-form" onSubmit={(event)=>{event.preventDefault();void auth.startEmail(email)}}><label>Email address<input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@community.xyz" autoFocus/></label><Button tone="blue">Send secure code <ArrowRight/></Button><button type="button" onClick={()=>setEmailMode(false)}>Use another method</button></form>}
          {auth.state==="unavailable"&&<p className="auth-system-note"><ShieldCheck/>The production onboarding flow is installed. Circle credentials are the final activation switch.</p>}
          {auth.error&&<p className="auth-system-note is-error"><X/>{auth.error}</p>}
          {claimError&&<p className="auth-system-note is-error"><X/>{claimError}</p>}
        </>}
        {visibleStep === "creating" && <div className="creating-state"><span className="creating-orbit"><i/><i/><Wallet/></span><small>CREATING YOUR EMBEDDED WALLET</small><h2>Opening your current…</h2><div className="creating-steps"><span className="done"><Check/>Identity verified</span><span className={auth.state==="creating-wallet"?"done":""}><RefreshCw/>Creating Arc wallet</span><span>Securing account recovery</span></div></div>}
        {visibleStep === "claiming" && <div className="creating-state"><span className="creating-orbit"><i/><i/><Zap/></span><small>SETTLING ON ARC</small><h2>Bringing the value into your wallet…</h2><div className="creating-steps"><span className="done"><Check/>Identity authorized</span><span className="done"><RefreshCw/>Gasless claim submitted</span><span>Confirming settlement</span></div></div>}
        {visibleStep === "success" && <div className="success-state"><span className="success-ripple"><Check/></span><small>{claimToken?"CLAIM SETTLED":"ACCOUNT READY"}</small><h2>{claimToken?"The value is yours.":"Your wallet is open."}</h2><p>{claimToken?`${preview?.amount??""} ${preview?.asset??"tokens"} settled into your user-controlled Arc wallet.`:"Your user-controlled Arc wallet is ready for walletless distributions."}</p><div className="success-balance"><span>Arc wallet</span><b>{auth.account?.wallets[0]?.address?`${auth.account.wallets[0].address.slice(0,8)}…${auth.account.wallets[0].address.slice(-5)}`:"Creating address"}</b><small>Gas sponsored · Arc testnet SCA</small></div><Button tone="blue" onClick={()=>go("overview")}>Open your account <ArrowRight/></Button></div>}
      </section>
      <div className="claim-trust"><span><Lock/>Identity bound</span><span><Wallet/>Embedded wallet</span><span><Zap/>No gas needed</span></div>
    </main>
  );
}

function MetricCard({label,value,change,icon:Icon}:{label:string;value:string;change?:string;icon:typeof Activity}) {
  return <article className="metric-card-new"><span><Icon/></span><small>{label}</small><strong>{value}</strong>{change&&<em><TrendingUp/>{change}</em>}</article>;
}

function PageHero({eyebrow,title,copy,mode="network",children}:{eyebrow:string;title:string;copy:string;mode?:"network"|"branches"|"orbit";children?:React.ReactNode}) {
  return <section className="app-page-hero"><FluidCanvas mode={mode}/><div><Eyebrow light>{eyebrow}</Eyebrow><h1>{title}</h1><p>{copy}</p>{children}</div></section>;
}

function CampaignTable({
  campaigns: items,
  loading = false,
  onManage,
}: {
  campaigns: CampaignRecord[];
  loading?: boolean;
  onManage?: (campaign: CampaignRecord) => void;
}) {
  return <div className="data-panel"><div className="panel-head"><div><h3>Campaign currents</h3><p>Onchain distribution performance from the live workspace</p></div><button><SlidersHorizontal/>Filter</button></div><div className="campaign-table">
    <div className="table-head"><span>Campaign</span><span>Asset</span><span>Status</span><span>Claims</span><span>Claim rate</span><span>Value</span><span/></div>
    {loading&&<div className="campaign-empty compact"><RefreshCw className="spin"/><b>Reading the campaign current…</b></div>}
    {!loading&&!items.length&&<div className="campaign-empty compact"><Radio/><b>No campaigns yet</b><p>Create a fully funded allowlist to begin generating verifiable usage.</p></div>}
    {items.map(c=>{const manageable=c.status==="active"||c.status==="expired";return <div className="table-row" key={c.id}><span className="campaign-name"><i>{c.name[0]}</i><b>{c.name}<small>{c.claimMode==="identity-bound"?"Identity bound":"Secret allowlist"}</small></b></span><span>{c.asset}</span><Status tone={c.status==="active"?"green":c.status==="awaiting_funding"?"blue":c.status==="cancelled"||c.status==="refunded"?"grey":"cyan"}>{c.status.replaceAll("_"," ")}</Status><span>{c.claimedCount.toLocaleString()} / {c.recipientCount.toLocaleString()}<small className="row-progress"><i style={{width:`${c.claimRate}%`}}/></small></span><span>{c.claimRate.toFixed(1)}%</span><b>{c.totalAmount} {c.asset}</b><button aria-label={manageable?`Manage ${c.name}`:`Campaign ${c.name} is closed`} disabled={!manageable} onClick={()=>manageable&&onManage?.(c)}><MoreHorizontal/></button></div>})}
  </div></div>;
}

function Overview({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const totals=network.analytics?.totals;
  return <><PageHero eyebrow="LIVE WORKSPACE" title="Value is flowing." copy="Monitor distribution, wallet creation, activation, and the currents that bring users back."><Button tone="cyan" onClick={()=>go("new-campaign")}>Create distribution <ArrowRight/></Button></PageHero>
    <div className="metric-grid-new"><MetricCard label="Campaigns created" value={(totals?.campaigns??0).toLocaleString()} icon={CircleDollarSign}/><MetricCard label="Recipients targeted" value={(totals?.targeted??0).toLocaleString()} icon={Wallet}/><MetricCard label="Claims settled" value={(totals?.claimed??0).toLocaleString()} icon={Activity}/><MetricCard label="Verified claim rate" value={`${(totals?.claimRate??0).toFixed(1)}%`} icon={Target}/></div>
    {network.error&&<p className="auth-system-note is-error"><X/>{network.error}</p>}
    <div className="overview-grid"><CampaignTable campaigns={network.campaigns} loading={network.loading}/><div className="data-panel activity-panel"><div className="panel-head"><div><h3>Live protocol proof</h3><p>Production capability status</p></div><Radio/></div>{[["Identity-bound claims","Verified email + exact Arc wallet"],["Merkle campaigns","Up to 1,000 recipients"],["Project tokens","Any readable Arc ERC-20"],["Walletless claims","Circle SCA + sponsored gas"],["Recovery","Cancellation and expiry refunds"]].map((row,i)=><div className="activity-row" key={row[0]}><span className={`activity-node a-${i}`}><i/></span><div><b>{row[0]}</b><p>{row[1]}</p></div><Status tone="green">Live</Status></div>)}</div></div></>;
}

function CreateLink({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [asset,setAsset]=useState("USDC"); const [amount,setAmount]=useState("25"); const [message,setMessage]=useState("A little value for your next current.");
  const [created,setCreated]=useState<{id:string;claimUrl:string;status:string}|null>(null);
  const [fundingStep,setFundingStep]=useState<"idle"|"creating"|"approving"|"funding"|"complete">("idle");
  const [submitting,setSubmitting]=useState(false); const [error,setError]=useState<string|null>(null);
  const fund=async(link:{id:string;claimUrl:string;status:string})=>{
    setFundingStep("approving");
    const approval=await currentApi.post<WalletActionResult>("/links/fund",{distributionId:link.id,action:"approve"});
    if(!approval.complete){
      if(!approval.challengeId)throw new Error("Circle did not return the USDC approval.");
      await auth.executeChallenge(approval.challengeId);
      await confirmWalletAction("/links/fund",{distributionId:link.id,action:"approve"},approval.challengeId);
    }
    setFundingStep("funding");
    const deposit=await currentApi.post<WalletActionResult>("/links/fund",{distributionId:link.id,action:"deposit"});
    if(!deposit.complete){
      if(!deposit.challengeId)throw new Error("Circle did not return the vault funding approval.");
      await auth.executeChallenge(deposit.challengeId);
      await confirmWalletAction("/links/fund",{distributionId:link.id,action:"deposit"},deposit.challengeId);
    }
    setCreated({...link,status:"active"});setFundingStep("complete");
    await navigator.clipboard?.writeText(link.claimUrl);
  };
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError(null);
    if(!auth.account){go("claim");return}
    setSubmitting(true);
    try{
      if(created&&fundingStep!=="complete"){
        await fund(created);
      }else{
        setFundingStep("creating");
        const result=await currentApi.post<{id:string;claimUrl:string;status:string}>("/links",{amount,message,expiresInHours:168});
        setCreated(result);await fund(result);
      }
    }catch(linkError){if(!created)setFundingStep("idle");setError(linkError instanceof Error?linkError.message:"The link could not be created.")}
    finally{setSubmitting(false)}
  };
  const buttonLabel=fundingStep==="creating"?"Securing link…":fundingStep==="approving"?"Approve USDC access…":fundingStep==="funding"?"Fund the Arc vault…":created&&fundingStep!=="complete"?"Resume secure funding":auth.account?"Create and fund link":"Sign in to create";
  return <><PageHero eyebrow="PERSONAL CURRENT" title="Send value before a wallet exists." copy="Create one private, identity-bound, or open link for USDC or any supported project token."/>
    <div className="form-preview-grid"><form className="form-panel" onSubmit={submit}><div className="panel-head"><div><h3>Create an asset link</h3><p>Funds remain recoverable until claimed.</p></div><Status tone="blue">Arc testnet</Status></div>
      <label>Asset<div className="asset-options">{["USDC","TIDE","$CURRENT"].map(x=><button type="button" disabled={x!=="USDC"} title={x==="USDC"?"Live now":"Project tokens arrive with campaign distributions"} className={asset===x?"selected":""} onClick={()=>setAsset(x)} key={x}>{x}</button>)}</div></label>
      <label>Amount<div className="amount-input"><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><span>{asset}</span></div></label>
      <div className="two-fields"><label>Recipient rule<select><option>Anyone with the private link</option><option>Verified email</option><option>Verified X identity</option></select></label><label>Expiration<select><option>7 days</option><option>24 hours</option><option>30 days</option></select></label></div>
      <label>Message<textarea value={message} onChange={event=>setMessage(event.target.value)}/></label>
      <div className="fee-summary"><span>Distribution <b>{amount} {asset}</b></span><span>Sponsored gas <b>$0.02</b></span><span>Current CoFi fee <b>$0.00</b></span></div>
      {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
      <Button tone="blue" type="submit" disabled={submitting||fundingStep==="complete"}>{buttonLabel} <ArrowRight/></Button>
      {created&&<div className="link-result"><CheckCircle2/><div><b>{fundingStep==="complete"?"Funded claim link copied":"Secure claim link reserved"}</b><small>{fundingStep==="complete"?"The USDC is locked in the Arc vault and ready to claim.":"Complete both wallet approvals to make the link claimable."}</small></div><button type="button" onClick={()=>void navigator.clipboard?.writeText(created.claimUrl)} aria-label="Copy claim link"><Copy/></button></div>}</form>
      <aside className="live-link-preview"><FluidCanvas/><Eyebrow light>LIVE PREVIEW</Eyebrow><span className="preview-token">{asset[0]}</span><small>You’re sending</small><strong>{amount || "0"} {asset}</strong><p>{message}</p><button>Claim — no gas required</button>{created&&<div className="created-toast"><CheckCircle2/>{fundingStep==="complete"?"Vault funded":"Link secured"}</div>}</aside></div></>;
}

function ProjectOnboarding({go}:{go:(v:View)=>void}) {
  const [step,setStep]=useState(1);
  return <><PageHero eyebrow="PROJECT ONBOARDING" title="Connect your source." copy="Create the organization, verify the token, fund gas sponsorship, and invite the people who operate your currents."/>
    <div className="onboarding-shell"><div className="onboarding-progress">{["Project","Token","Team","Review"].map((x,i)=><span className={step>=i+1?"active":""} key={x}><i>{step>i+1?<Check/>:i+1}</i>{x}</span>)}</div>
      <div className="form-panel onboarding-card"><Eyebrow>STEP {step} OF 4</Eyebrow><h2>{["Tell us about the project","Connect the project token","Invite the operating team","Review the source"][step-1]}</h2>
        {step===1&&<div className="field-grid"><label>Project name<input defaultValue="Tidebreak"/></label><label>Website<input defaultValue="https://tidebreak.xyz"/></label><label className="full">Description<textarea defaultValue="A community-owned strategy world built on Arc."/></label></div>}
        {step===2&&<div className="field-grid"><label className="full">Token contract<input defaultValue="0x2f...9B41"/></label><label>Symbol<input defaultValue="TIDE"/></label><label>Decimals<input defaultValue="18"/></label></div>}
        {step===3&&<div className="field-grid"><label className="full">Invite by email<input placeholder="builder@project.xyz"/></label><div className="team-invite full"><span>MC</span><div><b>Mara Chen</b><small>Owner · Full access</small></div><Status tone="green">Ready</Status></div></div>}
        {step===4&&<div className="review-stack"><span><CheckCircle2/><b>Project identity</b><small>Tidebreak</small></span><span><CheckCircle2/><b>Token verified</b><small>TIDE · 18 decimals</small></span><span><CheckCircle2/><b>Team permissions</b><small>1 owner</small></span></div>}
        <div className="form-actions"><Button tone="ghost" disabled={step===1} onClick={()=>setStep(Math.max(1,step-1))}>Back</Button><Button tone="blue" onClick={()=>step<4?setStep(step+1):go("new-campaign")}>{step<4?"Continue":"Create first campaign"} <ArrowRight/></Button></div>
      </div></div></>;
}

function Campaigns({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [managing,setManaging]=useState<string|null>(null);
  const [actionError,setActionError]=useState<string|null>(null);
  const manage=async(campaign:CampaignRecord)=>{
    if(campaign.status!=="active")return;
    setManaging(campaign.id);setActionError(null);
    try{
      const action: "cancel"|"refund"=campaign.expiresAt&&new Date(campaign.expiresAt).getTime()<=Date.now()?"refund":"cancel";
      const started=await currentApi.post<WalletActionResult>("/campaigns/manage",{distributionId:campaign.id,action});
      if(!started.complete){
        if(!started.challengeId)throw new Error("Circle did not return the campaign recovery approval.");
        await auth.executeChallenge(started.challengeId);
        await confirmWalletAction("/campaigns/manage",{distributionId:campaign.id,action},started.challengeId);
      }
      await network.refresh();
    }catch(error){setActionError(error instanceof Error?error.message:"The campaign could not be recovered.")}
    finally{setManaging(null)}
  };
  const totals=network.analytics?.totals;
  return <><PageHero eyebrow="CAMPAIGN NETWORK" title="Every current, one operating view." copy="Fund, publish, recover, and compare verified distribution performance across the organization." mode="branches"><Button tone="cyan" onClick={()=>go("new-campaign")}>New campaign <Plus/></Button></PageHero><div className="campaign-summary-grid"><MetricCard label="Live currents" value={(totals?.liveCampaigns??0).toLocaleString()} icon={Radio}/><MetricCard label="Recipients targeted" value={(totals?.targeted??0).toLocaleString()} icon={Gift}/><MetricCard label="Claims settled" value={(totals?.claimed??0).toLocaleString()} icon={CheckCircle2}/><MetricCard label="Claim conversion" value={`${(totals?.claimRate??0).toFixed(1)}%`} icon={Target}/></div>
    {actionError&&<p className="auth-system-note is-error"><X/>{actionError}</p>}
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to operate campaigns</h3><p>Your live campaign data and recovery controls appear after your embedded wallet is open.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<><CampaignTable campaigns={network.campaigns} loading={network.loading} onManage={campaign=>void manage(campaign)}/>{managing&&<div className="campaign-action-toast"><RefreshCw className="spin"/>Confirming campaign recovery on Arc…</div>}</>}</>;
}

function CampaignBuilder({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [step,setStep]=useState(1); const [mode,setMode]=useState("Allowlist");
  const [maxStep,setMaxStep]=useState(1);
  const [purpose,setPurpose]=useState("User acquisition");
  const [name,setName]=useState("Founding community current");
  const [tokenAddress,setTokenAddress]=useState("");
  const [defaultAmount,setDefaultAmount]=useState("25");
  const [csvText,setCsvText]=useState("");
  const [activationEvent,setActivationEvent]=useState("account.created");
  const [referralReward,setReferralReward]=useState("No referral reward");
  const [created,setCreated]=useState<CreatedCampaign|null>(null);
  const [copiedClaim,setCopiedClaim]=useState(false);
  const [fundingStep,setFundingStep]=useState<"idle"|"creating"|"approving"|"funding"|"complete">("idle");
  const [error,setError]=useState<string|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const recipients=useMemo(()=>{
    try{return parseRecipientCsv(csvText,defaultAmount)}catch{return []}
  },[csvText,defaultAmount]);
  const total=useMemo(()=>recipients.reduce((sum,row)=>sum+(Number(row.amount)||0),0),[recipients]);
  const upload=async(file:File|null)=>{
    if(!file)return;
    if(file.size>2_000_000){setError("Recipient CSV files must be smaller than 2 MB.");return}
    setCsvText(await file.text());setError(null);
  };
  const fund=async(campaign:CreatedCampaign)=>{
    setFundingStep("approving");
    const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:campaign.id,action:"approve"});
    if(!approval.complete){
      if(!approval.challengeId)throw new Error("Circle did not return the token approval.");
      await auth.executeChallenge(approval.challengeId);
      await confirmWalletAction("/campaigns/fund",{distributionId:campaign.id,action:"approve"},approval.challengeId);
    }
    setFundingStep("funding");
    const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:campaign.id,action:"deposit"});
    if(!deposit.complete){
      if(!deposit.challengeId)throw new Error("Circle did not return the campaign funding approval.");
      await auth.executeChallenge(deposit.challengeId);
      await confirmWalletAction("/campaigns/fund",{distributionId:campaign.id,action:"deposit"},deposit.challengeId);
    }
    setFundingStep("complete");downloadCampaignLinks(campaign);
  };
  const copyFirstClaim=async()=>{
    const claimUrl=created?.links[0]?.claimUrl;
    if(!claimUrl)return;
    await navigator.clipboard.writeText(claimUrl);
    setCopiedClaim(true);
    window.setTimeout(()=>setCopiedClaim(false),1800);
  };
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError(null);
    if(step<5){
      if(step===1&&!name.trim()){setError("Give this campaign a name first.");return}
      if(step===2&&(!defaultAmount||Number(defaultAmount)<=0)){setError("Enter a valid recipient amount.");return}
      if(step===3&&!recipients.length){setError("Upload or paste at least one valid recipient.");return}
      const nextStep=step+1;setStep(nextStep);setMaxStep(current=>Math.max(current,nextStep));return;
    }
    if(!auth.account){go("claim");return}
    setSubmitting(true);
    try{
      setFundingStep("creating");
      const campaign=await currentApi.post<CreatedCampaign>("/campaigns",{
        name,tokenAddress:tokenAddress||undefined,recipients,expiresInHours:168,
        activationEvent,referralReward,purpose,mode,
      });
      setCreated(campaign);await fund(campaign);
    }catch(campaignError){setError(campaignError instanceof Error?campaignError.message:"The campaign could not be created.");if(!created)setFundingStep("idle")}
    finally{setSubmitting(false)}
  };
  const labels=["Purpose","Asset","Recipients","Attribution","Fund"];
  return <><PageHero eyebrow="CAMPAIGN BUILDER" title="Design the current." copy="Every campaign is fully funded, measurable, recoverable, and ready for recipients without wallets." mode="branches"/>
    <div className="builder-shell"><aside>{labels.map((x,i)=>{const target=i+1;return <button type="button" disabled={target>maxStep} className={step===target?"active":step>target?"done":""} onClick={()=>setStep(target)} key={x}><i>{step>target?<Check/>:target}</i><span>{x}<small>{["Choose the outcome","Select what flows","Define the audience","Measure activation","Review and publish"][i]}</small></span></button>})}</aside>
      <form className="builder-panel" onSubmit={submit}>
        <Eyebrow>STEP {step} / 5</Eyebrow>
        <h2>{["What should this current accomplish?","What value will move?","Who receives it?","What counts as activation?","Fund and publish"][step-1]}</h2>
        {step===1&&<><label className="campaign-name-field">Campaign name<input value={name} onChange={event=>setName(event.target.value)} maxLength={100}/></label><div className="choice-cards">{[["Launch allocation",Gift],["User acquisition",Target],["Community rewards",Users],["Agent payments",Bot]].map(([x,I])=>{const Icon=I as typeof Gift;return <button type="button" className={purpose===x?"selected":""} onClick={()=>setPurpose(String(x))} key={String(x)}><Icon/><b>{String(x)}</b><small>Build a measurable {String(x).toLowerCase()} current.</small></button>})}</div></>}
        {step===2&&<div className="field-grid"><label className="full">Arc token contract<input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="Leave blank for Arc testnet USDC"/></label><label>Default reward per recipient<input value={defaultAmount} onChange={event=>setDefaultAmount(event.target.value)} inputMode="decimal"/></label><label>Expiration<select><option>7 days</option></select></label><p className="builder-note full"><ShieldCheck/>Custom tokens are verified directly against their Arc contract metadata before funding.</p></div>}
        {step===3&&<><div className="mode-tabs">{["Allowlist","Identity-bound"].map(x=><button type="button" className={mode===x?"active":""} onClick={()=>{setMode(x);setError(null)}} key={x}>{x}</button>)}</div><div className={`identity-mode-proof ${mode==="Identity-bound"?"active":""}`}><ShieldCheck/><div><b>{mode==="Identity-bound"?"The recipient must prove the assignment":"The private link is the claim credential"}</b><small>{mode==="Identity-bound"?"Email and wallet commitments are verified natively. X, game, and custom identities use a project-signed verifier attestation bound to the recipient wallet. A leaked link cannot redirect the reward.":"Any supported identity type can receive a private, single-use link."}</small></div></div><label className="upload-drop"><Upload/><h3>Drop a recipient CSV</h3><p>Columns: identity, identity_type, amount. Email, wallet, X, game, and custom IDs are accepted.</p><span className="cofi-button tone-ghost">Browse file</span><input type="file" accept=".csv,text/csv" onChange={event=>void upload(event.target.files?.[0]??null)}/></label><label className="csv-paste">Or paste recipient rows<textarea value={csvText} onChange={event=>setCsvText(event.target.value)} placeholder={"identity,identity_type,amount\nmember@example.com,email,25\n@playerone,x,50"}/></label><div className={`recipient-validation ${recipients.length?"valid":""}`}><CheckCircle2/><div><b>{recipients.length.toLocaleString()} valid recipients</b><small>{total.toLocaleString(undefined,{maximumFractionDigits:6})} total units will be fully funded</small></div></div></>}
        {step===4&&<div className="activation-builder"><label><span>Activation event</span><select value={activationEvent} onChange={event=>setActivationEvent(event.target.value)}><option value="account.created">Created embedded wallet</option><option value="project.onboarded">Completed project onboarding</option><option value="game.completed_3">Played 3 matches</option><option value="purchase.completed">Made first purchase</option><option value="custom.signed">Custom signed event</option></select></label><label><span>Referral reward</span><select value={referralReward} onChange={event=>setReferralReward(event.target.value)}><option>No referral reward</option><option>5 USDC per activated referral</option><option>Project token reward</option></select></label><div className="event-code"><Webhook/><code>{activationEvent}</code><Status tone="green">Attribution ready</Status></div></div>}
        {step===5&&<><div className="fund-review"><div><small>CAMPAIGN</small><b>{name}</b></div><div><small>RECIPIENTS</small><b>{recipients.length.toLocaleString()}</b></div><div><small>TOTAL ALLOCATION</small><b>{total.toLocaleString(undefined,{maximumFractionDigits:6})} {tokenAddress?"TOKEN":"USDC"}</b></div><div><small>CLAIM SECURITY</small><b>{mode}</b></div><div><small>SETTLEMENT</small><b>Merkle + signed claim</b></div><div><small>RECOVERY</small><b>Cancel or expiry refund</b></div></div>{created&&<div className="campaign-created-result"><CheckCircle2/><div><b>{fundingStep==="complete"?"Campaign live on Arc":"Campaign commitments secured"}</b><small>{created.recipientCount} {created.claimMode} links generated · {created.asset.symbol} · root {created.merkleRoot.slice(0,10)}…</small></div><div className="campaign-result-actions"><Button tone="ghost" onClick={()=>void copyFirstClaim()}>{copiedClaim?"Link copied":"Copy first link"} <Copy/></Button><Button tone="ghost" onClick={()=>downloadCampaignLinks(created)}>Download all <Download/></Button></div></div>}</>}
        {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
        <div className="form-actions"><Button tone="ghost" disabled={step===1||submitting} onClick={()=>setStep(step-1)}>Back</Button><Button tone="blue" type="submit" disabled={submitting||fundingStep==="complete"}>{step===5?(fundingStep==="creating"?"Building allowlist…":fundingStep==="approving"?"Approve token access…":fundingStep==="funding"?"Fund campaign vault…":fundingStep==="complete"?"Campaign live":auth.account?"Fund and publish":"Sign in to publish"):"Continue"} <ArrowRight/></Button></div>
      </form>
      <aside className="builder-receipt"><Eyebrow>CAMPAIGN CURRENT</Eyebrow><div className="receipt-source"><span>C</span><b>{name||"Untitled current"}</b></div><FluidCanvas mode="branches"/><div className="receipt-stats"><span><small>Recipients</small><b>{recipients.length.toLocaleString()}</b></span><span><small>Allocation</small><b>{total.toLocaleString(undefined,{maximumFractionDigits:2})}</b></span><span><small>Fully funded</small><b className="green">{fundingStep==="complete"?"Yes":"Required"}</b></span></div></aside>
    </div></>;
}

function CrosschainFunding({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [rail,setRail]=useState<"gateway"|"cctp">("gateway");
  return <><div className="funding-rail-switch" role="tablist" aria-label="USDC funding rail">
    <button className={rail==="gateway"?"active":""} role="tab" aria-selected={rail==="gateway"} onClick={()=>setRail("gateway")}><Zap/>Gateway Unified Balance<small>Consolidated USDC + direct mint</small></button>
    <button className={rail==="cctp"?"active":""} role="tab" aria-selected={rail==="cctp"} onClick={()=>setRail("cctp")}><Globe2/>CCTP V2 route<small>Burn, forward, and verify</small></button>
  </div>{rail==="gateway"?<GatewayFunding go={go} auth={auth}/>:<CctpFunding go={go} auth={auth}/>}</>;
}

function GatewayFunding({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [state,setState]=useState<GatewayFundingState|null>(null);
  const [distributionId,setDistributionId]=useState("");
  const [sourceChain,setSourceChain]=useState("ARC-TESTNET");
  const [selectedId,setSelectedId]=useState("");
  const [working,setWorking]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{
      const next=await currentApi.get<GatewayFundingState>("/gateway");
      setState(next);setSelectedId(current=>current||next.intents[0]?.id||"");setError(null);
    }catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Gateway funding is unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const fundable=network.campaigns.filter(campaign=>campaign.status==="awaiting_funding"&&campaign.asset==="USDC");
  const selected=state?.intents.find(intent=>intent.id===selectedId)??state?.intents[0]??null;
  const create=async()=>{
    const campaignId=distributionId||fundable[0]?.id;
    if(!campaignId){setError("Create a USDC campaign awaiting funding first.");return}
    setWorking(true);setError(null);
    try{
      const intent=await currentApi.post<GatewayFundingIntent>("/gateway",{action:"create",distributionId:campaignId,sourceChain,idempotencyKey:`gateway-${campaignId}-${sourceChain}-${crypto.randomUUID()}`});
      setSelectedId(intent.id);await refresh();
    }catch(createError){setError(createError instanceof Error?createError.message:"The Gateway route could not be created.")}
    finally{setWorking(false)}
  };
  const challengeAction=async(action:"wallet"|"approve"|"deposit"|"mint")=>{
    if(!selected)return;
    const first=await currentApi.post<WalletActionResult>("/gateway",{action,intentId:selected.id});
    if(!first.complete){
      if(!first.challengeId)throw new Error("Circle did not return a wallet approval.");
      await auth.executeChallenge(first.challengeId);
      await confirmWalletAction("/gateway",{action,intentId:selected.id},first.challengeId);
    }
  };
  const execute=async(action:"wallet"|"approve"|"deposit"|"mint")=>{
    setWorking(true);setError(null);
    try{await challengeAction(action);await refresh()}
    catch(actionError){setError(actionError instanceof Error?actionError.message:"The Gateway action could not be completed.")}
    finally{setWorking(false)}
  };
  const signAndSubmit=async()=>{
    if(!selected)return;
    setWorking(true);setError(null);
    try{
      const prepared=await currentApi.post<WalletActionResult>("/gateway",{action:"sign",intentId:selected.id});
      if(!prepared.challengeId)throw new Error("Circle did not return the Gateway signature request.");
      const result=await auth.executeChallenge(prepared.challengeId);
      const signature="data" in result?result.data?.signature:undefined;
      if(!signature)throw new Error("Circle did not return the approved EOA signature.");
      await currentApi.post("/gateway",{action:"submit",intentId:selected.id,signature});
      await refresh();
    }catch(signError){setError(signError instanceof Error?signError.message:"The Gateway transfer could not be signed.")}
    finally{setWorking(false)}
  };
  const sync=async()=>{
    if(!selected)return;setWorking(true);setError(null);
    try{await currentApi.post("/gateway",{action:"sync",intentId:selected.id});await refresh()}
    catch(syncError){setError(syncError instanceof Error?syncError.message:"Gateway status could not be refreshed.")}
    finally{setWorking(false)}
  };
  const fundVault=async()=>{
    if(!selected)return;setWorking(true);setError(null);
    try{
      for(const action of ["approve","deposit"] as const){
        const first=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:selected.distributionId,action});
        if(!first.complete){
          if(!first.challengeId)throw new Error("Circle did not return the Arc campaign approval.");
          await auth.executeChallenge(first.challengeId);
          await confirmWalletAction("/campaigns/fund",{distributionId:selected.distributionId,action},first.challengeId);
        }
      }
      await currentApi.post("/gateway",{action:"sync",intentId:selected.id});await refresh();
    }catch(fundError){setError(fundError instanceof Error?fundError.message:"The campaign vault could not be funded.")}
    finally{setWorking(false)}
  };
  const action=selected?.status==="created"||selected?.status==="wallet_authorizing"
    ? {label:"Create Gateway EOA",run:()=>execute("wallet"),icon:Wallet}
    : selected?.status==="wallet_ready"||selected?.status==="approving"
      ? {label:"Approve unified deposit",run:()=>execute("approve"),icon:ShieldCheck}
      : selected?.status==="approved"||selected?.status==="deposit_authorizing"
        ? {label:"Deposit to Gateway",run:()=>execute("deposit"),icon:ArrowRight}
        : selected?.status==="deposited"||selected?.status==="signature_authorizing"
          ? {label:"Sign Gateway transfer",run:signAndSubmit,icon:Fingerprint}
          : selected?.status==="attested"||selected?.status==="mint_authorizing"
            ? {label:"Mint USDC on Arc",run:()=>execute("mint"),icon:Zap}
            : selected?.status==="arc_arrived"
              ? {label:"Fund campaign vault",run:fundVault,icon:Lock}
              : null;
  const ActionIcon=action?.icon??CheckCircle2;
  return <><PageHero eyebrow="GATEWAY UNIFIED BALANCE" title="One USDC balance. Any campaign current." copy="Deposit USDC from supported networks into Circle Gateway, authorize the burn with a dedicated EOA, mint directly to the sponsored Arc account, and lock the result into a verifiable campaign." mode="network"><Status tone="green">Gateway integrated</Status></PageHero>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to open the Gateway console</h3><p>Current creates the correct Circle-controlled operator and destination accounts for you.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<><div className="gateway-balance-strip">
      <article><span><CircleDollarSign/></span><small>UNIFIED GATEWAY BALANCE</small><strong>{state?.unifiedBalance.total??"0.000000"} USDC</strong><p>Finalized deposits across {state?.unifiedBalance.balances.length??0} supported domains.</p></article>
      {(state?.unifiedBalance.balances.length?state.unifiedBalance.balances.slice(0,3):[{domain:26,balance:"0.000000",chain:"ARC-TESTNET",label:"Arc Testnet"}]).map(balance=><article className="gateway-chain-balance" key={`${balance.domain}-${balance.chain}`}><small>{balance.label}</small><strong>{Number(balance.balance).toFixed(6)}</strong><span>DOMAIN {balance.domain}</span></article>)}
      <article className="gateway-signer-proof"><Fingerprint/><small>SIGNER MODEL</small><strong>EOA operator</strong><p>Separate from the sponsored Arc recipient account.</p></article>
    </div>{state?.unifiedBalance.unavailable&&<p className="auth-system-note is-error"><HelpCircle/>{state.unifiedBalance.reason}</p>}
    <div className="funding-workspace">
      <section className="funding-compose data-panel">
        <div className="panel-head"><div><h3>New unified route</h3><p>Gateway deposit → EOA intent → Arc direct mint</p></div><Zap/></div>
        <div className="field-grid">
          <label className="full">Campaign<select value={distributionId} onChange={event=>setDistributionId(event.target.value)}><option value="">Select an awaiting USDC campaign</option>{fundable.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name} · {campaign.totalAmount} USDC</option>)}</select></label>
          <label className="full">Deposit network<select value={sourceChain} onChange={event=>setSourceChain(event.target.value)}>{state?.catalog.sourceChains.map(chain=><option value={chain.code} key={chain.code}>{chain.label}</option>)}</select></label>
        </div>
        <div className="funding-route-preview gateway-route-preview"><span><i>1</i><b>EOA operator</b></span><ArrowRight/><span><i>2</i><b>Unified balance</b></span><ArrowRight/><span><i>3</i><b>Arc mint</b></span><ArrowRight/><span><i>4</i><b>Campaign vault</b></span></div>
        <Button tone="blue" onClick={()=>void create()} disabled={working||!fundable.length}>Create Gateway route <ArrowRight/></Button>
        <p className="builder-note"><ShieldCheck/>Gateway requires an EOA signature. Current keeps that operator separate from your gas-sponsored Arc account and verifies every signature before submission.</p>
      </section>
      <section className="funding-routes data-panel">
        <div className="panel-head"><div><h3>Gateway control</h3><p>{state?.intents.length??0} durable funding intents</p></div>{working?<RefreshCw className="spin"/>:<Radio/>}</div>
        {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
        {!selected&&<div className="campaign-empty compact"><Zap/><b>No Gateway route yet</b><p>Create one to establish an auditable unified-balance settlement record.</p></div>}
        {selected&&<div className="funding-detail">
          <div className="funding-title"><div><Status tone={selected.status==="complete"?"green":"cyan"}>{selected.status.replaceAll("_"," ")}</Status><h3>{selected.source.label} <ArrowRight/> Gateway <ArrowRight/> Arc</h3><p>{formatAtomic(selected.amountAtomic)} USDC allocation · up to {formatAtomic(selected.maxFeeAtomic)} USDC Gateway fee reserve</p></div><small>{selected.id.slice(0,8)}</small></div>
          <div className="funding-stage-list gateway-stage-list">{selected.stages.map((stage,index)=><div className={stage.complete?"complete":""} key={stage.id}><i>{stage.complete?<Check/>:index+1}</i><span><b>{stage.label}</b><small>{["EOA ownership verified","Gateway deposit recorded","Burn intent accepted","Arc mint confirmed","Vault funding anchored"][index]}</small></span></div>)}</div>
          <div className="gateway-proof-row"><span><small>OPERATOR</small><code>{selected.sourceWalletAddress?`${selected.sourceWalletAddress.slice(0,8)}…${selected.sourceWalletAddress.slice(-6)}`:"Not created"}</code></span><span><small>TRANSFER</small><code>{selected.transferId??"Not attested"}</code></span></div>
          <div className="funding-proof-links">{selected.source.transactionUrl&&<a href={selected.source.transactionUrl} target="_blank" rel="noreferrer">Deposit proof <ArrowUpRight/></a>}{selected.destination.transactionUrl&&<a href={selected.destination.transactionUrl} target="_blank" rel="noreferrer">Arc mint proof <ArrowUpRight/></a>}</div>
          <div className="form-actions"><Button tone="ghost" onClick={()=>void sync()} disabled={working}>Refresh proof <RefreshCw/></Button>{action&&<Button tone="blue" onClick={()=>void action.run()} disabled={working}>{action.label} <ActionIcon/></Button>}</div>
        </div>}
        {!!state?.intents.length&&<div className="funding-intent-tabs">{state.intents.map(intent=><button className={intent.id===selected?.id?"active":""} onClick={()=>setSelectedId(intent.id)} key={intent.id}><span>{intent.source.label} → Gateway</span><Status tone={intent.status==="complete"?"green":"grey"}>{intent.status.replaceAll("_"," ")}</Status></button>)}</div>}
      </section>
    </div></>}</>;
}

function CctpFunding({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [state,setState]=useState<FundingState|null>(null);
  const [distributionId,setDistributionId]=useState("");
  const [sourceChain,setSourceChain]=useState("BASE-SEPOLIA");
  const [selectedId,setSelectedId]=useState("");
  const [working,setWorking]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{
      const next=await currentApi.get<FundingState>("/funding");
      setState(next);
      setSelectedId(current=>current||next.intents[0]?.id||"");
      setError(null);
    }catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Funding routes are unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const fundable=network.campaigns.filter(campaign=>campaign.status==="awaiting_funding"&&campaign.asset==="USDC");
  const selected=state?.intents.find(intent=>intent.id===selectedId)??state?.intents[0]??null;
  const execute=async(action:"wallet"|"approve"|"burn")=>{
    if(!selected)return;
    setWorking(true);setError(null);
    try{
      const first=await currentApi.post<WalletActionResult>("/funding",{action,intentId:selected.id});
      if(!first.complete){
        if(!first.challengeId)throw new Error("Circle did not return a wallet approval.");
        await auth.executeChallenge(first.challengeId);
        await confirmWalletAction("/funding",{action,intentId:selected.id},first.challengeId);
      }
      await refresh();
    }catch(actionError){setError(actionError instanceof Error?actionError.message:"The funding action could not be completed.")}
    finally{setWorking(false)}
  };
  const create=async()=>{
    const campaignId=distributionId||fundable[0]?.id;
    if(!campaignId){setError("Create a USDC campaign awaiting funding first.");return}
    setWorking(true);setError(null);
    try{
      const intent=await currentApi.post<FundingIntent>("/funding",{
        action:"create",distributionId:campaignId,sourceChain,
        idempotencyKey:`web-${campaignId}-${sourceChain}-${crypto.randomUUID()}`,
      });
      setSelectedId(intent.id);await refresh();
    }catch(createError){setError(createError instanceof Error?createError.message:"The route could not be created.")}
    finally{setWorking(false)}
  };
  const sync=async()=>{
    if(!selected)return;
    setWorking(true);setError(null);
    try{await currentApi.post("/funding",{action:"sync",intentId:selected.id});await refresh()}
    catch(syncError){setError(syncError instanceof Error?syncError.message:"Circle route status is unavailable.")}
    finally{setWorking(false)}
  };
  const fundVault=async()=>{
    if(!selected)return;
    setWorking(true);setError(null);
    try{
      for(const action of ["approve","deposit"] as const){
        const first=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:selected.distributionId,action});
        if(!first.complete){
          if(!first.challengeId)throw new Error("Circle did not return the Arc campaign approval.");
          await auth.executeChallenge(first.challengeId);
          await confirmWalletAction("/campaigns/fund",{distributionId:selected.distributionId,action},first.challengeId);
        }
      }
      await currentApi.post("/funding",{action:"sync",intentId:selected.id});await refresh();
    }catch(fundError){setError(fundError instanceof Error?fundError.message:"The campaign vault could not be funded.")}
    finally{setWorking(false)}
  };
  const action=selected?.status==="created"||selected?.status==="wallet_authorizing"
    ? {label:"Create source wallet",run:()=>execute("wallet"),icon:Wallet}
    : selected?.status==="wallet_ready"||selected?.status==="approving"
      ? {label:"Approve source USDC",run:()=>execute("approve"),icon:ShieldCheck}
      : selected?.status==="approved"||selected?.status==="source_authorizing"
        ? {label:"Bridge USDC to Arc",run:()=>execute("burn"),icon:ArrowRight}
        : selected?.status==="source_confirmed"
          ? {label:"Check Arc arrival",run:sync,icon:RefreshCw}
          : selected?.status==="arc_arrived"
            ? {label:"Fund campaign vault",run:fundVault,icon:Lock}
            : null;
  const ActionIcon=action?.icon??CheckCircle2;
  return <><PageHero eyebrow="CROSSCHAIN CAMPAIGN FUNDING" title="Bring USDC into the current." copy="Route testnet USDC into Arc with Circle CCTP, verify both chains, then lock the arrived balance into a fully funded campaign vault." mode="network"><Status tone="green">CCTP V2 verified</Status></PageHero>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to create a funding route</h3><p>Current uses your Circle-controlled wallets for every source and Arc approval.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<div className="funding-workspace">
      <section className="funding-compose data-panel">
        <div className="panel-head"><div><h3>New funding route</h3><p>USDC campaigns only · Arc Testnet destination</p></div><Globe2/></div>
        <div className="field-grid">
          <label className="full">Campaign<select value={distributionId} onChange={event=>setDistributionId(event.target.value)}><option value="">Select an awaiting USDC campaign</option>{fundable.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name} · {campaign.totalAmount} USDC</option>)}</select></label>
          <label className="full">Source network<select value={sourceChain} onChange={event=>setSourceChain(event.target.value)}>{state?.catalog.sourceChains.map(chain=><option value={chain.code} key={chain.code}>{chain.label}</option>)}</select></label>
        </div>
        <div className="funding-route-preview"><span><i>1</i><b>Source wallet</b></span><ArrowRight/><span><i>2</i><b>CCTP V2</b></span><ArrowRight/><span><i>3</i><b>Arc wallet</b></span><ArrowRight/><span><i>4</i><b>Campaign vault</b></span></div>
        <Button tone="blue" onClick={()=>void create()} disabled={working||!fundable.length}>Create verified route <ArrowRight/></Button>
        {!fundable.length&&<p className="builder-note"><HelpCircle/>Create a USDC campaign first and leave it awaiting funding.</p>}
      </section>
      <section className="funding-routes data-panel">
        <div className="panel-head"><div><h3>Route control</h3><p>{state?.intents.length??0} persistent funding intents</p></div>{working?<RefreshCw className="spin"/>:<Radio/>}</div>
        {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
        {!selected&&<div className="campaign-empty compact"><Globe2/><b>No funding route yet</b><p>Create one to produce a crosschain settlement record.</p></div>}
        {selected&&<div className="funding-detail">
          <div className="funding-title"><div><Status tone={selected.status==="complete"?"green":"cyan"}>{selected.status.replaceAll("_"," ")}</Status><h3>{selected.source.label} <ArrowRight/> Arc Testnet</h3><p>{formatAtomic(selected.amountAtomic)} USDC campaign allocation · {formatAtomic(selected.forwardFeeAtomic)} USDC forward fee</p></div><small>{selected.id.slice(0,8)}</small></div>
          <div className="funding-stage-list">{selected.stages.map((stage,index)=><div className={stage.complete?"complete":""} key={stage.id}><i>{stage.complete?<Check/>:index+1}</i><span><b>{stage.label}</b><small>{["Quote and destination locked","Source transaction recorded","Circle forward transaction recorded","Distribution settlement recorded"][index]}</small></span></div>)}</div>
          <div className="funding-proof-links">{selected.source.transactionUrl&&<a href={selected.source.transactionUrl} target="_blank" rel="noreferrer">Source proof <ArrowUpRight/></a>}{selected.destination.transactionUrl&&<a href={selected.destination.transactionUrl} target="_blank" rel="noreferrer">Arc proof <ArrowUpRight/></a>}</div>
          <div className="form-actions"><Button tone="ghost" onClick={()=>void sync()} disabled={working}>Refresh proof <RefreshCw/></Button>{action&&<Button tone="blue" onClick={()=>void action.run()} disabled={working}>{action.label} <ActionIcon/></Button>}</div>
        </div>}
        {!!state?.intents.length&&<div className="funding-intent-tabs">{state.intents.map(intent=><button className={intent.id===selected?.id?"active":""} onClick={()=>setSelectedId(intent.id)} key={intent.id}><span>{intent.source.label}</span><Status tone={intent.status==="complete"?"green":"grey"}>{intent.status.replaceAll("_"," ")}</Status></button>)}</div>}
      </section>
    </div>}</>;
}

function Recipients({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [rows,setRows]=useState<CampaignRecipient[]>([]);const [loading,setLoading]=useState(Boolean(auth.account));const [query,setQuery]=useState("");const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if(!auth.account)return;
    const task=window.setTimeout(()=>{setLoading(true);currentApi.get<{recipients:CampaignRecipient[]}>("/campaigns/recipients").then(result=>setRows(result.recipients)).catch(fetchError=>setError(fetchError instanceof Error?fetchError.message:"Recipients unavailable.")).finally(()=>setLoading(false))},0);
    return()=>window.clearTimeout(task);
  },[auth.account]);
  const visible=rows.filter(row=>`${row.identity} ${row.campaignName} ${row.status}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHero eyebrow="RECIPIENT CURRENT" title="From targeted identity to settled user." copy="Inspect every allowlisted allocation and its verified Arc settlement state." mode="branches"><Button tone="cyan" onClick={()=>go("new-campaign")}>Upload recipients <Upload/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="data-panel"><div className="panel-head"><div><h3>Recipient network</h3><p>{rows.length.toLocaleString()} identities across live workspace campaigns</p></div><div className="table-actions"><label><Search/><input placeholder="Search identity" value={query} onChange={event=>setQuery(event.target.value)}/></label><button onClick={()=>go("new-campaign")}><Upload/>New allowlist</button></div></div><div className="recipient-table"><div className="table-head"><span>Recipient</span><span>Amount</span><span>Status</span><span>Campaign</span><span>Updated</span><span/></div>{loading&&<div className="campaign-empty compact"><RefreshCw className="spin"/><b>Reading allocations…</b></div>}{!loading&&!visible.length&&<div className="campaign-empty compact"><Users/><b>No matching recipients</b><p>Create or select a campaign to populate this verifiable record.</p></div>}{visible.map(row=><div className="table-row" key={row.id}><span className="recipient-name"><i>{row.identity.slice(0,2).toUpperCase()}</i><b>{row.identity}<small>{row.identityType}</small></b></span><b>{row.amount} {row.asset}</b><Status tone={row.status==="confirmed"?"green":row.status==="authorizing"?"blue":row.status==="refunded"?"grey":"cyan"}>{row.status}</Status><span>{row.campaignName}</span><time>{new Date(row.updatedAt).toLocaleDateString()}</time><button><MoreHorizontal/></button></div>)}</div></div></>;
}

function Referrals({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [state,setState]=useState<ReferralState|null>(null);
  const [campaignId,setCampaignId]=useState("");
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{setState(await currentApi.get<ReferralState>("/referrals"));setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Referral data is unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const selectedCampaignId=campaignId||network.campaigns[0]?.id||"";
  const createCode=async()=>{
    if(!selectedCampaignId)return;
    setCreating(true);setError(null);
    try{await currentApi.post("/referrals",{distributionId:selectedCampaignId});await refresh()}
    catch(createError){setError(createError instanceof Error?createError.message:"Referral code creation failed.")}
    finally{setCreating(false)}
  };
  const totals=state?.totals??{referrals:0,claimed:0,activated:0,activationRate:0};
  return <><PageHero eyebrow="ATTRIBUTION NETWORK" title="See which currents create active users." copy="Every referral keeps its source. Every signed activation moves credit through a measurable onchain campaign." mode="branches"/>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to open attribution</h3><p>Referral links and campaign conversion data belong to your Current workspace.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<><div className="referral-top"><div><small>ATTRIBUTED ACTIVATIONS</small><strong>{totals.activated.toLocaleString()}</strong><em><TrendingUp/>{totals.activationRate.toFixed(1)}% activation rate</em></div><div><small>REFERRALS CLAIMED</small><strong>{totals.claimed.toLocaleString()}</strong><span>{totals.referrals.toLocaleString()} live referral codes</span></div><div className="referral-visual"><FluidCanvas mode="branches"/><span className="ref-root">C</span>{(state?.sources.slice(0,5)??[]).map((source,i)=><span className={`ref-node r-${i}`} key={source.referrerUserId}>{source.name.slice(0,2).toUpperCase()}</span>)}</div></div>
    <div className="integration-create"><div><Eyebrow>CREATE A REFERRAL CURRENT</Eyebrow><h3>Give a campaign its own attributable path.</h3><p>Claims carrying this code remain tied to the referrer through signed project activation events.</p></div><label>Campaign<select value={selectedCampaignId} onChange={event=>setCampaignId(event.target.value)}><option value="">Choose campaign</option>{network.campaigns.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select></label><Button tone="blue" disabled={!selectedCampaignId||creating} onClick={()=>void createCode()}>{creating?"Creating…":"Create code"} <Plus/></Button></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="analysis-grid"><div className="data-panel"><div className="panel-head"><div><h3>Referral codes</h3><p>Append a code as <code>?ref=code</code> to its campaign claim link.</p></div><Status tone="green">Live data</Status></div>{state?.codes.map(code=><div className="key-row-new referral-code-row" key={code.id}><span className="key-symbol"><Link2/></span><div><b>{code.campaignName}</b><code>{code.code}</code></div><span>{code.referrerName}</span><time>{new Date(code.createdAt).toLocaleDateString()}</time><button aria-label="Copy referral code" onClick={()=>void navigator.clipboard.writeText(code.code)}><Copy/></button></div>)}{!state?.codes.length&&<div className="campaign-empty compact"><Network/><b>No referral paths yet</b><p>Create one for a funded campaign above.</p></div>}</div>
      <div className="data-panel"><div className="panel-head"><div><h3>Top referral sources</h3><p>Ranked by verified activations</p></div></div>{state?.sources.map((source,index)=><div className="leader-row" key={source.referrerUserId}><b>{index+1}</b><i>{source.name[0]?.toUpperCase()??"C"}</i><span><strong>{source.name}</strong><small>{source.code}</small></span><em>{source.activated} active</em><Status tone="green">{source.activationRate.toFixed(1)}%</Status></div>)}{!state?.sources.length&&<div className="campaign-empty compact"><Target/><b>Activation sources will appear here</b></div>}</div></div></>}</>;
}

function Analytics({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const totals=network.analytics?.totals;
  return <><PageHero eyebrow="CAMPAIGN INTELLIGENCE" title="Find where the current accelerates—or breaks." copy="Compare verified targeting, claim settlement, and activation signals without hiding behind vanity metrics."/>
    <div className="metric-grid-new"><MetricCard label="Recipients targeted" value={(totals?.targeted??0).toLocaleString()} icon={Users}/><MetricCard label="Claims settled" value={(totals?.claimed??0).toLocaleString()} icon={Gift}/><MetricCard label="Claim conversion" value={`${(totals?.claimRate??0).toFixed(1)}%`} icon={Activity}/><MetricCard label="Activation events" value={(totals?.activations??0).toLocaleString()} icon={Target}/></div>
    {network.error&&<p className="auth-system-note is-error"><X/>{network.error}</p>}
    <div className="analysis-grid"><div className="data-panel"><div className="panel-head"><div><h3>Campaign conversion</h3><p>Counts reconciled from confirmed Arc settlement</p></div><Status tone="green">Verifiable</Status></div><div className="conversion-current">{(network.analytics?.campaigns??[]).map(campaign=><div key={campaign.id}><span><b>{campaign.name}</b><small>{campaign.claimed.toLocaleString()} / {campaign.targeted.toLocaleString()}</small></span><i><b style={{width:`${campaign.claimRate}%`}}/></i><em>{campaign.claimRate.toFixed(1)}%</em></div>)}{!network.loading&&!network.analytics?.campaigns.length&&<div className="campaign-empty compact"><BarChart3/><b>No campaign data yet</b></div>}</div></div>
      <div className="data-panel"><div className="panel-head"><div><h3>Evidence ladder</h3><p>What Current CoFi can prove today</p></div></div>{[["Allowlist generated","Merkle root anchored before funding","Onchain"],["Campaign funded","Full token allocation deposited","Onchain"],["Recipient claimed","Unique bitmap index settled","Onchain"],["Wallet created","Circle user-controlled SCA","Circle"],["Activation completed","Signed project event","API"]].map((row,i)=><div className="quality-row" key={row[0]}><span className={`source-icon s-${i}`}><Network/></span><b>{row[0]}</b><span><small>EVIDENCE</small>{row[1]}</span><span><small>SOURCE</small>{row[2]}</span></div>)}</div></div>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Your live analytics are private</h3><p>Sign in to inspect campaign settlement and conversion data.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}</>;
}

const pilotIntegrationOptions = [
  ["circle-wallets", "Circle wallets"],
  ["gas-sponsorship", "Sponsored gas"],
  ["usdc", "USDC settlement"],
  ["project-token", "Project token"],
  ["identity-attestations", "Identity proof"],
  ["referrals", "Referral attribution"],
  ["activation-webhooks", "Activation webhooks"],
  ["agent-api", "Agent API"],
] as const;

function PilotOperations({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const requestedSlug=useMemo(
    ()=>typeof window==="undefined"?null:new URLSearchParams(window.location.search).get("pilot"),
    [],
  );
  const [pilots,setPilots]=useState<PilotRecord[]>([]);
  const [publicPilot,setPublicPilot]=useState<PublicPilot|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  const [partnerName,setPartnerName]=useState("");
  const [partnerWebsite,setPartnerWebsite]=useState("");
  const [useCase,setUseCase]=useState("");
  const [integrationMode,setIntegrationMode]=useState("hosted-links");
  const [targetRecipients,setTargetRecipients]=useState("100");
  const [targetClaimRate,setTargetClaimRate]=useState("60");
  const [targetActivationRate,setTargetActivationRate]=useState("30");
  const [dueAt,setDueAt]=useState("");
  const [integrations,setIntegrations]=useState<string[]>(["circle-wallets","gas-sponsorship","usdc"]);
  const [campaignChoice,setCampaignChoice]=useState<Record<string,string>>({});
  const [signerName,setSignerName]=useState("");
  const [signerRole,setSignerRole]=useState("");
  const [agreed,setAgreed]=useState(false);

  const refresh=useCallback(async()=>{
    if(!auth.account){setPilots([]);setLoading(false);return}
    setLoading(true);
    try{
      const result=await currentApi.get<{pilots:PilotRecord[]}>("/pilots");
      setPilots(result.pilots);setError(null);
    }catch(loadError){setError(loadError instanceof Error?loadError.message:"Pilot operations are unavailable.")}
    finally{setLoading(false)}
  },[auth.account]);
  const loadPublic=useCallback(async(slug:string)=>{
    setLoading(true);
    try{
      setPublicPilot(await currentApi.get<PublicPilot>(`/pilots/public?slug=${encodeURIComponent(slug)}`));
      setError(null);
    }catch(loadError){setError(loadError instanceof Error?loadError.message:"This pilot invitation is unavailable.")}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{
    const task=window.setTimeout(()=>requestedSlug?void loadPublic(requestedSlug):void refresh(),0);
    return()=>window.clearTimeout(task);
  },[loadPublic,refresh,requestedSlug]);
  const toggleIntegration=(value:string)=>setIntegrations(current=>
    current.includes(value)?current.filter(item=>item!==value):[...current,value],
  );
  const create=async()=>{
    setBusy(true);setError(null);
    try{
      await currentApi.post<PilotRecord>("/pilots",{
        partnerName,partnerWebsite:partnerWebsite||undefined,useCase,integrationMode,
        targetRecipients:Number(targetRecipients),targetClaimRate:Number(targetClaimRate),
        targetActivationRate:Number(targetActivationRate),requestedIntegrations:integrations,
        dueAt:dueAt?new Date(`${dueAt}T18:00:00Z`).toISOString():undefined,
      });
      setCreating(false);setPartnerName("");setPartnerWebsite("");setUseCase("");
      await refresh();
    }catch(createError){setError(createError instanceof Error?createError.message:"The pilot could not be created.")}
    finally{setBusy(false)}
  };
  const linkCampaign=async(pilotId:string)=>{
    const distributionId=campaignChoice[pilotId];
    if(!distributionId)return;
    setBusy(true);setError(null);
    try{
      await currentApi.post<PilotRecord>("/pilots",{action:"update",pilotId,distributionId});
      await refresh();
    }catch(linkError){setError(linkError instanceof Error?linkError.message:"The campaign could not be linked.")}
    finally{setBusy(false)}
  };
  const attest=async()=>{
    if(!requestedSlug)return;
    setBusy(true);setError(null);
    try{
      await currentApi.post(`/pilots/public?slug=${encodeURIComponent(requestedSlug)}`,{
        signerName,signerRole,agreed,statement:publicPilot?.attestationStatement,
      });
      await loadPublic(requestedSlug);
    }catch(attestError){setError(attestError instanceof Error?attestError.message:"The attestation could not be recorded.")}
    finally{setBusy(false)}
  };
  const totals=pilots.reduce((current,pilot)=>({
    active:current.active+(pilot.status==="complete"?0:1),
    ready:current.ready+(pilot.readinessScore>=70?1:0),
    attested:current.attested+(pilot.attestation?1:0),
    recipients:current.recipients+(pilot.campaign?.recipientCount??pilot.targets.recipients),
  }),{active:0,ready:0,attested:0,recipients:0});

  if(requestedSlug){
    const pilot=publicPilot?.pilot;
    return <><PageHero eyebrow="PARTNER PILOT" title={pilot?`${pilot.partnerName} × Current CoFi`:"Verify the pilot current."} copy={pilot?.useCase??"Open a partner pilot record, inspect its measurable targets, and confirm participation without creating an account."} mode="branches">
      {pilot?.attestation&&<Button tone="light" onClick={()=>navigator.clipboard.writeText(pilot.attestation?.digest??"")}>Copy attestation digest <Copy/></Button>}
    </PageHero>
      {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
      {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Loading pilot record</b><small>Reconciling campaign proof and partner confirmation.</small></div></div>}
      {pilot&&<div className="pilot-public-shell">
        <section className="pilot-public-summary">
          <div className="pilot-score-ring" style={{"--pilot-score":`${pilot.readinessScore*3.6}deg`} as React.CSSProperties}><strong>{pilot.readinessScore}</strong><small>/100</small></div>
          <div><Status tone={pilot.status==="complete"?"green":"cyan"}>{pilot.status}</Status><h2>{pilot.partnerName}</h2><p>{pilot.useCase}</p><div className="pilot-target-strip"><span><small>TARGET USERS</small><b>{pilot.targets.recipients.toLocaleString()}</b></span><span><small>CLAIM TARGET</small><b>{pilot.targets.claimRate}%</b></span><span><small>ACTIVATION TARGET</small><b>{pilot.targets.activationRate}%</b></span></div></div>
        </section>
        <section className="data-panel pilot-public-proof"><div className="panel-head"><div><h3>Live readiness record</h3><p>Product facts update from Current CoFi campaign settlement</p></div><Status tone="blue">{pilot.milestones.filter(item=>item.passed).length}/{pilot.milestones.length} proven</Status></div><div className="pilot-milestones">{pilot.milestones.map(item=><article className={item.passed?"passed":""} key={item.id}><span>{item.passed?<Check/>:<Clock3/>}</span><div><b>{item.label}</b><small>{item.evidence}</small></div></article>)}</div></section>
        {pilot.attestation?<section className="pilot-attested"><BadgeCheck/><div><Eyebrow>PARTNER CONFIRMED</Eyebrow><h3>Participation is digest verified.</h3><p>{pilot.attestation.statement}</p><b>{pilot.attestation.signerName} · {pilot.attestation.signerRole}</b><code>{pilot.attestation.digest}</code><small>{new Date(pilot.attestation.attestedAt).toLocaleString()}</small></div></section>:<section className="pilot-attest-form"><div><Eyebrow>PARTNER ATTESTATION</Eyebrow><h2>Confirm the pilot.</h2><p>This creates a permanent confirmation digest that can be included in Current CoFi&apos;s Circle grant evidence. It does not authorize transactions or expose recipient identities.</p></div><div className="form-grid"><label>Your name<input value={signerName} onChange={event=>setSignerName(event.target.value)} placeholder="Founder or project lead"/></label><label>Your role<input value={signerRole} onChange={event=>setSignerRole(event.target.value)} placeholder="Founder, CEO, community lead"/></label><label className="pilot-agree"><input type="checkbox" checked={agreed} onChange={event=>setAgreed(event.target.checked)}/><span>{publicPilot?.attestationStatement}</span></label><Button tone="blue" disabled={busy||!agreed||!signerName||!signerRole} onClick={()=>void attest()}>{busy?"Recording…":"Sign pilot attestation"} <BadgeCheck/></Button></div></section>}
      </div>}
    </>;
  }

  return <><PageHero eyebrow="PILOT OPERATIONS" title="Turn partners into proof." copy="Onboard real Arc projects, define measurable success, link production campaigns, and collect partner-signed validation for the Circle grant review." mode="branches"><Button tone="cyan" onClick={()=>setCreating(current=>!current)}>{creating?"Close brief":"Open new pilot"} <Plus/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!auth.account&&!loading&&<div className="pilot-intro">
      <article><Handshake/><span>EXTERNAL VALIDATION</span><h3>Real builders, named pilots.</h3><p>Replace vague letters of interest with structured pilot records linked to actual Arc campaigns.</p></article>
      <article><Target/><span>MEASURABLE OUTCOMES</span><h3>Agree on success first.</h3><p>Set recipient, claim, and activation targets before tokens begin flowing.</p></article>
      <article><BadgeCheck/><span>SIGNED PROOF</span><h3>Founder confirmation by link.</h3><p>Partners inspect the live record and create a digest-verified attestation without an account.</p></article>
      <div className="campaign-empty"><Lock/><h3>Open pilot operations</h3><p>Sign in to begin onboarding external Arc projects.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>
    </div>}
    {auth.account&&<>{creating&&<section className="pilot-create-panel"><div><Eyebrow>NEW PARTNER PILOT</Eyebrow><h2>Define the proof before launch.</h2><p>Current CoFi will track every milestone against campaign and partner evidence.</p></div><div className="pilot-create-fields"><label>Partner name<input value={partnerName} onChange={event=>setPartnerName(event.target.value)} placeholder="Tidebreak Games"/></label><label>Partner website<input value={partnerWebsite} onChange={event=>setPartnerWebsite(event.target.value)} placeholder="https://"/></label><label className="wide">Pilot use case<textarea value={useCase} onChange={event=>setUseCase(event.target.value)} placeholder="What audience will this project activate with Current CoFi?"/></label><label>Integration mode<select value={integrationMode} onChange={event=>setIntegrationMode(event.target.value)}><option value="hosted-links">Hosted claim links</option><option value="react-embed">React embed</option><option value="server-sdk">Server SDK</option><option value="agent-api">Agent API</option></select></label><label>Target recipients<input type="number" min="1" value={targetRecipients} onChange={event=>setTargetRecipients(event.target.value)}/></label><label>Claim target %<input type="number" min="0" max="100" value={targetClaimRate} onChange={event=>setTargetClaimRate(event.target.value)}/></label><label>Activation target %<input type="number" min="0" max="100" value={targetActivationRate} onChange={event=>setTargetActivationRate(event.target.value)}/></label><label>Target completion<input type="date" value={dueAt} onChange={event=>setDueAt(event.target.value)}/></label><div className="pilot-integration-picker wide">{pilotIntegrationOptions.map(([value,label])=><button className={integrations.includes(value)?"active":""} onClick={()=>toggleIntegration(value)} key={value}>{integrations.includes(value)?<Check/>:<Plus/>}{label}</button>)}</div><div className="pilot-create-action wide"><span>{integrations.length} integration{integrations.length===1?"":"s"} selected</span><Button tone="blue" disabled={busy||!partnerName||!useCase} onClick={()=>void create()}>{busy?"Creating…":"Create pilot"} <Rocket/></Button></div></div></section>}
      <div className="metric-grid-new pilot-metrics"><MetricCard label="Active pilots" value={totals.active.toString()} icon={Handshake}/><MetricCard label="Launch ready" value={totals.ready.toString()} icon={Rocket}/><MetricCard label="Partner attested" value={totals.attested.toString()} icon={BadgeCheck}/><MetricCard label="Targeted recipients" value={totals.recipients.toLocaleString()} icon={Users}/></div>
      {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling pilots</b><small>Checking linked campaigns, Arc anchors, and partner attestations.</small></div></div>}
      {!loading&&!pilots.length&&<div className="campaign-empty pilot-empty"><Handshake/><h3>No external pilots yet</h3><p>Create the first partner brief, agree on outcomes, and send its confirmation link.</p><Button tone="blue" onClick={()=>setCreating(true)}>Open first pilot <Plus/></Button></div>}
      <div className="pilot-board">{pilots.map(pilot=><article className="pilot-card" key={pilot.id}><header><div className="pilot-mark">{pilot.partnerName.slice(0,2).toUpperCase()}</div><div><Status tone={pilot.status==="complete"?"green":pilot.status==="live"||pilot.status==="measuring"?"cyan":"grey"}>{pilot.status}</Status><h3>{pilot.partnerName}</h3><p>{pilot.useCase}</p></div><div className="pilot-score"><strong>{pilot.readinessScore}</strong><small>READY</small></div></header><div className="pilot-stat-row"><span><small>USERS</small><b>{(pilot.campaign?.recipientCount??pilot.targets.recipients).toLocaleString()}</b></span><span><small>CLAIM RATE</small><b>{pilot.campaign?`${pilot.campaign.claimRate.toFixed(1)}%`:`${pilot.targets.claimRate}% target`}</b></span><span><small>ACTIVATION</small><b>{pilot.campaign?`${pilot.campaign.activationRate.toFixed(1)}%`:`${pilot.targets.activationRate}% target`}</b></span></div><div className="pilot-progress"><i><b style={{width:`${pilot.readinessScore}%`}}/></i><span>{pilot.milestones.filter(item=>item.passed).length} of {pilot.milestones.length} milestones proven</span></div><div className="pilot-checks">{pilot.milestones.map(item=><span className={item.passed?"passed":""} key={item.id}>{item.passed?<Check/>:<Clock3/>}{item.label}</span>)}</div>{!pilot.campaign&&<div className="pilot-link-campaign"><select value={campaignChoice[pilot.id]??""} onChange={event=>setCampaignChoice(current=>({...current,[pilot.id]:event.target.value}))}><option value="">Select campaign</option>{network.campaigns.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select><Button tone="ghost" disabled={busy||!campaignChoice[pilot.id]} onClick={()=>void linkCampaign(pilot.id)}>Link campaign</Button></div>}<footer><button onClick={()=>navigator.clipboard.writeText(pilotShareUrl(pilot.publicSlug))}><Share2/>Copy partner link</button>{pilot.partnerWebsite&&<a href={pilot.partnerWebsite} target="_blank" rel="noreferrer">Partner site <ArrowUpRight/></a>}<span>{pilot.dueAt?`Due ${new Date(pilot.dueAt).toLocaleDateString()}`:"Open schedule"}</span></footer></article>)}</div>
    </>}
  </>;
}

function Evidence({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [reports,setReports]=useState<EvidenceReportSummary[]>([]);
  const [active,setActive]=useState<EvidenceReport|null>(null);
  const [campaignId,setCampaignId]=useState("");
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const requestedSlug=useMemo(
    ()=>typeof window==="undefined"?null:new URLSearchParams(window.location.search).get("evidence"),
    [],
  );
  const loadPublic=useCallback(async(slug:string)=>{
    setLoading(true);setError(null);
    try{setActive(await currentApi.get<EvidenceReport>(`/evidence/public?slug=${encodeURIComponent(slug)}`))}
    catch(loadError){setError(loadError instanceof Error?loadError.message:"The evidence report is unavailable.")}
    finally{setLoading(false)}
  },[]);
  const loadReports=useCallback(async()=>{
    if(!auth.account){setLoading(false);return}
    setLoading(true);setError(null);
    try{
      const result=await currentApi.get<{reports:EvidenceReportSummary[]}>("/evidence");
      setReports(result.reports);
      if(result.reports[0])await loadPublic(result.reports[0].publicSlug);
    }catch(loadError){setError(loadError instanceof Error?loadError.message:"Grant evidence is unavailable.");setLoading(false)}
    finally{setLoading(false)}
  },[auth.account,loadPublic]);
  useEffect(()=>{
    const task=window.setTimeout(()=>{
      if(requestedSlug)void loadPublic(requestedSlug);
      else void loadReports();
    },0);
    return()=>window.clearTimeout(task);
  },[loadPublic,loadReports,requestedSlug]);
  const create=async()=>{
    setCreating(true);setError(null);
    try{
      const report=await currentApi.post<EvidenceReport>("/evidence",campaignId?{distributionId:campaignId}:{});
      setActive(report);
      const list=await currentApi.get<{reports:EvidenceReportSummary[]}>("/evidence");
      setReports(list.reports);
      history.replaceState(null,"",`${location.pathname}#/evidence`);
    }catch(createError){setError(createError instanceof Error?createError.message:"The evidence snapshot could not be created.")}
    finally{setCreating(false)}
  };
  const share=async(report:EvidenceReport|EvidenceReportSummary)=>{
    await navigator.clipboard.writeText(evidenceShareUrl(report.publicSlug));
  };
  const snapshot=active?.snapshot;
  const publicMode=Boolean(requestedSlug);
  return <><PageHero eyebrow="GRANT EVIDENCE" title="Prove the product, not the pitch." copy="Freeze Arc settlements, Circle wallet onboarding, identity attestations, activations, referrals, and builder integrations into one shareable verification record." mode="branches">
    {active&&<><Button tone="cyan" onClick={()=>void share(active)}>Copy public proof <Share2/></Button><Button tone="light" onClick={()=>downloadEvidenceReport(active)}>Export JSON <Download/></Button></>}
  </PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling the evidence current</b><small>Reading immutable report data and checking its SHA-256 digest.</small></div></div>}
    {!loading&&!auth.account&&!publicMode&&!active&&<div className="evidence-intro-grid">
      <article><FileCheck2/><span>ONE REVIEW RECORD</span><h3>Everything Circle needs to inspect.</h3><p>Campaign funding, claims, wallets, activations, identity proof, integrations, and transaction anchors are assembled without exposing recipient identities.</p></article>
      <article><BadgeCheck/><span>TAMPER EVIDENT</span><h3>Every snapshot has a digest.</h3><p>Reports use canonical JSON and SHA-256 verification so a reviewer can confirm that the shared evidence still matches the stored snapshot.</p></article>
      <article><Share2/><span>PUBLIC BY LINK</span><h3>No reviewer account required.</h3><p>Generate a public verification URL and export the complete machine-readable evidence package.</p></article>
      <div className="campaign-empty"><Lock/><h3>Open your workspace evidence</h3><p>Sign in to generate an immutable report from your live Current CoFi campaigns.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>
    </div>}
    {auth.account&&!publicMode&&<div className="evidence-create">
      <div><Eyebrow>CREATE A REVIEW SNAPSHOT</Eyebrow><h3>Freeze today&apos;s grant evidence.</h3><p>Select one pilot or include the complete project. Reports never include raw recipient identities.</p></div>
      <label>Evidence scope<select value={campaignId} onChange={event=>setCampaignId(event.target.value)}><option value="">Complete Current CoFi project</option>{network.campaigns.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select></label>
      <Button tone="blue" disabled={creating} onClick={()=>void create()}>{creating?"Reconciling…":"Generate report"} <FileCheck2/></Button>
    </div>}
    {snapshot&&active&&<>
      <section className="evidence-proof-head">
        <div className="evidence-score"><div style={{"--evidence-score":`${snapshot.readiness.score*3.6}deg`} as React.CSSProperties}><span>{snapshot.readiness.score}</span><small>/ 100</small></div><p><b>Grant evidence score</b><small>{snapshot.readiness.earned} of {snapshot.readiness.possible} weighted checks proven</small></p></div>
        <div className="evidence-identity"><Status tone={active.integrity?.valid===false?"red":"green"}>{active.integrity?.valid===false?"Integrity failed":"Integrity verified"}</Status><h2>{snapshot.project.name}</h2><p>{snapshot.purpose}</p><code>{active.digest}</code><small>SHA-256 · {new Date(snapshot.generatedAt).toLocaleString()}</small></div>
        <div className="evidence-actions"><Button tone="dark" onClick={()=>void share(active)}>Copy proof URL <Copy/></Button><Button tone="ghost" onClick={()=>downloadEvidenceReport(active)}>Download evidence <Download/></Button></div>
      </section>
      <div className="metric-grid-new evidence-metrics"><MetricCard label="Recipients targeted" value={snapshot.totals.recipients.toLocaleString()} icon={Users}/><MetricCard label="Claims settled" value={snapshot.totals.claims.toLocaleString()} icon={Gift}/><MetricCard label="Wallets created" value={snapshot.totals.walletsCreated.toLocaleString()} icon={Wallet}/><MetricCard label="Activations proven" value={snapshot.totals.activations.toLocaleString()} icon={Target}/></div>
      <div className="evidence-grid">
        <div className="data-panel"><div className="panel-head"><div><h3>Circle readiness checks</h3><p>Weighted evidence captured in this immutable snapshot</p></div><Status tone="green">{snapshot.readiness.score}% proven</Status></div>
          <div className="evidence-criteria">{snapshot.readiness.criteria.map(item=><div className={item.passed?"passed":""} key={item.id}><span>{item.passed?<Check/>:<Clock3/>}</span><div><b>{item.label}</b><small>{item.evidence}</small></div><em>{item.weight} pts</em></div>)}</div>
        </div>
        <div className="data-panel"><div className="panel-head"><div><h3>Verification source</h3><p>Public network and protocol anchors</p></div><Status tone="blue">{snapshot.network.name}</Status></div>
          <div className="evidence-network"><span><small>CHAIN ID</small><b>{snapshot.network.chainId}</b></span><span><small>USDC</small><code>{snapshot.network.usdcAddress}</code></span><span><small>CAMPAIGN VAULT</small><code>{snapshot.network.campaignVaultAddress??"Not configured"}</code></span><span><small>PRIVACY</small><b>Aggregate proof only</b></span></div>
        </div>
      </div>
      <div className="data-panel evidence-campaigns"><div className="panel-head"><div><h3>Pilot campaign proof</h3><p>Funding, targeting, identity, activation, and Arc transaction anchors</p></div><Status tone="green">{snapshot.campaigns.length} included</Status></div>
        {snapshot.campaigns.map(campaign=><article key={campaign.id}><div className="evidence-campaign-title"><span>{campaign.asset.symbol.slice(0,2)}</span><div><b>{campaign.name}</b><small>{campaign.targeting.claimMode} · {campaign.status}</small></div><Status tone={campaign.anchors.fundingTransactionHash?"green":"cyan"}>{campaign.anchors.fundingTransactionHash?"Funded":"Awaiting funding"}</Status></div><div className="evidence-campaign-stats"><span><small>TARGETED</small><b>{campaign.targeting.targeted}</b></span><span><small>SETTLED</small><b>{campaign.targeting.claimed}</b></span><span><small>CLAIM RATE</small><b>{campaign.targeting.claimRate.toFixed(1)}%</b></span><span><small>ACTIVATIONS</small><b>{campaign.activation.total}</b></span><span><small>ATTESTATIONS</small><b>{campaign.identityVerification.attestations}</b></span></div><div className="evidence-anchor-row"><code>{campaign.anchors.merkleRoot??"Merkle root pending"}</code>{campaign.anchors.fundingTransactionHash&&<a href={`${snapshot.network.explorerUrl}/tx/${campaign.anchors.fundingTransactionHash}`} target="_blank" rel="noreferrer">Funding transaction <ArrowUpRight/></a>}<span>{campaign.anchors.claimTransactions.length} claim transaction{campaign.anchors.claimTransactions.length===1?"":"s"}</span></div></article>)}
        {!snapshot.campaigns.length&&<div className="campaign-empty compact"><FileCheck2/><b>No campaign evidence yet</b><p>Create and fund a pilot campaign before generating the next report.</p></div>}
      </div>
    </>}
    {!publicMode&&reports.length>0&&<div className="data-panel evidence-history"><div className="panel-head"><div><h3>Evidence history</h3><p>Immutable snapshots already shared with reviewers</p></div><Status tone="green">{reports.length} reports</Status></div>{reports.map(report=><div className="evidence-report-row" key={report.id}><span><FileCheck2/></span><div><b>{report.project.name}</b><code>{report.digest.slice(0,20)}…</code></div><strong>{report.readinessScore}<small>/100</small></strong><time>{new Date(report.createdAt).toLocaleDateString()}</time><button aria-label="Open evidence report" onClick={()=>void loadPublic(report.publicSlug)}><Eye/></button><button aria-label="Copy public evidence URL" onClick={()=>void share(report)}><Copy/></button></div>)}</div>}
  </>;
}

function TokenDashboard({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [economy,setEconomy]=useState<TokenEconomyState|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [lockAmount,setLockAmount]=useState("100");
  const [durationDays,setDurationDays]=useState("90");
  const [feeAmount,setFeeAmount]=useState("1");
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{setEconomy(await currentApi.get<TokenEconomyState>("/token/economy"));setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"The live economy could not be read.")}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh,auth.account]);
  const runAction=async(kind:"project-lock"|"product-fee")=>{
    if(!auth.account){go("claim");return}
    setBusy(true);setError(null);
    try{
      const started=await currentApi.post<WalletActionResult&{actionId:string}>("/token/economy",{
        stage:"approve",kind,amount:kind==="project-lock"?lockAmount:feeAmount,
        durationDays:kind==="project-lock"?Number(durationDays):undefined,
        reference:kind==="project-lock"?"Current workspace access":`Product fee proof ${new Date().toISOString()}`,
      });
      if(!started.challengeId)throw new Error("The asset approval challenge was not created.");
      await auth.executeChallenge(started.challengeId);
      await confirmWalletAction("/token/economy",{stage:"approve",actionId:started.actionId},started.challengeId);
      const execution=await currentApi.post<WalletActionResult>("/token/economy",{stage:"execute",actionId:started.actionId});
      if(!execution.challengeId)throw new Error("The economy action challenge was not created.");
      await auth.executeChallenge(execution.challengeId);
      await confirmWalletAction("/token/economy",{stage:"execute",actionId:started.actionId},execution.challengeId);
      if(kind==="project-lock"){
        const activation=await currentApi.post<WalletActionResult>("/token/economy",{stage:"activate",actionId:started.actionId});
        if(!activation.challengeId)throw new Error("The project access challenge was not created.");
        await auth.executeChallenge(activation.challengeId);
        await confirmWalletAction("/token/economy",{stage:"activate",actionId:started.actionId},activation.challengeId);
      }
      await refresh();
    }catch(actionError){setError(actionError instanceof Error?actionError.message:"The economy action did not complete.")}
    finally{setBusy(false)}
  };
  const metrics=economy?.metrics;
  const explorer=economy?.explorerUrl;
  const openContract=(address?:string)=>{if(address&&explorer)window.open(`${explorer}/address/${address}`,"_blank","noopener,noreferrer")};
  const allocations=[
    ["Buyback reserve",economy?.allocations?.buybackBps??3500,"#25E8E1"],
    ["Gas sponsorship",economy?.allocations?.gasBps??2500,"#173BFF"],
    ["Protocol liquidity",economy?.allocations?.liquidityBps??2000,"#20D66B"],
    ["Operations",economy?.allocations?.operationsBps??2000,"#6B7E86"],
  ] as const;
  return <><PageHero eyebrow="TRANSPARENT PRODUCT ECONOMICS" title="$CURRENT follows product demand." copy="Every displayed number is read from Arc testnet. Product fees are routed into a public reserve for batched market purchases, gas, liquidity, and operations." mode="orbit"><Button tone="cyan" disabled={!economy?.addresses} onClick={()=>openContract(economy?.addresses?.current)}>View token contract <ArrowUpRight/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!economy?.configured&&!loading&&<div className="campaign-empty"><TestTube2/><h3>The economy contracts are not configured</h3><p>The dashboard will switch to live Arc data when the public contract addresses are available.</p></div>}
    <div className="token-metrics-new"><div><small>Product fees routed</small><strong>{loading?"—":`${metrics?.totalProductFees??"0"} USDC`}</strong><span>Verified on Arc testnet</span></div><div><small>USDC awaiting buyback</small><strong>{loading?"—":`${metrics?.buybackReserve??"0"} USDC`}</strong><span>Reserved, not simulated</span></div><div><small>$CURRENT purchased</small><strong>{loading?"—":metrics?.totalCurrentPurchased??"0"}</strong><span>{metrics?.totalCurrentBurned??"0"} burned</span></div><div><small>Total $CURRENT locked</small><strong>{loading?"—":metrics?.totalLocked??"0"}</strong><span>{metrics?.totalCurrentProtocolLocked??"0"} protocol locked</span></div></div>
    <div className="token-dashboard-grid"><div className="data-panel fee-flow-panel"><div className="panel-head"><div><h3>Fee allocation current</h3><p>Immutable routing percentages in the deployed fee contract</p></div><Status tone={economy?.rpcStatus==="live"?"green":"grey"}>{economy?.rpcStatus==="live"?"Live testnet":"RPC delayed"}</Status></div><div className="fee-flow-graphic"><div className="fee-source"><CircleDollarSign/><b>Product fees</b><strong>{metrics?.totalProductFees??"0"} USDC</strong></div><div className="fee-paths">{allocations.map(([label,bps,color])=><span key={label} style={{"--c":color} as React.CSSProperties}><i/><b>{label}</b><em>{bps/100}%</em></span>)}</div></div></div>
      <div className="data-panel economy-contracts"><div className="panel-head"><div><h3>Public contract stack</h3><p>Inspect the exact testnet system</p></div><ShieldCheck/></div>{[["$CURRENT token",economy?.addresses?.current],["Project lock vault",economy?.addresses?.lockVault],["Product fee router",economy?.addresses?.feeRouter],["Access manager",economy?.addresses?.accessManager],["Buyback governor",economy?.addresses?.buybackGovernor],["Liquidity vault",economy?.addresses?.liquidityVault],["Liquidity governor",economy?.addresses?.liquidityGovernor]].map(([label,address])=><button className="economy-contract-row" key={label} disabled={!address} onClick={()=>openContract(address)}><span><Network/></span><b>{label}<small>{address?`${address.slice(0,8)}…${address.slice(-6)}`:"Awaiting deployment"}</small></b><ArrowUpRight/></button>)}</div></div>
    <div className="economy-governance-grid">
      <div className="data-panel access-tier-panel"><div className="panel-head"><div><h3>Project access tiers</h3><p>Product capacity earned through noncustodial locks</p></div><Status tone={economy?.projectAccess?.tier?"green":"grey"}>{economy?.projectAccess?.tierName??"No active tier"}</Status></div><div className="access-tier-list">{(economy?.accessTiers??[]).map((tier,index)=><div className={economy?.projectAccess?.tier===index+1?"active":""} key={tier.name}><span>{index+1}</span><b>{tier.name}<small>{tier.requirement} CURRENT locked</small></b><em>{tier.recipientLimit.toLocaleString()} recipients</em></div>)}</div>{economy?.projectAccess?.tier?<p className="governance-proof"><ShieldCheck/>Active until {new Date(economy.projectAccess.expiresAt*1000).toLocaleDateString()} · verified by the access manager.</p>:<p className="governance-proof"><Lock/>Lock at least 100 CURRENT to activate a project tier.</p>}</div>
      <div className="data-panel governance-panel"><div className="panel-head"><div><h3>Governed buyback execution</h3><p>Public delay, separate guardian, permissionless execution</p></div><Status tone={economy?.governance?.governorOwnsRouter?"green":"grey"}>{economy?.governance?.governorOwnsRouter?"Governor active":"Not configured"}</Status></div><div className="governance-status-grid"><span><small>Minimum delay</small><strong>{economy?.governance?.minimumDelaySeconds??0}s</strong></span><span><small>Operations queued</small><strong>{economy?.governance?.totalQueued??0}</strong></span><span><small>Executed</small><strong>{economy?.governance?.totalExecuted??0}</strong></span><span><small>Cancelled</small><strong>{economy?.governance?.totalCancelled??0}</strong></span></div><div className="governance-checks"><span className={economy?.governance?.governorOwnsRouter?"pass":""}><ShieldCheck/>Governor owns fee router</span><span className={economy?.governance?.adapterAllowed?"pass":""}><ShieldCheck/>Testnet adapter allowlisted</span><span className={economy?.governance?.guardian?"pass":""}><ShieldCheck/>Independent guardian configured</span></div><p className="governance-proof">Every adapter change and buyback is visible before it can execute. The guardian can cancel a queued operation without controlling protocol funds.</p></div>
    </div>
    <div className="data-panel liquidity-proof-panel"><div className="panel-head"><div><h3>Protocol-owned liquidity</h3><p>Fee-funded $CURRENT and USDC controlled by delayed, guardian-protected governance</p></div><Status tone={economy?.liquidity?.governorOwnsVault&&economy?.liquidity?.adapterAllowed?"green":"grey"}>{economy?.liquidity?.configured?"Onchain proof active":"Awaiting deployment"}</Status></div><div className="liquidity-current-map"><div className="liquidity-reserve"><small>IDLE RESERVE</small><strong>{economy?.liquidity?.idleCurrent??"0"} CURRENT</strong><span>{economy?.liquidity?.idleUsdc??"0"} USDC</span></div><ArrowRight/><div className="liquidity-governance"><ShieldCheck/><small>{economy?.liquidity?.minimumDelaySeconds??0}s PUBLIC DELAY</small><strong>Liquidity governor</strong><span>Guardian may cancel. It cannot withdraw.</span></div><ArrowRight/><div className="liquidity-position"><small>PAIRED POSITION</small><strong>{economy?.liquidity?.currentDeployed??"0"} CURRENT</strong><span>{economy?.liquidity?.usdcDeployed??"0"} USDC · {economy?.liquidity?.liquidityShares??"0"} shares</span></div></div><div className="liquidity-proof-grid"><span className={economy?.liquidity?.governorOwnsVault?"pass":""}><ShieldCheck/><b>Governor owns vault</b><small>No direct operator withdrawal path</small></span><span className={economy?.liquidity?.adapterAllowed?"pass":""}><ShieldCheck/><b>Venue adapter allowlisted</b><small>Replaceable when Arc mainnet venues mature</small></span><span><Activity/><b>{economy?.liquidity?.positionsCreated??0} position created</b><small>{economy?.liquidity?.positionsRemoved??0} governed removal</small></span><span><TestTube2/><b>Testnet proof only</b><small>No monetary value or claimed market depth</small></span></div><div className="liquidity-proof-actions"><button disabled={!economy?.addresses?.liquidityVault} onClick={()=>openContract(economy?.addresses?.liquidityVault)}>Inspect reserve vault <ArrowUpRight/></button><button disabled={!economy?.addresses?.liquidityGovernor} onClick={()=>openContract(economy?.addresses?.liquidityGovernor)}>Inspect delayed governor <ArrowUpRight/></button></div></div>
    <div className="economy-action-grid"><div className="data-panel economy-action-card"><div className="panel-head"><div><h3>Lock $CURRENT for project access</h3><p>Noncustodial: the beneficiary withdraws after the selected term.</p></div><Lock/></div>{!auth.account?<div className="economy-action-body"><p>Sign in to test a real project lock from your embedded Arc wallet.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>:<div className="economy-action-body"><div className="wallet-economy-balance"><small>YOUR TESTNET BALANCE</small><strong>{economy?.walletCurrent?.display??"0"} CURRENT</strong></div><label>Amount<input inputMode="decimal" value={lockAmount} onChange={event=>setLockAmount(event.target.value)}/></label><label>Lock term<select value={durationDays} onChange={event=>setDurationDays(event.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></label><Button tone="blue" disabled={busy||!economy?.configured} onClick={()=>void runAction("project-lock")}>{busy?"Confirming on Arc…":"Approve, lock, activate"} <Lock/></Button></div>}</div>
      <div className="data-panel economy-action-card"><div className="panel-head"><div><h3>Route a product fee</h3><p>Prove the 35 / 25 / 20 / 20 USDC allocation end to end.</p></div><CircleDollarSign/></div><div className="economy-action-body"><p>This uses test USDC and produces a public fee receipt. The buyback portion enters the governed reserve for delayed, publicly inspectable execution.</p><label>Test USDC amount<input inputMode="decimal" value={feeAmount} onChange={event=>setFeeAmount(event.target.value)}/></label><Button tone="cyan" disabled={busy||!economy?.configured||!auth.account} onClick={()=>void runAction("product-fee")}>{auth.account?"Route test fee":"Sign in to test"} <ArrowRight/></Button></div></div>
      <div className="data-panel economy-activity-card"><div className="panel-head"><div><h3>Verified economy activity</h3><p>No estimated volume or placeholder project locks</p></div><RefreshCw className={loading?"spin":""}/></div>{(economy?.recentActions??[]).map(action=><button className="economy-activity-row" key={action.id} onClick={()=>action.transactionHash&&explorer&&window.open(`${explorer}/tx/${action.transactionHash}`,"_blank","noopener,noreferrer")}><span className={action.kind==="project-lock"?"lock-action":"fee-action"}>{action.kind==="project-lock"?<Lock/>:<CircleDollarSign/>}</span><b>{action.reference}<small>{action.amount} {action.kind==="project-lock"?"CURRENT":"USDC"} · {new Date(action.createdAt).toLocaleDateString()}</small></b><Status tone="green">Confirmed</Status></button>)}{!loading&&!economy?.recentActions.length&&<div className="campaign-empty compact"><Activity/><b>No economy actions yet</b><p>The first confirmed lock or product fee will appear here.</p></div>}</div></div>
    <p className="economy-disclaimer"><TestTube2/>{economy?.rpcStatus==="degraded"?"Arc's public RPC is rate-limited right now, so zero activity values are the safe fallback until the next verified read. ":""}$CURRENT and all balances shown here are Arc testnet assets with no monetary value. Mainnet supply and allocations remain unissued.</p></>;
}

function Developers({go}:{go:(v:View)=>void}) {
  const [sample,setSample]=useState<"sdk"|"react"|"curl"|"verifier">("sdk");
  const [copied,setCopied]=useState(false);
  const snippets={
    sdk:`import { Current } from "@currentcofi/sdk";

const current = new Current({
  apiKey: process.env.CURRENT_API_KEY!,
  signingSecret: process.env.CURRENT_SIGNING_SECRET!,
});

const drop = await current.distributions.create({
  name: "Founding current",
  recipients: [{
    identityType: "email",
    identity: "builder@example.com",
    amount: "25.00",
  }],
  activationEvent: "game.first_match",
});`,
    react:`import { CurrentClaimEmbed } from "@currentcofi/react";

export function Reward({ claimUrl }) {
  return (
    <CurrentClaimEmbed
      claimUrl={claimUrl}
      referralCode="founding-current"
      accent="#22e4d5"
    />
  );
}`,
    curl:`POST /api/v1/developer/distributions
Authorization: Bearer current_live_••••
X-Current-Timestamp: 1785373200000
X-Current-Signature: <HMAC-SHA256>

{
  "name": "Founding current",
  "recipients": [
    { "identityType": "email",
      "identity": "builder@example.com",
      "amount": "25.00" }
  ]
}`,
    verifier:`const verification = await current.identities.attest({
  externalEventId: xOauthSession.id,
  distributionId: campaign.id,
  identityType: "x",
  identity: xProfile.username,
  walletAddress: currentWallet,
  provider: "x-oauth",
  expiresInMinutes: 30,
});

// The recipient can now claim.
// The attestation is single-use and wallet-bound.`,
  };
  const copy=async()=>{await navigator.clipboard.writeText(snippets[sample]);setCopied(true);window.setTimeout(()=>setCopied(false),1800)};
  return <><PageHero eyebrow="CURRENT COFI API" title="One integration. Every activation current." copy="Create real walletless distributions, embed the claim experience, attribute post-claim actions, and let agents move value inside explicit boundaries."><div className="hero-button-row"><Button tone="cyan" onClick={()=>go("api-keys")}>Create API key <ArrowRight/></Button><Button tone="ghost" onClick={()=>document.getElementById("sdk-quickstart")?.scrollIntoView({behavior:"smooth"})}>Read quickstart <ArrowUpRight/></Button></div></PageHero>
    <div className="developer-proof"><span><i/><b>LIVE ON ARC TESTNET</b></span><p>SDK · identity verifiers · React components · HMAC requests · durable webhooks · agent manifest</p><a href="/api/v1/openapi" target="_blank" rel="noreferrer">Open API spec <ArrowUpRight/></a></div>
    <div className="developer-grid"><article><Braces/><span>SERVER SDK</span><h3>Distribution API</h3><p>Create signed USDC and project-token campaigns from a backend or launchpad.</p><code>current.distributions.create()</code></article><article><Fingerprint/><span>IDENTITY NETWORK</span><h3>Verifier adapters</h3><p>Bind X, game, ticket, or community identities to a new Arc wallet without exposing the identity onchain.</p><code>current.identities.attest()</code></article><article><Webhook/><span>EVENT DELIVERY</span><h3>Signed webhooks</h3><p>Receive campaign, identity, claim, activation, referral, refund, and delivery events.</p><code>identity.verified</code></article><article><Bot/><span>MACHINE-READABLE</span><h3>Agent tools</h3><p>Let autonomous software create distributions and report activations within scoped policies.</p><code>create_distribution</code></article><article><Layers3/><span>REACT PACKAGE</span><h3>Embeddable claims</h3><p>Put Current’s walletless reward card and referral links directly inside another app.</p><code>&lt;CurrentClaimEmbed /&gt;</code></article><article><FileCheck2/><span>GRANT EVIDENCE</span><h3>Proof API</h3><p>Freeze campaign outcomes and public Arc anchors into a digest-verified reviewer report.</p><code>current.evidence.create()</code></article></div>
    <div className="quickstart-panel" id="sdk-quickstart"><div><Eyebrow>PRODUCTION QUICKSTART</Eyebrow><h2>Create a verified activation current.</h2><ol><li><span>1</span>Install the Current server SDK</li><li><span>2</span>Create a scoped project key</li><li><span>3</span>Generate identity-bound claim links</li><li><span>4</span>Attest external identities</li><li><span>5</span>Measure real activation</li></ol><div className="code-tabs">{(["sdk","verifier","react","curl"] as const).map(tab=><button className={sample===tab?"active":""} key={tab} onClick={()=>setSample(tab)}>{tab==="sdk"?"Distribution":tab==="verifier"?"Verifier adapter":tab==="react"?"React embed":"Raw API"}</button>)}</div></div><pre><button className="code-copy" onClick={()=>void copy()}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy"}</button><code>{snippets[sample]}</code></pre></div>
    <div className="verifier-story"><div><Eyebrow>IDENTITY WITHOUT CUSTODY</Eyebrow><h2>Bring any community identity into an Arc wallet.</h2><p>The project verifies the account it already understands—an X profile, game account, ticket, Discord member, or internal customer—and signs a short-lived attestation to the recipient’s Current wallet. Current checks the campaign allocation, API-key scope, wallet binding, expiry, and replay state before signing the onchain claim.</p></div><div className="verifier-flow"><span><b>01</b>Project OAuth or account proof<small>Identity stays with the project</small></span><i/><span><b>02</b>HMAC-signed attestation<small>Hashed identity + exact wallet</small></span><i/><span><b>03</b>Gasless Arc settlement<small>Single-use claim authorization</small></span></div></div>
    <div className="integration-lab"><div className="integration-lab-copy"><Eyebrow>EMBED LAB</Eyebrow><h2>The claim experience travels with your product.</h2><p>Games, communities, launchpads, and AI agents can embed a branded reward without rebuilding wallet creation, claim resolution, or gasless onboarding.</p><div><span><CheckCircle2/> No wallet required</span><span><CheckCircle2/> Referral attribution preserved</span><span><CheckCircle2/> Hosted fallback included</span></div><Button tone="blue" onClick={()=>go("api-keys")}>Start integrating <ArrowRight/></Button></div><div className="integration-lab-preview"><div className="embed-browser"><header><i/><i/><i/><span>play.example/rewards</span></header><main><CurrentClaimEmbed compact accent="#22e4d5" onOpen={()=>go("claim")} preview={{amount:"250",asset:"TIDE",claimable:true,expiresAt:"2026-08-14T00:00:00.000Z",message:"Complete your first match to activate this reward.",project:{name:"Tidebreak",logoUrl:null},sender:"Tidebreak community",status:"claimable"}}/></main></div></div></div>
  </>;
}

function ApiKeys({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [keys,setKeys]=useState<DeveloperKeyRecord[]>([]);
  const [created,setCreated]=useState<CreatedDeveloperKey|null>(null);
  const [name,setName]=useState("Production integration");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{const result=await currentApi.get<{keys:DeveloperKeyRecord[]}>("/developer/keys");setKeys(result.keys);setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"API keys are unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const create=async()=>{
    setBusy(true);setError(null);
    try{setCreated(await currentApi.post<CreatedDeveloperKey>("/developer/keys",{name,kind:"project"}));await refresh()}
    catch(createError){setError(createError instanceof Error?createError.message:"API key creation failed.")}
    finally{setBusy(false)}
  };
  const revoke=async(keyId:string)=>{
    setBusy(true);
    try{await currentApi.post("/developer/keys",{action:"revoke",keyId});await refresh()}
    catch(revokeError){setError(revokeError instanceof Error?revokeError.message:"API key revocation failed.")}
    finally{setBusy(false)}
  };
  return <><PageHero eyebrow="DEVELOPER ACCESS" title="Keys with deliberate boundaries." copy="Create environment-specific credentials, assign narrow scopes, monitor usage, and revoke access immediately."/>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Developer access requires an account</h3><p>Sign in to create keys for your Current CoFi project.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<div className="settings-shell"><div className="settings-tabs"><button>General</button><button className="active">API keys</button><button onClick={()=>go("webhooks")}>Webhooks</button><button>Team</button></div><div className="settings-panel"><div className="panel-head"><div><h3>Project API keys</h3><p>The key and signing secret are shown once.</p></div><div className="inline-key-create"><input aria-label="API key name" value={name} maxLength={80} onChange={event=>setName(event.target.value)}/><Button tone="blue" disabled={busy||!name.trim()} onClick={()=>void create()}>{busy?"Working…":"Create key"} <Plus/></Button></div></div>
    {created&&<div className="credential-reveal"><KeyRound/><div><b>{created.name} is ready</b><label>API key<code>{created.token}</code></label><label>Signing secret<code>{created.signingSecret}</code></label><small>Copy both now. Current CoFi will never reveal them again.</small></div><button aria-label="Copy credentials" onClick={()=>void navigator.clipboard.writeText(`CURRENT_API_KEY=${created.token}\nCURRENT_SIGNING_SECRET=${created.signingSecret}`)}><Copy/></button></div>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {keys.map((key,i)=><div className="key-row-new" key={key.id}><span className={`key-symbol k-${i%3}`}><KeyRound/></span><div><b>{key.name}</b><code>{key.prefix}.••••••••••••</code></div><span>{key.permissions.join(" · ")}</span><time>{key.lastUsedAt?`Used ${new Date(key.lastUsedAt).toLocaleDateString()}`:"Never used"}</time>{key.status==="active"?<button aria-label={`Revoke ${key.name}`} disabled={busy} onClick={()=>void revoke(key.id)}><X/></button>:<Status tone="grey">{key.status}</Status>}</div>)}
    {!keys.length&&<div className="campaign-empty compact"><KeyRound/><b>No developer keys yet</b><p>Create a scoped key to connect an app or backend.</p></div>}</div></div>}</>;
}

function WebhooksView({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [state,setState]=useState<WebhookState>({endpoints:[],deliveries:[]});
  const [url,setUrl]=useState("");
  const [createdSecret,setCreatedSecret]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{setState(await currentApi.get<WebhookState>("/developer/webhooks"));setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Webhook state is unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const create=async()=>{
    setBusy(true);setError(null);
    try{const created=await currentApi.post<{secret:string}>("/developer/webhooks",{url,events:["campaign.created","campaign.funded","crosschain.funding.created","crosschain.funding.source-confirmed","crosschain.funding.arc-arrived","crosschain.funding.campaign-funded","gateway.funding.created","gateway.funding.deposited","gateway.funding.attested","gateway.funding.arc-arrived","gateway.funding.campaign-funded","agent.settlement-ready","agent.settlement-approved","agent.settled","identity.verified","claim.completed","activation.completed","referral.attributed","campaign.cancelled","campaign.refunded","current.locked","fee.routed","integration.test"]});setCreatedSecret(created.secret);setUrl("");await refresh()}
    catch(createError){setError(createError instanceof Error?createError.message:"Webhook creation failed.")}
    finally{setBusy(false)}
  };
  const toggle=async(endpointId:string,enabled:boolean)=>{
    setBusy(true);
    try{await currentApi.post("/developer/webhooks",{action:"set_enabled",endpointId,enabled});await refresh()}
    catch(toggleError){setError(toggleError instanceof Error?toggleError.message:"Webhook update failed.")}
    finally{setBusy(false)}
  };
  const test=async()=>{
    setBusy(true);
    try{await currentApi.post("/developer/webhooks",{action:"test"});await refresh()}
    catch(testError){setError(testError instanceof Error?testError.message:"Webhook test failed.")}
    finally{setBusy(false)}
  };
  return <><PageHero eyebrow="EVENT DELIVERY" title="Every important state, delivered." copy="Signed, durable webhooks keep games, communities, launchpads, and autonomous agents synchronized with the current."/>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Webhook delivery requires an account</h3><p>Sign in to connect your project systems.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<div className="settings-shell"><div className="settings-tabs"><button>General</button><button onClick={()=>go("api-keys")}>API keys</button><button className="active">Webhooks</button><button>Team</button></div><div className="settings-panel"><div className="panel-head"><div><h3>Webhook endpoints</h3><p>Public HTTPS only. Every delivery carries an HMAC signature.</p></div><div className="inline-key-create"><input aria-label="Webhook endpoint URL" placeholder="https://api.example.com/current" value={url} onChange={event=>setUrl(event.target.value)}/><Button tone="blue" disabled={busy||!url.trim()} onClick={()=>void create()}>Add endpoint <Plus/></Button></div></div>
    {createdSecret&&<div className="credential-reveal"><Webhook/><div><b>Signing secret created</b><label>Webhook secret<code>{createdSecret}</code></label><small>Copy it now and verify every request before processing the event.</small></div><button aria-label="Copy signing secret" onClick={()=>void navigator.clipboard.writeText(createdSecret)}><Copy/></button></div>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {state.endpoints.map(endpoint=><div className="webhook-endpoint" key={endpoint.id}><span><Webhook/></span><div><b>Production events</b><code>{endpoint.url}</code></div><Status tone={endpoint.enabled?"green":"grey"}>{endpoint.enabled?"Listening":"Paused"}</Status><button disabled={busy} onClick={()=>void toggle(endpoint.id,!endpoint.enabled)}>{endpoint.enabled?<Pause/>:<Play/>}</button><div className="endpoint-meta"><span><small>EVENTS</small>{endpoint.events.length} subscribed</span><span><small>SIGNATURE</small>HMAC-SHA256</span><span><small>CREATED</small>{new Date(endpoint.createdAt).toLocaleDateString()}</span></div></div>)}
    {!state.endpoints.length&&<div className="campaign-empty compact"><Webhook/><b>No endpoint connected</b><p>Add a public HTTPS destination to receive project events.</p></div>}
    <div className="section-subtitle-row"><h3 className="section-subtitle">Recent deliveries</h3><Button tone="ghost" disabled={busy||!state.endpoints.length} onClick={()=>void test()}>Send test <Zap/></Button></div>{state.deliveries.map(delivery=><div className="delivery-row-new" key={delivery.id}><i className={delivery.status}/><code>{delivery.eventType}</code><span>{delivery.eventId.slice(0,12)}…</span><Status tone={delivery.status==="delivered"?"green":delivery.status==="failed"?"grey":"cyan"}>{delivery.responseStatus??delivery.status}</Status><time>{new Date(delivery.updatedAt).toLocaleTimeString()}</time><button title={delivery.responseError??`${delivery.attempts} attempt(s)`}><Eye/></button></div>)}</div></div>}</>;
}

function Agents({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [keys,setKeys]=useState<DeveloperKeyRecord[]>([]);
  const [runtime,setRuntime]=useState<AgentRuntimeState>({totals:{actions:0,approvalRequired:0,awaitingSettlement:0,completed:0,blocked:0},actions:[]});
  const [created,setCreated]=useState<CreatedDeveloperKey|null>(null);
  const [name,setName]=useState("Reward Router");
  const [eventTypes,setEventTypes]=useState("game.completed,purchase.completed");
  const [dailyLimit,setDailyLimit]=useState("1000");
  const [maxReward,setMaxReward]=useState("1000000000");
  const [approvalReward,setApprovalReward]=useState("250000000");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{const [result,actions]=await Promise.all([currentApi.get<{keys:DeveloperKeyRecord[]}>("/developer/keys"),currentApi.get<AgentRuntimeState>("/agent-actions")]);setKeys(result.keys.filter(key=>key.kind==="agent"));setRuntime(actions);setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Agent policies are unavailable.")}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const create=async()=>{
    setBusy(true);setError(null);
    try{setCreated(await currentApi.post<CreatedDeveloperKey>("/developer/keys",{name,kind:"agent",permissions:["campaigns:read","claims:write","activations:write","analytics:read","evidence:write","pilots:write","agent-actions:read","agent-actions:write"],policies:{dailyEventLimit:Number(dailyLimit),allowedEventTypes:eventTypes.split(",").map(value=>value.trim()).filter(Boolean),allowedIdentityTypes:["email","wallet","x","game","custom"],maxRewardAtomic:maxReward,humanApprovalAtomic:approvalReward}}));await refresh()}
    catch(createError){setError(createError instanceof Error?createError.message:"Agent creation failed.")}
    finally{setBusy(false)}
  };
  const revoke=async(keyId:string)=>{setBusy(true);try{await currentApi.post("/developer/keys",{action:"revoke",keyId});await refresh()}finally{setBusy(false)}};
  const review=async(actionId:string,decision:"approve"|"reject")=>{setBusy(true);setError(null);try{await currentApi.post("/agent-actions",{actionId,decision});await refresh()}catch(reviewError){setError(reviewError instanceof Error?reviewError.message:"The action could not be reviewed.")}finally{setBusy(false)}};
  const settle=async(actionId:string,action:"approve"|"deposit")=>{
    setBusy(true);setError(null);
    try{
      const started=await currentApi.post<WalletActionResult>("/agent-actions/settle",{actionId,action});
      if(!started.complete){
        if(!started.challengeId)throw new Error("Circle did not return a wallet challenge.");
        await auth.executeChallenge(started.challengeId);
        await confirmWalletAction("/agent-actions/settle",{actionId,action},started.challengeId);
      }
      await refresh();
    }catch(settlementError){setError(settlementError instanceof Error?settlementError.message:"The Arc settlement could not be completed.")}
    finally{setBusy(false)}
  };
  return <><PageHero eyebrow="POLICY-BOUND AGENT RUNTIME" title="Let agents activate users. Keep humans in control." copy="Agents can propose walletless USDC and project-token campaigns inside explicit identity, volume, and reward boundaries. High-value actions pause for human approval, and every decision becomes auditable evidence." mode="orbit"/>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Agent controls require an account</h3><p>Sign in to issue scoped machine credentials.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<><div className="agent-runtime-metrics">{[["Agent actions",runtime.totals.actions,Activity],["Needs approval",runtime.totals.approvalRequired,Clock3],["Needs funding",runtime.totals.awaitingSettlement,Wallet],["Settled",runtime.totals.completed,CheckCircle2],["Blocked",runtime.totals.blocked,ShieldAlert]].map(([label,value,Icon])=>{const MetricIcon=Icon as typeof Activity;return <article key={String(label)}><span><MetricIcon/></span><strong>{String(value)}</strong><small>{String(label)}</small></article>})}</div>
    <section className="agent-action-center"><div className="panel-head"><div><Eyebrow>HUMAN APPROVAL QUEUE</Eyebrow><h3>Every proposed movement has a decision trail.</h3><p>Approved actions create fully allocated campaigns. Project funds still move only when an authorized wallet funds the campaign on Arc.</p></div><Status tone={runtime.totals.approvalRequired?"cyan":"green"}>{runtime.totals.approvalRequired?`${runtime.totals.approvalRequired} waiting`:"All clear"}</Status></div>
    <div className="agent-action-list">{runtime.actions.map(action=><article key={action.id}><div className={`agent-action-icon ${action.status}`}><Bot/></div><div className="agent-action-copy"><div><b>{action.campaignName}</b><Status tone={action.status==="completed"?"green":["approval_required","awaiting_settlement"].includes(action.status)?"cyan":"grey"}>{action.status.replaceAll("_"," ")}</Status></div><p>{action.agentName} · {action.recipientCount} recipient{action.recipientCount===1?"":"s"} · {(Number(action.amountAtomic)/1_000_000).toLocaleString(undefined,{maximumFractionDigits:2})} token units</p><small>{action.policyDecision.reasons?.[0]??"Policy decision recorded."}</small>{action.settlement&&<div className="agent-settlement-track">{action.settlement.stages.map(stage=><span className={stage.complete?"complete":""} key={stage.id}><i>{stage.complete?<Check/>:<span/>}</i>{stage.label}</span>)}</div>}</div><div className="agent-action-meta"><span><small>RISK</small>{action.riskLevel}</span><span><small>PROPOSED</small>{new Date(action.createdAt).toLocaleDateString()}</span>{action.result.distributionId&&<button onClick={()=>go("campaigns")}>Open campaign <ArrowRight/></button>}</div>{action.status==="approval_required"&&<div className="agent-action-review"><button disabled={busy} onClick={()=>void review(action.id,"reject")}>Reject</button><Button tone="blue" disabled={busy} onClick={()=>void review(action.id,"approve")}>Approve intent <Check/></Button></div>}{action.status==="awaiting_settlement"&&action.settlement&&<div className="agent-action-review settlement"><small>Authorized project wallet required</small>{["awaiting_settlement","approving"].includes(action.settlement.status)?<Button tone="blue" disabled={busy} onClick={()=>void settle(action.id,"approve")}>{busy?"Opening wallet…":"1. Approve token"} <ShieldCheck/></Button>:<Button tone="blue" disabled={busy} onClick={()=>void settle(action.id,"deposit")}>{busy?"Confirming Arc…":"2. Fund Arc vault"} <ArrowRight/></Button>}</div>}{action.status==="completed"&&action.settlement?.transactionHash&&<a className="agent-settlement-receipt" href={`https://testnet.arcscan.app/tx/${action.settlement.transactionHash}`} target="_blank" rel="noreferrer">Verified Arc receipt <ExternalLink/></a>}</article>)}{!runtime.actions.length&&<div className="agent-action-empty"><Radar/><div><b>No agent actions yet</b><p>The first signed proposal will appear here with its complete policy decision.</p></div></div>}</div></section>
    <div className="integration-create agent-create"><div><Eyebrow>NEW AGENT POLICY</Eyebrow><h3>Issue a key with enforceable limits.</h3><p>Amounts use six-decimal atomic units. The approval threshold pauses larger campaigns for a human.</p></div><label>Name<input value={name} onChange={event=>setName(event.target.value)}/></label><label>Allowed events<input value={eventTypes} onChange={event=>setEventTypes(event.target.value)}/></label><label>Daily action limit<input inputMode="numeric" value={dailyLimit} onChange={event=>setDailyLimit(event.target.value)}/></label><label>Maximum reward<input inputMode="numeric" value={maxReward} onChange={event=>setMaxReward(event.target.value)}/></label><label>Human approval at<input inputMode="numeric" value={approvalReward} onChange={event=>setApprovalReward(event.target.value)}/></label><Button tone="blue" disabled={busy||!name.trim()} onClick={()=>void create()}>{busy?"Issuing…":"Create agent"} <Plus/></Button></div>
    {created&&<div className="credential-reveal"><Bot/><div><b>{created.name} is ready</b><label>Agent key<code>{created.token}</code></label><label>Signing secret<code>{created.signingSecret}</code></label><small>Store these now; they are not recoverable.</small></div><button onClick={()=>void navigator.clipboard.writeText(`CURRENT_AGENT_KEY=${created.token}\nCURRENT_SIGNING_SECRET=${created.signingSecret}`)}><Copy/></button></div>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="agent-grid-new">{keys.map(key=><article key={key.id}><div className="agent-head"><span><Bot/></span><Status tone={key.status==="active"?"green":"grey"}>{key.status}</Status><button disabled={busy||key.status!=="active"} onClick={()=>void revoke(key.id)}><X/></button></div><h3>{key.name}</h3><p>Signed Current CoFi agent</p><strong>{String(key.policies.dailyEventLimit??1000)}</strong><small>Daily activation limit</small><div className="agent-boundaries"><span><Check/>HMAC signed events</span><span><Check/>{Array.isArray(key.policies.allowedEventTypes)&&key.policies.allowedEventTypes.length?`${key.policies.allowedEventTypes.length} allowed event types`:"Any event type"}</span><span><Check/>{key.permissions.length} API permissions</span></div></article>)}{!keys.length&&<article className="agent-empty"><Bot/><h3>No agents issued</h3><p>Create a policy-bound key above.</p></article>}</div>
    <div className="data-panel guardrail-panel"><div className="panel-head"><div><h3>Network guardrails</h3><p>Evaluated before an agent can create any reward campaign.</p></div><Status tone="green">Enforced</Status></div><div className="guardrail-grid">{[["Signature window","5 minutes",Clock3],["Policy ledger","Immutable decisions",ShieldCheck],["Idempotency","Agent scoped",Fingerprint],["Approval route","Human controlled",Braces]].map(([x,v,I])=>{const Icon=I as typeof Gauge;return <div key={String(x)}><span><Icon/></span><b>{String(v)}</b><small>{String(x)}</small></div>})}</div></div></>}</>;
}

function SettingsView() {
  const [saved,setSaved]=useState(false);
  return <><PageHero eyebrow="ORGANIZATION CONTROL" title="A calm center for the whole network." copy="Manage identity, project branding, members, security, notifications, billing, and network preferences."/><div className="settings-shell"><div className="settings-tabs"><button className="active">General</button><button>Members</button><button>Security</button><button>Billing</button><button>Notifications</button></div><form className="settings-panel" onSubmit={e=>{e.preventDefault();setSaved(true)}}><div className="panel-head"><div><h3>Organization profile</h3><p>Public details used across claims and campaigns.</p></div>{saved&&<Status tone="green">Changes saved</Status>}</div><div className="profile-uploader"><span>T</span><div><b>Project mark</b><small>SVG, PNG, or WebP · 2MB maximum</small></div><Button tone="ghost">Replace image</Button></div><div className="field-grid"><label>Organization name<input defaultValue="Tidebreak Labs"/></label><label>Current username<div className="input-prefix"><span>current.co/</span><input defaultValue="tidebreak"/></div></label><label>Website<input defaultValue="https://tidebreak.xyz"/></label><label>Default network<select><option>Arc testnet</option></select></label><label className="full">Description<textarea defaultValue="The team building Tidebreak and its community economy."/></label></div><div className="form-actions"><Button tone="ghost">Discard</Button><Button tone="blue" type="submit">Save changes</Button></div><div className="danger-zone"><div><b>Delete organization</b><p>Removes offchain data after all campaigns and balances are settled.</p></div><button>Delete</button></div></form></div></>;
}

function StateLab({go}:{go:(v:View)=>void}) {
  return <><PageHero eyebrow="SYSTEM STATES" title="Every interruption has a clear next step." copy="Loading, empty, expired, unavailable, and failure states are designed as carefully as the ideal path."/><div className="state-grid">{[
    ["Loading current","Confirming on Arc testnet",<RefreshCw className="spin" key="a"/>],
    ["Nothing is flowing yet","Create your first distribution to begin.",<Radio key="b"/>],
    ["Claim expired","The unclaimed value is ready to return to its sender.",<Clock3 key="c"/>],
    ["Gas budget is low","Add 25 USDC to keep walletless claims open.",<Zap key="d"/>],
    ["Current interrupted","We could not confirm the transaction. Your funds have not moved.",<X key="e"/>],
    ["Campaign paused","Existing balances remain secured until the project resumes.",<Pause key="f"/>]
  ].map(([title,copy,icon],i)=><article key={String(title)}><span className={`state-icon st-${i}`}>{icon}</span><h3>{String(title)}</h3><p>{String(copy)}</p><Button tone={i===4?"ghost":"dark"} onClick={()=>i===1?go("new-campaign"):undefined}>{i===0?"View transaction":i===1?"Create distribution":i===2?"Return funds":i===3?"Add gas budget":i===4?"Try again":"View campaign"}</Button></article>)}</div></>;
}

function Sidebar({view,go,open,setOpen,auth}:{view:View;go:(v:View)=>void;open:boolean;setOpen:(v:boolean)=>void;auth:CircleAuth}) {
  const name=auth.account?.displayName??"Preview workspace";
  const initials=name.split(" ").map(word=>word[0]).join("").slice(0,2).toUpperCase()||"CC";
  return <><aside className={`app-sidebar ${open?"open":""}`}><div className="sidebar-top"><Brand light onClick={()=>go("home")}/><button aria-label="Close navigation" onClick={()=>setOpen(false)}><X/></button></div><div className="project-switch"><span>T</span><div><b>Tidebreak</b><small>Arc testnet</small></div><ChevronDown/></div><nav>{appNav.map(section=><div key={section.label}><small>{section.label}</small>{section.items.map(([id,label,I])=>{const Icon=I;return <button className={view===id?"active":""} onClick={()=>{go(id as View);setOpen(false)}} key={id}><Icon/>{label}{id==="campaigns"&&<em>4</em>}</button>})}</div>)}</nav><div className="sidebar-bottom"><button onClick={()=>go("api-keys")}><KeyRound/>API keys</button><button onClick={()=>go("webhooks")}><Webhook/>Webhooks</button><button onClick={()=>go("settings")}><Settings/>Settings</button><button onClick={()=>go("states")}><HelpCircle/>System states</button><div className="user-card"><span>{initials}</span><div><b>{name}</b><small>{auth.account?"Wallet active":"Demo data"}</small></div><button aria-label="Sign out" disabled={!auth.account} onClick={()=>void auth.signOut()}><LogOut/></button></div></div></aside>{open&&<button className="sidebar-shade" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}</>;
}

function AppShell({view,go,auth}:{view:View;go:(v:View)=>void;auth:CircleAuth}) {
  const [open,setOpen]=useState(false);
  const [foundation,setFoundation]=useState<"checking"|"live"|"degraded">("checking");
  const checkFoundation=()=>currentApi.health().then(data=>setFoundation(data.status==="operational"?"live":"degraded")).catch(()=>setFoundation("degraded"));
  useEffect(()=>{checkFoundation()},[]);
  let page:React.ReactNode;
  switch(view){
    case "overview":page=<Overview go={go} auth={auth}/>;break;
    case "create":page=<CreateLink auth={auth} go={go}/>;break;
    case "onboarding":page=<ProjectOnboarding go={go}/>;break;
    case "campaigns":page=<Campaigns go={go} auth={auth}/>;break;
    case "new-campaign":page=<CampaignBuilder go={go} auth={auth}/>;break;
    case "funding":page=<CrosschainFunding go={go} auth={auth}/>;break;
    case "recipients":page=<Recipients auth={auth} go={go}/>;break;
    case "referrals":page=<Referrals auth={auth} go={go}/>;break;
    case "analytics":page=<Analytics auth={auth} go={go}/>;break;
    case "pilots":page=<PilotOperations auth={auth} go={go}/>;break;
    case "evidence":page=<Evidence auth={auth} go={go}/>;break;
    case "token":page=<TokenDashboard auth={auth} go={go}/>;break;
    case "developers":page=<Developers go={go}/>;break;
    case "api-keys":page=<ApiKeys auth={auth} go={go}/>;break;
    case "webhooks":page=<WebhooksView auth={auth} go={go}/>;break;
    case "agents":page=<Agents auth={auth} go={go}/>;break;
    case "settings":page=<SettingsView/>;break;
    default:page=<StateLab go={go}/>;
  }
  return <div className="app-shell"><Sidebar view={view} go={go} open={open} setOpen={setOpen} auth={auth}/><main className="app-main-new"><div className="testnet-strip"><TestTube2/>Arc testnet environment · Balances have no monetary value.<button className={`foundation-${foundation}`} onClick={checkFoundation} title="Refresh backend status"><span/>{foundation==="checking"?"Checking foundation":foundation==="live"?"Foundation live":"Foundation degraded"} <ArrowUpRight/></button></div><header className="app-topbar"><button className="mobile-sidebar-button" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu/></button><div><span>WORKSPACE /</span><b>{view.replace("-"," ")}</b></div><div><button aria-label="Search"><Search/></button><button aria-label="Notifications"><Bell/></button><Button tone="blue" onClick={()=>go("new-campaign")}>New current <Plus/></Button></div></header><div className="app-view" key={view}>{page}</div></main></div>;
}

export default function CurrentApp() {
  const [view,setView] = useState<View>("home");
  const [transition,setTransition] = useState(false);
  const auth=useCircleWalletAuth();
  useEffect(()=>{
    const fromHash=()=>{const value=viewFromHash(location.hash);if(value)setView(value)};
    fromHash(); addEventListener("hashchange",fromHash); return()=>removeEventListener("hashchange",fromHash);
  },[]);
  useEffect(()=>{
    if (!location.hash.startsWith("#state=")) return;
    if (!["verifying","creating-wallet","authenticated","error"].includes(auth.state)) return;
    history.replaceState(null, "", `${location.pathname}${location.search}#/claim`);
  },[auth.state]);
  const go=(next:View)=>{
    if(next===view)return;
    setTransition(true);
    setTimeout(()=>{setView(next); location.hash=`/${next}`; scrollTo({top:0,behavior:"instant" as ScrollBehavior}); setTimeout(()=>setTransition(false),120)},260);
  };
  return <><div className={`route-current ${transition?"active":""}`} aria-hidden="true"><i/></div>{view==="home"?<Marketing go={go}/>:view==="claim"?<ClaimView go={go} auth={auth}/>:<AppShell view={view} go={go} auth={auth}/>}</>;
}
