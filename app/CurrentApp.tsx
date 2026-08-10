"use client";
/* eslint-disable @next/next/no-img-element -- generated QR data URIs cannot use the image optimizer */

import "./activation-destinations.css";
import "./discovery.css";
import "./acquisition.css";
import "./brand-studio.css";
import "./project-onboarding.css";
import "./workspace-access.css";
import "./activity-center.css";

import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Bell, Bot,
  Braces, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Code2, Compass,
  Copy, Download, Eye, ExternalLink, FileCheck2, Fingerprint, Gauge, Gift,
  Globe2, Handshake, HelpCircle, KeyRound, Layers3, Link2, Lock, LogOut, Menu,
  MoreHorizontal, Network, Pause, Play, Plus, QrCode, Radar, Radio, RefreshCw, Repeat2, Search, Send,
  ReceiptText, Rocket, Settings, Share2, ShieldAlert, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Target,
  TestTube2, TrendingUp, Upload, Users, Wallet, Waves, Webhook, X, Zap
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { currentApi } from "@/lib/api/client";
import { useCircleWalletAuth } from "@/lib/auth/circle-wallet";
import { CurrentClaimEmbed } from "@/packages/react/src";

type View =
  | "home" | "claim" | "overview" | "account" | "create" | "payments" | "pay" | "onboarding" | "members" | "activity" | "campaigns" | "discover" | "bounty"
  | "new-campaign" | "funding" | "payroll" | "bounties" | "drops" | "drop" | "giveaways" | "giveaway" | "vesting" | "vesting-claim" | "treasury" | "public-treasury" | "recipients" | "deliveries" | "referrals" | "analytics" | "pilots" | "evidence" | "grant" | "token" | "partners" | "venues" | "launch" | "operations" | "security" | "asset-trust"
  | "escrow" | "commerce" | "checkout" | "subscriptions" | "subscribe" | "developers" | "integration-lab" | "certification" | "network-proof" | "grant-dossier" | "grant-application" | "proof-explorer" | "reviewer-demo" | "project-token-proof" | "proof-health" | "api-keys" | "webhooks" | "agents" | "brand" | "settings" | "states";

type ClaimStep = "ready" | "auth" | "creating" | "claiming" | "success";
type CircleAuth = ReturnType<typeof useCircleWalletAuth>;
type AccountIdentity = {id:string;provider:string;verifiedAt:string|null;profile:{username:string|null;displayName:string|null;avatarUrl:string|null}};
type IdentityWorkspace = {identities:AccountIdentity[];available:{x:boolean;discord:boolean;telegram:boolean}};
type WorkspaceRole = "owner"|"admin"|"operator"|"analyst"|"developer";
type WorkspaceState = {activeProjectId:string;currentRole:WorkspaceRole;canManage:boolean;workspaces:Array<{id:string;name:string;slug:string;logoUrl:string|null;role:WorkspaceRole;active:boolean}>;members:Array<{userId:string;displayName:string;username:string;avatarUrl:string|null;role:WorkspaceRole;joinedAt:string;isCurrentUser:boolean}>;invitations:Array<{id:string;maskedEmail:string;role:WorkspaceRole;status:string;expiresAt:string;createdAt:string;acceptedAt:string|null}>};
type PublicWorkspaceInvitation = {project:{id:string;name:string;logoUrl:string|null;websiteUrl:string|null};invitation:{id:string;maskedEmail:string;role:WorkspaceRole;status:string;expiresAt:string};acceptance:{requiresSignIn:boolean;requiresMatchingEmail:boolean}};
type ProjectActivityState = {projectId:string;viewerRole:WorkspaceRole;range:{days:number;since:string;cappedAt:number};totals:{events:number;filtered:number;actors:number;attention:number;financial:number;categories:Record<string,number>};filters:{category:string|null;query:string};events:Array<{id:string;action:string;label:string;category:string;tone:"success"|"attention"|"neutral";actor:{type:string;name:string;detail:string|null};resource:{type:string;id:string|null};metadata:Record<string,string|number|boolean>;requestId:string|null;createdAt:string}>;privacy:string};
type ProjectBrand = {primaryColor:string;accentColor:string;successColor:string;surface:"midnight"|"tide"|"light";headline:string;claimCta:string;poweredByCurrent:true};
type BrandWorkspace = {name:string;description:string|null;logoUrl:string|null;websiteUrl:string|null;brand:ProjectBrand};
type ProjectSetupWorkspace = {project:{id:string;slug:string;name:string;description:string|null;logoUrl:string|null;websiteUrl:string|null;network:string};owner:{displayName:string;username:string;role:"owner"}|null;tokens:Array<{address:string;symbol:string;name:string;decimals:number;verified:boolean;trust:unknown}>;counts:{campaigns:number;apiKeys:number;webhooks:number;pilots:number};readiness:{score:number;stage:string;requiredComplete:boolean;completed:number;total:number;checks:Array<{id:string;label:string;detail:string;complete:boolean;required:boolean}>}};
type InspectedSetupToken = {address:string;symbol:string;name:string;decimals:number;verified:boolean;network:string;warning:string|null;trust?:unknown};
type BrandedProject = {name:string;description?:string|null;logoUrl:string|null;websiteUrl?:string|null;brand:ProjectBrand};
const brandStyle=(brand?:ProjectBrand):CSSProperties|undefined=>brand?({"--project-primary":brand.primaryColor,"--project-accent":brand.accentColor,"--project-success":brand.successColor} as CSSProperties):undefined;
function useProjectBrand(brand?:ProjectBrand){
  useEffect(()=>{
    if(!brand)return;
    const root=document.documentElement;
    root.style.setProperty("--project-primary",brand.primaryColor);root.style.setProperty("--project-accent",brand.accentColor);root.style.setProperty("--project-success",brand.successColor);
    root.dataset.projectSurface=brand.surface;
    return()=>{root.style.removeProperty("--project-primary");root.style.removeProperty("--project-accent");root.style.removeProperty("--project-success");delete root.dataset.projectSurface};
  },[brand]);
}
type ClaimPreview = {
  id: string;
  allocationId: string;
  status: string;
  fundingStatus: string;
  claimable: boolean;
  amount: string;
  asset: string;
  assetTrust: {
    posture: string;
    reviewDigest: string | null;
    inspectedAt: string | null;
    explorerUrl: string | null;
    boundary: string;
  } | null;
  network: string;
  project: BrandedProject;
  message: string;
  sender: string;
  expiresAt: string | null;
  availableAt: string | null;
  identityBinding: {
    required: boolean;
    type: string | null;
    recipient: string | null;
    status: "sign-in-required" | "link-secured";
    supported: boolean;
    verifier: "project-attestation" | "current-session" | "link-secret";
  };
  claimCondition?: {
    required: boolean;
    eventType?: string;
    label?: string;
    description?: string;
    proofWindowMinutes?: number;
    status: "verification-required" | "not-required";
  };
  activationDestination: { url: string; label: string } | null;
};

type WalletActionResult = {
  complete?: boolean;
  challengeId?: string;
  pending?: boolean;
  status?: string;
  transactionHash?: string | null;
};

type DiscoveryOpportunity={id:string;kind:"drop"|"bounty"|"giveaway";title:string;description:string;category:string;project:{id:string;name:string;logoUrl:string|null;websiteUrl:string|null};reward:{amount:string;symbol:string;name:string};progress:{label:string;current:number;maximum:number|null};closesAt:string|null;publicUrl:string;funding:{fullyFunded:true;transactionHash:string|null;merkleRoot:string|null;network:"ARC-TESTNET"};placement:{tier:"current"|"surge"|"stream"|"standard";label:string;rank:number;reason:string};metrics:{impressions:number;opens:number;openRate:number;participation:number;participationLabel:string;boundary:string};createdAt:string};
type DiscoveryNetworkState={schemaVersion:string;generatedAt:string;items:DiscoveryOpportunity[];totals:{opportunities:number;drops:number;bounties:number;giveaways:number;fundedProjects:number;impressions:number;opens:number;participation:number};ranking:{order:string;safetyGate:string;disclosure:string};boundary:string};

type AssetTrustSignal={id:string;label:string;status:"verified"|"observed"|"caution"|"unavailable";detail:string};
type AssetTrust={schemaVersion:string;network:string;address:string;symbol:string;name:string;decimals:number;totalSupply:string;totalSupplyAtomic:string;codeHash:string;codeSizeBytes:number;owner:string|null;proxyImplementation:string|null;observedCapabilities:string[];verified:boolean;posture:"circle-verified"|"review-required"|"standard-observations";distributionPolicy:"allowed"|"allowed-with-disclosure";signals:AssetTrustSignal[];controlDigest:string;reviewDigest:string;inspectedAt:string;explorerUrl:string;boundary:string};
type InspectedToken = {address:string;symbol:string;name:string;decimals:number;verified:boolean;network:string;warning:string|null;trust:AssetTrust};

type AssetTrustWorkspace={schemaVersion:string;network:string;policy:{freshnessSeconds:number;enforcementPoints:string[]};totals:{assets:number;stable:number;changed:number;stale:number;protectedCampaigns:number};assets:Array<{tokenId:string;address:string;symbol:string;name:string;verified:boolean;status:"stable"|"changed"|"stale";changedFields:string[];campaigns:number;activeCampaigns:number;current:null|{posture:string;reviewDigest:string;controlDigest:string|null;inspectedAt:string;explorerUrl:string;signals:AssetTrustSignal[]};approved:null|{reviewDigest:string;controlDigest:string|null;inspectedAt:string};history:Array<{phase?:string;status?:string;changedFields?:string[];currentReviewDigest?:string;inspectedAt?:string;acknowledgedAt?:string}>}>};

type SocialPayment = {
  id:string;slug:string;kind:"send"|"request"|"tip"|"split";title:string;note:string|null;status:string;
  amount:string;paidAmount:string;currency:string;progress:{paid:number;total:number};expiresAt:string|null;createdAt:string;
  asset:Omit<InspectedToken,"network"|"warning">;
  url?:string;shares:Array<{id:string;label:string|null;amount:string;status:string;receiptNumber?:string;transactionHash?:string|null;paidAt?:string|null;payUrl?:string}>;
};

type PublicSocialPayment = Omit<SocialPayment,"shares"> & {
  creator?:{username:string;displayName:string};
  share:{id:string;label:string|null;amount:string;status:string;receiptNumber:string|null;transactionHash:string|null};
  payable:boolean;network:string;
};

type PortfolioState = {
  schemaVersion:string;network:string;walletAddress:string;explorerUrl:string;generatedAt:string;blockNumber:string;
  provenance:string;valuationBoundary:string;
  totals:{verifiedUsd:string;assets:number;pricedAssets:number;activity:number};
  assets:Array<{address:string;symbol:string;name:string;decimals:number;verified:boolean;trustPosture:"circle-verified"|"review-required"|"standard-observations"|"not-inspected";balance:string;balanceAtomic:string;usdValue:string|null;valuation:"stablecoin-parity"|"unpriced"|"unavailable";status:"verified"|"unavailable";explorerUrl:string}>;
  activity:Array<{id:string;kind:"claim"|"social-payment"|"checkout"|"subscription"|"wallet-transfer";direction:"in"|"out";title:string;amount:string;symbol:string;status:string;transactionHash:string|null;occurredAt:string}>;
};

type WalletTransferReceipt = {
  id:string;network:string;fromAddress:string;toAddress:string;
  asset:{address:string;symbol:string;name:string;decimals:number};
  amount:string;amountAtomic:string;status:string;receiptNumber:string;
  transactionHash:string|null;explorerUrl:string|null;confirmedAt:string|null;createdAt:string;
};

type ServiceStatusState = {
  service: string;
  environment: string;
  network: string;
  status: "operational" | "degraded" | "major_outage";
  score: number;
  generatedAt: string;
  responseTimeMs: number;
  components: Array<{ id: string; name: string; status: "operational" | "degraded" | "outage"; latencyMs: number | null; message: string }>;
  activeIncidents: ServiceIncident[];
  incidentHistory: ServiceIncident[];
  objectives: { availability: string; apiLatencyP95Ms: number; rpcLatencyP95Ms: number; recoveryTimeMinutes: number; onchainRecoveryPoint: string };
};

type ServiceIncident = {
  id: string;
  key: string;
  title: string;
  summary: string;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affectedComponents: string[];
  startedAt: string;
  latestUpdateAt: string;
  updates?: Array<{ id: string; status: string; message: string; createdAt: string }>;
};

type SecurityPostureState = {
  product: string;
  network: string;
  assurance: { internalReadinessScore: number; implementedControls: number; totalInternalControls: number; externalAuditStatus: string; mainnetApproved: boolean; statement: string };
  controls: Array<{ id: string; name: string; status: "implemented" | "pending-external-review"; evidence: string }>;
  privilegedRoles: Array<{ role: string; authority: string; boundary: string }>;
  fundFlows: Array<{ flow: string; custody: string; release: string }>;
  reviewPackage: { auditManifest: string; scope: string; threatModel: string; invariants: string; auditorGuide: string; disclosure: string; repository: string; commit: string | null };
  generatedAt: string;
};

type AuditReadinessState = {
  schemaVersion:string;product:string;network:string;assurance:string;mainnetApproved:boolean;manifestDigest:string;deploymentCommit:string|null;
  compiler:{package:string;versionRange:string;optimizer:{enabled:boolean;runs:number}};
  scope:{path:string;sha256:string;contracts:number;serverBoundaries:number;priorityProperties:number};
  verification:{scopeDriftGate:boolean;sourceDigests:number;artifactDigests:number;lockfilePinned:boolean;deploymentSnapshotPinned:boolean;externalAuditStatus:string;remediationStatus:string};
  reproducibility:{commands:string[]};boundary:string;
};

type NetworkProofState = {
  schemaVersion: string;
  product: string;
  network: string;
  configured: boolean;
  valueStatus: string;
  dataMode: string;
  asOf: string;
  totals: {
    projects: number; campaigns: number; recipientsTargeted: number; confirmedClaims: number;
    fundedWallets: number; activatedUsers: number; activationEvents: number;
    usdcClaimedAtomic: string; projectTokenCampaigns: number;
  };
  rates: { claimRate: number; activationRate: number };
  activity: Array<{ date: string; campaigns: number; claims: number; activations: number }>;
  sources: Array<{ metric: string; record: string; rule: string }>;
  privacy: string;
  digest: string;
};

type CampaignProofState = {
  schemaVersion:string; product:string; network:string; explorerUrl:string; configured:boolean; valueStatus:string; generatedAt:string; digest:string; privacy:string;
  totals:{campaigns:number;recipients:number;confirmedClaims:number;settlementTransactions:number;activationEvents:number;identityAttestations:number;fundedCampaigns:number};
  campaigns:Array<{proofRef:string;label:string;network:string;status:string;kind:string;digest:string;asset:{symbol:string;name:string;decimals:number;contractAddress:string;verified:boolean;amountAtomic:string;claimedAmountAtomic:string};targeting:{claimMode:string;recipients:number;allocationStates:Record<string,number>};settlement:{confirmedClaims:number;remainingAtomic:string;claimTransactions:Array<{hash:string;confirmedAt:string|null}>};activation:{events:number;distinctUsers:number;eventTypes:Record<string,number>};identity:{attestations:number;consumed:number;types:Record<string,number>};referrals:{total:number;states:Record<string,number>};anchors:{merkleRoot:string|null;vaultAddress:string|null;fundingTransactionHash:string|null;refundTransactionHash:string|null;crosschainFunding:Array<Record<string,unknown>>;gatewayFunding:Array<Record<string,unknown>>};recovery:{expiresAt:string|null;refundable:boolean;refunded:boolean};timeline:{createdAt:string;startsAt:string|null;expiresAt:string|null}}>;
};

type ReviewerDemoState = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;replayId:string;mode:string;boundary:string;digest:string;privacy:string;
  story:{headline:string;recipient:string;project:string;asset:string;amountAtomic:string;decimals:number;proofRef:string|null};
  readiness:{stages:number;verifiedStages:number;complete:boolean};
  stages:Array<{id:string;index:number;label:string;actor:string;status:string;explanation:string;evidence:Record<string,unknown>}>;
  liveContext:{campaigns:number;confirmedClaims:number;fundedWallets:number;activatedUsers:number;networkDigest:string;integrationDigest:string};
  reviewerActions:Array<{id:string;label:string;url:string|null}>;
  developerRecipe:{package:string;sequence:string[];integrationPaths:Array<{id:string;label:string}>};
};

type ProjectTokenProofState = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;configured:boolean;proofMode:string;valueStatus:string;boundary:string;headline:string;digest:string;privacy:string;
  readiness:{complete:boolean;verifiedStages:number;stages:number};
  asset:null|{symbol:string;name:string;decimals:number;contractAddress:string;contractUrl:string|null;approved:boolean;metadataHash:string;reserveBalance:string;totalDeposited:string;totalCampaignFunded:string};
  campaign:null|{proofRef:string;totalAmount:string;remainingAmount:string;recipientCount:number;merkleRoot:string;state:string;expiresAt:string;claimEvidence:string};
  settlement:null|{proofRef:string;totalAmount:string;remainingAmount:string;recipientCount:number;merkleRoot:string;state:string;expiresAt:string;claimed:boolean;claimEvidence:string;queueTransactionHash:string|null;queueTransactionUrl:string|null;fundingTransactionHash:string|null;fundingTransactionUrl:string|null;claimTransactionHash:string|null;claimTransactionUrl:string|null};
  governance:null|{governorOwnsVault:boolean;minimumDelaySeconds:number;queuedOperations:number;executedOperations:number;cancelledOperations:number};
  flow:Array<{id:string;label:string;status:string;evidence:string|null}>;
  contracts:Array<{id:string;label:string;address:string;url:string|null}>;
  transactions:Array<{id:string;label:string;hash:string;url:string|null}>;
};

type GrantProofHealthState = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;status:"healthy"|"degraded"|"unavailable";score:number;verifiedChecks:number;totalChecks:number;boundary:string;digest:string;privacy:string;
  checks:Array<{id:string;label:string;status:"verified"|"degraded"|"unavailable";statement:string;evidence:string|null;digest:string|null;externalGate:string|null}>;
  reviewerLinks:Record<string,string>;
};

const securityPreview: SecurityPostureState = {
  product:"Current CoFi",network:"Arc testnet",generatedAt:new Date(0).toISOString(),
  assurance:{internalReadinessScore:100,implementedControls:11,totalInternalControls:11,externalAuditStatus:"pending",mainnetApproved:false,statement:"Security readiness is internally evidenced on Arc testnet. Mainnet approval requires independent review and remediation closure."},
  controls:[...[
    ["runtime-bytecode","Exact runtime bytecode verification","The active release manifest binds every critical address to a versioned runtime code hash."],
    ["delayed-governance","Delayed protocol governance","High-impact protocol changes use public queues before execution."],
    ["guardian","Independent cancellation and pause","A separate guardian can cancel queued changes without gaining execution authority."],
    ["claim-replay","Claim replay and redirect resistance","One-time state, recipient-bound authorization, expiry, and domain separation are adversarially tested."],
    ["identity-privacy","Offchain identity privacy","Raw email and social identities never enter public chain state."],
    ["developer-auth","Scoped developer and agent authorization","Hashed keys, HMAC signatures, timestamp tolerance, idempotency, and server-side policy are enforced."],
    ["session-crypto","Encrypted account sessions","Production sessions use encryption and server-controlled authorization."],
    ["operational-response","Monitoring and incident response","Structured logs, health checks, SLOs, scheduled monitoring, and an incident ledger are live."],
    ["browser-boundary","Browser security boundary","HSTS, frame denial, MIME protection, no-referrer behavior, and permissions controls are deployed."],
    ["dependency-gate","Dependency and security CI gate","Production dependency advisories and source-level checks run continuously."],
    ["reproducible-audit-manifest","Reproducible audit scope manifest","Scoped contract sources, artifacts, lockfile, and deployment snapshot are digest-pinned."],
  ].map(([id,name,evidence])=>({id,name,status:"implemented" as const,evidence})),{id:"external-audit",name:"Independent external smart-contract review",status:"pending-external-review",evidence:"The audit package is ready, but no independent auditor has issued a final report. Current CoFi does not claim otherwise."}],
  privilegedRoles:[
    {role:"Protocol owner",authority:"Queues governed protocol changes and rotates operational configuration.",boundary:"High-impact actions pass through delayed governors."},
    {role:"Independent guardian",authority:"Cancels queued operations and can pause supported modules.",boundary:"Cannot execute queued operations or withdraw user distributions."},
    {role:"Claim authorizer",authority:"Signs wallet-bound claims after identity verification.",boundary:"Cannot redirect a signed claim, alter its amount, or withdraw escrowed assets."},
    {role:"Project administrator",authority:"Creates, funds, pauses, and recovers its own campaigns.",boundary:"Project-scoped access prevents cross-workspace control."},
    {role:"Scoped API or agent key",authority:"Performs only the actions and volumes granted by policy.",boundary:"Signatures, scopes, limits, and approval thresholds are enforced server-side."},
  ],
  fundFlows:[
    {flow:"Campaign distribution",custody:"Project token or USDC is escrowed in a dedicated Arc vault.",release:"A recipient-bound authorization releases the exact allocation once; expiry enables sender recovery."},
    {flow:"Product fees",custody:"USDC is separated into buyback, gas, liquidity, and operations buckets.",release:"Market execution is batched through an allowlisted adapter and governed constraints."},
    {flow:"Protocol liquidity",custody:"Paired $CURRENT and USDC remain in a dedicated vault.",release:"Only approved adapters and delayed governance can deploy or remove positions."},
    {flow:"Partner reserves",custody:"Partner assets are segregated by token in a reserve vault.",release:"Governed operations may fund specified campaigns or return idle reserves to the registered treasury."},
  ],
  reviewPackage:{auditManifest:"https://www.currentco.finance/api/v1/security/audit-readiness",scope:"https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/security/audit-scope.json",threatModel:"https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/security-threat-model.md",invariants:"https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/security-invariants.md",auditorGuide:"https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/docs/external-audit-package.md",disclosure:"https://github.com/qwspy-dev/CurrentCoFi/blob/codex/sdk-embeds/SECURITY.md",repository:"https://github.com/qwspy-dev/CurrentCoFi",commit:null},
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

type CampaignDeliveryCenterState = {
  items: Array<{
    id: string; distributionId: string; campaignName: string; identityType: string; maskedIdentity: string;
    amount: string; asset: string; claimUrl: string; channel: string; status: "ready" | "handed_off" | "claimed";
    sentAt: string | null; expiresAt: string; createdAt: string;
  }>;
  totals: { ready: number; handedOff: number; claimed: number; campaigns: number };
  privacy: string;
};

type CampaignAnalytics = {
  totals: {
    campaigns: number;
    liveCampaigns: number;
    targeted: number;
    claimed: number;
    activations: number;
    destinationRecipients: number;
    destinationOpens: number;
    destinationRate: number;
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
    destinationRecipients: number;
    destinationOpens: number;
  }>;
  discovery: {
    schemaVersion: "current-discovery-acquisition-v1";
    period: { days: number; startsAt: string; generatedAt: string };
    totals: { impressions: number; opens: number; participation: number; claims: number; activations: number };
    rates: { openRate: number; participationRate: number; claimRate: number; activationRate: number; impressionToActivationRate: number };
    daily: Array<{ day: string; impressions: number; opens: number }>;
    opportunities: Array<{ id: string; distributionId: string; kind: "drop"|"bounty"|"giveaway"; title: string; impressions: number; opens: number; participation: number; claims: number; activations: number; rates: { openRate: number; participationRate: number; claimRate: number; activationRate: number; impressionToActivationRate: number }; createdAt: string }>;
    boundary: string;
  };
};

type PayrollWorkspace = {
  schedules:Array<{
    id:string;name:string;status:string;cadenceDays:number;nextRunAt:string;claimExpiresHours:number;
    asset:{symbol:string;name:string;address:string;decimals:number};memberCount:number;totalAmount:string;totalAmountAtomic:string;
    members:Array<{id:string;displayName:string;role:string|null;identityType:string;maskedIdentity:string;amount:string;status:string}>;
    runs:Array<{id:string;distributionId:string|null;cycleAt:string;status:string;memberCount:number;totalAmount:string;preparedAt:string|null}>;
  }>;
  totals:{schedules:number;activeSchedules:number;contributors:number;preparedRuns:number};privacy:string;
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
    checkoutLinks?: number;
    checkoutPayments?: number;
    checkoutVolume?: string;
    subscriptionPlans?: number;
    activeSubscriptions?: number;
    subscriptionCycles?: number;
    subscriptionVolume?: string;
    escrowAgreements?: number;
    fundedEscrowAgreements?: number;
    settledEscrowMilestones?: number;
  };
  commerce?: {
    merchant: { name: string; status: string; settlementAddress: string } | null;
    checkout: { links: number; confirmedPayments: number; refunds: number; volume: string; settlements: Array<{ checkoutId: string; title: string; receiptNumber: string; status: string; amount: string; transactionHash: string | null; refundTransactionHash: string | null; paidAt: string | null }> };
    subscriptions: { plans: number; active: number; cancelled: number; confirmedCycles: number; volume: string; renewalDue: number; pastDue: number; settlements: Array<{ planId: string; planTitle: string; periodNumber: number; receiptNumber: string; amount: string; transactionHash: string | null; paidAt: string | null }> };
  };
  escrow?: {
    totals: { agreements: number; funded: number; active: number; completed: number; disputed: number; submitted: number; settled: number };
    assets: Array<{ symbol: string; address: string; agreements: number; secured: string; released: string; refunded: string }>;
    agreements: Array<{ id: string; name: string; status: string; asset: { symbol: string; address: string }; totalAmount: string; releasedAmount: string; refundedAmount: string; milestoneCount: number; nextMilestone: number; anchors: { contractDealId: string; contractAddress: string | null; termsHash: string; fundingTransactionHash: string | null }; milestones: Array<{ position: number; title: string; status: string; amount: string; dueAt: string; proofHash: string | null; submissionTransactionHash: string | null; settlementTransactionHash: string | null; submittedAt: string | null; settledAt: string | null }>; createdAt: string }>;
    privacy: string;
    boundary: string;
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

type GrantReviewPackage = {
  schemaVersion: string;
  digest: string;
  evidence: { id: string; publicSlug: string; schemaVersion: string; digest: string; integrity: { valid: boolean; recalculatedDigest: string }; generatedAt: string };
  application: { project: string; website: string; oneLiner: string; problem: string; solution: string; whyArc: string; ecosystemValue: string };
  officialCriteria: Array<{ id: string; label: string; summary: string }>;
  architecture: Array<{ product: string; role: string }>;
  proof: { readinessScore: number; campaigns: number; targetedRecipients: number; claims: number; walletsCreated: number; activations: number; activeApiKeys: number; activeWebhooks: number; pilots: number; checkoutVolume: string; subscriptionVolume: string; escrowAgreements: number; fundedEscrowAgreements: number; settledEscrowMilestones: number; network: string; chainId: number; usdcAddress: string; campaignVaultAddress: string | null; releaseReadiness: boolean; securityPackageReady: boolean };
  shipped: string[];
  proposedMilestones: Array<{ id: string; title: string; measurement: string; dependsOn: string }>;
  honestGaps: Array<{ id: string; label: string; evidence: string }>;
  reviewerLinks: Record<string, string>;
  privacy: string;
};

type BountySubmission = {id:string;displayName:string;contactType:string;maskedContact:string;workUrl:string;workSummary:string;proofDigest:string;status:string;createdAt:string;reviewedAt:string|null};
type BountyRecord = {
  id:string;slug:string;title:string;summary:string;category:string;status:string;submissionDeadline:string;awardedAt:string|null;
  project:{name:string;logoUrl:string|null};prize:{amount:string;amountAtomic:string;symbol:string;name:string;address:string};
  funding:{status:string;transactionHash:string|null;merkleRoot:string|null;fullyFunded:boolean};distributionId:string;submissionCount:number;publicUrl:string;submissions?:BountySubmission[];
};
type BountyWorkspace={bounties:BountyRecord[];totals:{bounties:number;open:number;submissions:number;awarded:number};privacy:string};
type PublicBounty=BountyRecord&{project:BrandedProject;canSubmit:boolean;proof:{network:string;fullyFunded:boolean;boundary:string}};
type GiveawayRecord={id:string;slug:string;title:string;description:string;status:string;entryDeadline:string;maxEntries:number;entryCount:number;project:BrandedProject;distributionId:string;publicUrl:string;referrals:number;prize:{amount:string;amountAtomic:string;symbol:string;name:string;address:string};funding:{status:string;fullyFunded:boolean;transactionHash:string|null;merkleRoot:string|null};proof:{method:string;randomnessCommitment:string;allocationIdentityHash:string|null;entrySetDigest:string|null;drawDigest:string|null;revealedRandomness:string|null;deterministic:boolean;boundary:string};winner:{displayName:string;maskedIdentity:string;entryDigest:string}|null;entries?:Array<{id:string;displayName:string;identityType:string;maskedIdentity:string;referralCode:string;referredByCode:string|null;entryDigest:string;status:string;createdAt:string}>};
type GiveawayWorkspace={giveaways:GiveawayRecord[];totals:{giveaways:number;open:number;entries:number;referrals:number;drawn:number};privacy:string};
type PublicGiveaway=GiveawayRecord&{canEnter:boolean};
type PublicDropRecord={id:string;slug:string;title:string;description:string;status:string;project:BrandedProject;distributionId:string;publicUrl:string;reward:{amount:string;amountAtomic:string;symbol:string;name:string;address:string};capacity:{maximum:number;reserved:number;claimed:number;remaining:number;percentReserved:number};funding:{status:string;fullyFunded:boolean;transactionHash:string|null;merkleRoot:string|null;totalAmount:string};expiresAt:string|null;claimCondition:{eventType:string;label:string;description:string;proofWindowMinutes:number}|null;proof:{mode:string;identityBinding:string;oneClaimPerIdentity:boolean;recipientPaysGas:boolean;boundary:string};recipients?:Array<{displayName:string|null;maskedIdentity:string|null;referralCode:string|null;referredByCode:string|null;status:string;reservedAt:string|null}>;referrals:number;canReserve:boolean};
type PublicDropWorkspace={drops:PublicDropRecord[];totals:{drops:number;open:number;reserved:number;claimed:number;referrals:number};privacy:string};
type VestingBatch={id:string;name:string;description:string;status:string;distributionId:string;cliffAt:string;releaseCount:number;intervalDays:number;lastUnlockAt:string;publicProofUrl:string;asset:{symbol:string;name:string;address:string};funding:{status:string;fullyFunded:boolean;merkleRoot:string|null;transactionHash:string|null};totals:{recipients:number;tranches:number;unlocked:number;claimed:number;amount:string};schedules:Array<{id:string;displayName:string;identityType:string;maskedIdentity:string;totalAmount:string;claimed:number;recipientUrl?:string}>};
type VestingWorkspace={batches:VestingBatch[];totals:{batches:number;recipients:number;tranches:number;claimed:number};privacy:string};
type PublicVesting={id:string;batch:{name:string;description:string};recipient:{displayName:string;maskedIdentity:string};asset:{symbol:string;name:string;address:string};funding:{status:string;fullyFunded:boolean;merkleRoot:string|null;transactionHash:string|null};totalAmount:string;claimedAmount:string;tranches:Array<{id:string;position:number;unlockAt:string;amount:string;status:string;claimUrl:string|null;transactionHash:string|null}>;proof:{method:string;merkleRoot:string|null;boundary:string}};
type TreasuryWorkspace={
  treasury:null|{id:string;name:string;description:string|null;address:string;status:string;publicSlug:string;publicUrl:string;project:{name:string;logoUrl:string|null}};
  balances:Array<{symbol:string;address:string;amountAtomic:string|null;amount:string|null;decimals:number}>;
  budgets:Array<{id:string;category:string;status:string;limit:string;committed:string;spent:string;remaining:string;asset:string;periodStart:string;periodEnd:string}>;
  proposals:Array<{id:string;title:string;description:string;category:string;amount:string;asset:{symbol:string;name:string;address:string;decimals:number};recipientAddress:string;status:string;approvalCount:number;approvalsRequired:number;transactionHash:string|null;explorerUrl:string|null;proofUrl:string|null;executedAt:string|null;createdAt:string}>;
  totals:{proposals:number;pending:number;executed:number;categories:number};proof?:{network:string;nonCustodial:boolean;privacy:string};
};

type GrantDossierState = {
  schemaVersion: string; product: string; environment: string; generatedAt: string; boundary: string; digest: string;
  application: { oneLiner: string; problem: string; solution: string; ecosystemValue: string };
  criteria: Array<{ id: string; label: string; statement: string; proof: readonly string[] }>;
  architecture: Array<{ product: string; role: string }>;
  shipped: Array<{ id: string; label: string; detail: string }>;
  liveProof: {
    network: NetworkProofState;
    release: { available: boolean; configured: boolean; readinessScore: number; active: boolean; verifiedComponents: number; componentCount: number; proofMode: string };
    security: { internalReadinessScore: number; implementedControls: number; externalAuditStatus: string; mainnetApproved: boolean; commit: string|null };
    integration: { digest: string; paths: number; endpoints: number; circleStack: readonly string[] };
  };
  externalGates: Array<{ id: string; label: string; status: string; target: string }>;
  proposedGrantMilestones: Array<{ id: string; title: string; measurement: string }>;
  reviewerLinks: Record<string,string>;
  privacy: string;
};

type GrantApplicationState = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;status:string;boundary:string;digest:string;executiveSummary:string;privacy:string;
  officialGrantSource:{name:string;url:string;applicationUrl:string;researchedAt:string;applicationWindowObserved:string;criteria:readonly string[]};
  applicationAnswers:Array<{id:string;prompt:string;response:string;wordCount:number;evidence:string[]}>;
  architecture:Array<{product:string;role:string}>;
  evidenceSnapshot:{projects:number;campaigns:number;targetedRecipients:number;confirmedClaims:number;fundedWallets:number;activatedUsers:number;releaseReadinessScore:number;securityReadinessScore:number};
  proposedMilestones:Array<{id:string;title:string;measurement:string;sequence:number;acceptanceEvidence:string[]}>;
  externalGates:Array<{id:string;label:string;status:string;target:string}>;
  applicantInputs:Array<{id:string;label:string;reason:string}>;
  submissionChecklist:{internallyComplete:string[];awaitingApplicant:string[];awaitingExternal:string[]};
  reviewerLinks:Record<string,string>;
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

type PilotInvitation = {
  id: string; publicSlug: string; name: string; summary: string; status: string;
  integrationMode: string; requestedIntegrations: string[]; targetRecipients: number;
  maxApplications: number; applicationCount: number; expiresAt: string | null; createdAt: string;
};

type PilotApplication = {
  id: string; publicSlug: string; organizationName: string; websiteUrl: string | null;
  applicantName: string; applicantRole: string; contact?: string; useCase: string;
  audienceDescription: string; expectedRecipients: number; integrationMode: string;
  requestedIntegrations: string[]; readiness: { completed?: number; total?: number; score?: number };
  status: "submitted" | "accepted" | "declined"; reviewNotes: string | null;
  pilotId: string | null; createdAt: string; updatedAt: string;
};

type PublicPilotInvitation = {
  project: { name: string; websiteUrl: string | null };
  invitation: PilotInvitation;
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
  claimCondition: { eventType: string; label: string; description: string; proofWindowMinutes: number } | null;
  expiresAt: string;
  links: Array<{ allocationId: string; identity: string; identityType: string; amount: string; claimUrl: string }>;
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

type CampaignQualityState = {
  totals: { evaluated: number; allowed: number; review: number; held: number };
  retention: { day1: number; day7: number; day30: number; returning: number };
  cohorts: Array<{ week: string; claimed: number; eligibleDay7: number; retainedDay7: number; day7Rate: number }>;
  policies: Array<{
    distributionId: string; campaignName: string; configured: boolean; reviewThreshold: number;
    holdThreshold: number; burstWindowMinutes: number; burstReferralCount: number;
    minimumAccountAgeMinutes: number; minimumActivationDelaySeconds: number;
    action: "monitor" | "review" | "hold-referral-reward";
  }>;
  reviewQueue: Array<{
    id: string; distributionId: string; campaignName: string; score: number; band: string;
    decision: string; signals: Array<{ id: string; weight: number; evidence: string }>; evaluatedAt: string;
  }>;
};

type EscrowAgreement = {
  id: string; name: string; status: string; clientAddress: string; providerAddress: string;
  arbitratorAddress: string; refundAddress: string; contractDealId: string; contractAddress: string | null;
  termsHash: string; fundingTransactionHash: string | null;
  asset: { address: string; symbol: string; decimals: number };
  totalAmount: string; releasedAmount: string; refundedAmount: string; nextMilestone: number; cancellationRequested: boolean;
  milestones: Array<{ id: string | null; position: number; title: string; amount: string; amountAtomic: string; dueAt: string; status: string; proofHash: string | null; submissionTransactionHash: string | null; settlementTransactionHash: string | null }>;
  createdAt: string; updatedAt: string;
};

type EscrowState = { configured: boolean; network: string; agreements: EscrowAgreement[] };
type CheckoutPaymentAsset = {address:string;symbol:string;decimals:number;settlement:"direct"|"routed-to-usdc";available:boolean};
type CheckoutQuote = {tokenAddress:string;symbol:string;amount:string;amountAtomic:string;merchantReceives:string;merchantCurrency:"USDC";route:"direct"|"testnet-fixed-rate";expiresAt:string|null;boundary?:string};
type CheckoutRecord = { id:string;slug:string;title:string;description:string|null;status:string;amount:string;amountAtomic:string;currency:string;expiresAt:string|null;successUrl:string|null;checkoutUrl?:string;merchant:{id:string;name:string;slug:string;description:string|null;logoUrl:string|null;settlementAddress:string};paymentAssets:CheckoutPaymentAsset[];settlementBoundary:string;createdAt:string };
type CheckoutPayment = { id:string;receiptNumber:string;status:string;amount:string;currency:string;paymentAsset:{address:string;symbol:string;amount:string;amountAtomic:string;settlementMode:"direct-usdc"|"routed-token"};customerAddress:string;merchantAddress:string;paymentTransactionHash:string|null;refundTransactionHash:string|null;paidAt:string|null;refundedAt:string|null;checkout:{id:string;title:string;slug:string};merchant:{name:string;slug:string};createdAt:string };
type CommerceState = { merchant:null|{id:string;displayName:string;slug:string;description:string|null;logoUrl:string|null;settlementAddress:string;status:string};checkouts:CheckoutRecord[];payments:CheckoutPayment[];totals:{checkouts:number;payments:number;volume:string;refunds:number} };
type SubscriptionPlan = {id:string;slug:string;title:string;description:string|null;status:string;amount:string;amountAtomic:string;currency:string;intervalDays:number;successUrl:string|null;subscribeUrl?:string;merchant:{id:string;name:string;slug:string;description:string|null;settlementAddress:string};createdAt:string};
type SubscriptionRecord = {id:string;status:string;cycleCount:number;subscriberAddress:string;merchantAddress:string;currentPeriodStart:string|null;currentPeriodEnd:string|null;renewalDue:boolean;pastDue:boolean;cancelledAt:string|null;plan:SubscriptionPlan;payments:Array<{id:string;periodNumber:number;amount:string;status:string;receiptNumber:string;transactionHash:string|null;dueAt:string;paidAt:string|null}>;notices:Array<{id:string;kind:string;status:string;periodNumber:number;dueAt:string;acknowledgedAt:string|null;createdAt:string}>;createdAt:string};
type SubscriptionWorkspace = {merchant:CommerceState["merchant"];plans:SubscriptionPlan[];merchantSubscriptions:SubscriptionRecord[];subscriberSubscriptions:SubscriptionRecord[];totals:{plans:number;activeSubscriptions:number;payments:number;collected:string;openRenewals:number;pastDue:number}};
const escrowPlanningEpoch = new Date().getTime();
function futureEscrowDate(days:number){const date=new Date(escrowPlanningEpoch+days*86_400_000);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)}

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

type PartnerVaultState = {
  configured: boolean; network: string; explorerUrl?: string;
  addresses: null | { vault: string; governor: string; testnetPartnerToken: string; campaignVault: string };
  asset: null | { approved: boolean; treasury: string; metadataHash: string; symbol: string; reserveBalance: string; totalDeposited: string; totalCampaignFunded: string };
  governance: null | { governorOwnsVault: boolean; guardian: string; minimumDelaySeconds: number; totalQueued: number; totalExecuted: number; totalCancelled: number };
  totals?: { approvedAssets: number; deposits: number; campaignsFunded: number };
  proofCampaign: null | { id: string; totalAmount: string; remainingAmount: string; expiresAt: number; recipientCount: number; merkleRoot: string; state: number };
  proofMode?: string;
};

type VenueRegistryState = {
  configured: boolean; network: string; explorerUrl?: string;
  addresses: null | { registry: string; governor: string; adapter: string; current: string; usdc: string };
  venue: null | { approved: boolean; venueId: string; venueNameHash: string; registeredCodeHash: string; liveCodeHash: string | null; codeHashMatches: boolean; maxSlippageBps: number; maxAllocationBps: number; activatedAt: number; updatedAt: number };
  governance: null | { governorOwnsRegistry: boolean; guardian: string; minimumDelaySeconds: number; totalQueued: number; totalExecuted: number; totalCancelled: number };
  totals?: { approvedVenues: number; approvals: number; revocations: number };
  readiness?: { custodyAdapterBoundary: boolean; exactBytecodeBinding: boolean; exactPairBinding: boolean; riskCaps: boolean; testnetQualificationOnly: boolean };
  proofMode?: string;
};

type LaunchReadinessState = {
  configured: boolean; network: string; explorerUrl?: string; readinessScore: number;
  addresses?: { registry: string; governor: string };
  release: null | { id: string; manifestHash: string; totalReleases: number; appliedAt: number; componentCount: number; active: boolean };
  governance: null | { guardian: string; minimumDelaySeconds: number; paused: boolean; totalQueued: number; totalExecuted: number; totalCancelled: number };
  components: Array<{ id: string; key: string; label: string; address: string; codeHash: string; versionHash: string; active: boolean; valid: boolean; addressMatches: boolean }>;
  checks?: Record<string, boolean>; proofMode?: string;
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

function grantShareUrl(publicSlug: string) {
  return `${location.origin}/?grant=${encodeURIComponent(publicSlug)}#/grant`;
}

function pilotShareUrl(publicSlug: string) {
  return `${location.origin}/?pilot=${encodeURIComponent(publicSlug)}#/pilots`;
}

function pilotInviteUrl(publicSlug: string) {
  return `${location.origin}/?pilotInvite=${encodeURIComponent(publicSlug)}#/pilots`;
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

function compactAddress(value:string) {
  return `${value.slice(0,7)}…${value.slice(-5)}`;
}

const validViews = new Set<View>([
  "home", "claim", "overview", "account", "create", "payments", "pay", "onboarding", "members", "activity", "campaigns", "discover", "bounty",
  "new-campaign", "funding", "payroll", "bounties", "drops", "drop", "giveaways", "giveaway", "vesting", "vesting-claim", "treasury", "public-treasury", "recipients", "deliveries", "referrals", "analytics", "pilots", "evidence", "grant", "token", "partners", "venues", "launch", "operations", "security", "asset-trust",
  "escrow", "commerce", "checkout", "subscriptions", "subscribe", "developers", "integration-lab", "certification", "network-proof", "grant-dossier", "grant-application", "proof-explorer", "reviewer-demo", "project-token-proof", "proof-health", "api-keys", "webhooks", "agents", "brand", "settings", "states",
]);

function viewFromHash(hash: string): View | null {
  if (hash.startsWith("#state=")) return "claim";
  if (hash.startsWith("#/checkout/")) return "checkout";
  if (hash === "#/bounty") return "bounty";
  if (hash === "#/drop") return "drop";
  if (hash.startsWith("#/vesting-claim")) return "vesting-claim";
  if (hash.startsWith("#/public-treasury")) return "public-treasury";
  if (hash.startsWith("#/subscribe/")) return "subscribe";
  if (hash.startsWith("#/pay/")) return "pay";
  if (!hash.startsWith("#/")) return null;
  const value = hash.slice(2) as View;
  return validViews.has(value) ? value : null;
}

const appNav = [
  { label: "Workspace", items: [
    ["overview", "Overview", Gauge], ["account", "My account", Wallet], ["onboarding", "Project setup", Globe2], ["members", "Team access", Users], ["activity", "Activity center", Activity], ["brand", "Brand studio", Sparkles],
    ["create", "Create link", Link2],
    ["payments", "Social payments", CircleDollarSign],
    ["funding", "Crosschain funding", Globe2], ["campaigns", "Campaigns", Layers3], ["discover", "Discover", Compass], ["drops", "Public mass drops", Radio], ["vesting", "Launch vesting", Clock3], ["bounties", "Community bounties", Target], ["giveaways", "Verifiable giveaways", Gift], ["payroll", "Community payroll", Repeat2], ["treasury", "Community treasury", CircleDollarSign], ["recipients", "Recipients", Users], ["deliveries", "Delivery center", Send],
    ["escrow", "Milestone escrow", Lock],
    ["commerce", "Merchant checkout", ShoppingBag],
    ["subscriptions", "Subscriptions", Repeat2],
    ["referrals", "Referrals", Network], ["analytics", "Analytics", BarChart3],
    ["pilots", "Pilot operations", Handshake],
    ["evidence", "Grant evidence", FileCheck2], ["grant", "Grant review room", BadgeCheck],
  ]},
  { label: "Protocol", items: [
    ["token", "$CURRENT", CircleDollarSign], ["partners", "Partner vault", Handshake], ["venues", "Liquidity venues", Network], ["launch", "Launch readiness", Rocket], ["operations", "Operations", Activity], ["asset-trust", "Asset trust", Fingerprint], ["security", "Security", ShieldCheck], ["developers", "Developers", Code2], ["integration-lab", "Integration lab", Braces],
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

function TokenTrustPanel({token}:{token:InspectedToken}) {
  const caution=token.trust.signals.filter(signal=>signal.status==="caution").length;
  return <div className="token-trust-panel"><header><div><ShieldCheck/><span><small>CONTRACT OBSERVATIONS</small><b>{token.trust.posture.replaceAll("-"," ")}</b></span></div><Status tone={token.trust.verified?"green":caution?"red":"cyan"}>{token.trust.verified?"Circle verified":caution?`${caution} review signal${caution===1?"":"s"}`:"No monitored controls observed"}</Status></header><div>{token.trust.signals.map(signal=><article className={signal.status} key={signal.id}><span>{signal.status==="verified"?<Check/>:signal.status==="caution"?<ShieldAlert/>:<Fingerprint/>}</span><div><b>{signal.label}</b><p>{signal.detail}</p></div></article>)}</div><footer><span><small>REVIEW DIGEST</small><code>{token.trust.reviewDigest.slice(0,18)}…</code></span><a href={token.trust.explorerUrl} target="_blank" rel="noreferrer">Inspect contract <ExternalLink/></a><p>{token.trust.boundary}</p></footer></div>;
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

function useNetworkProof() {
  const [proof,setProof]=useState<NetworkProofState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(()=>currentApi.get<NetworkProofState>("/network-proof").then(setProof).catch(reason=>setError(reason instanceof Error?reason.message:"Network proof is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<NetworkProofState>("/network-proof").then(value=>{if(active)setProof(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Network proof is temporarily unavailable.")});return()=>{active=false}},[]);
  return {proof,error,refresh};
}

function NetworkProofView({go}:{go:(v:View)=>void}) {
  const {proof,error,refresh}=useNetworkProof();
  const totals=proof?.totals;
  const maxActivity=Math.max(1,...(proof?.activity??[]).map(day=>day.campaigns+day.claims+day.activations));
  const number=(value:number|undefined)=>value===undefined?"—":value.toLocaleString();
  return <div className="network-proof-page">
    <header><Brand onClick={()=>go("home")}/><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="network-proof-hero">
        <FluidCanvas mode="branches"/>
        <div><Eyebrow light><BadgeCheck/> PUBLIC NETWORK PROOF</Eyebrow><h1>Every number<br/><em>has a source.</em></h1><p>Privacy-safe, database-backed Arc testnet activity. No projected traction, token valuations, or mainnet claims.</p></div>
        <aside><span className={proof?.configured?"verified":"unconfigured"}><i/>{proof?.configured?"Live records connected":"Proof source unavailable"}</span><small>ENVIRONMENT</small><strong>{proof?.network??"Arc testnet"}</strong><small>VALUE STATUS</small><strong>{proof?.valueStatus??"Test assets have no monetary value"}</strong></aside>
      </section>

      {error?<section className="network-proof-error"><ShieldAlert/><div><h2>Proof service unavailable</h2><p>{error}</p></div><Button tone="blue" onClick={refresh}>Try again <RefreshCw/></Button></section>:null}

      <section className="network-proof-totals">
        <article><small>USDC TEST CLAIMED</small><strong>{proof?`${formatAtomic(totals?.usdcClaimedAtomic??"0")} USDC`:"—"}</strong><span>Confirmed accounting only · no monetary-value claim</span></article>
        <article><small>CONFIRMED CLAIMS</small><strong>{number(totals?.confirmedClaims)}</strong><span>{proof?`${proof.rates.claimRate}% of ${number(totals?.recipientsTargeted)} recipients targeted`:"Verifying network records"}</span></article>
        <article><small>FUNDED WALLETS</small><strong>{number(totals?.fundedWallets)}</strong><span>Distinct confirmed destination wallets</span></article>
        <article><small>ACTIVATED USERS</small><strong>{number(totals?.activatedUsers)}</strong><span>{proof?`${proof.rates.activationRate}% of confirmed claimants`:"Verifying activation events"}</span></article>
      </section>

      <section className="network-proof-flow">
        <div className="proof-flow-copy"><Eyebrow>VERIFIED FUNNEL</Eyebrow><h2>From audience<br/>to active user.</h2><p>The funnel only advances when a corresponding Current record exists. It never estimates reach from social followers or campaign budget.</p></div>
        <div className="proof-flow-track">
          {[
            {label:"Recipients targeted",value:totals?.recipientsTargeted,Icon:Users},
            {label:"Claims confirmed",value:totals?.confirmedClaims,Icon:Gift},
            {label:"Wallets funded",value:totals?.fundedWallets,Icon:Wallet},
            {label:"Users activated",value:totals?.activatedUsers,Icon:Target},
          ].map(({label,value,Icon},index)=><div key={label}><span><Icon/></span><small>0{index+1}</small><strong>{number(value)}</strong><b>{label}</b></div>)}
        </div>
      </section>

      <section className="network-proof-activity">
        <div><Eyebrow>14-DAY RECORD</Eyebrow><h2>Activity, not projections.</h2><p>Campaign creation, confirmed claims, and activation events recorded during the latest fourteen UTC days.</p></div>
        <div className="proof-bars" aria-label="Fourteen-day testnet activity">
          {(proof?.activity??Array.from({length:14},(_,index)=>({date:String(index),campaigns:0,claims:0,activations:0}))).map(day=><span key={day.date} title={`${day.date}: ${day.campaigns} campaigns, ${day.claims} claims, ${day.activations} activations`}><i style={{height:`${Math.max(3,((day.campaigns+day.claims+day.activations)/maxActivity)*100)}%`}}/><small>{day.date.slice(5)||"—"}</small></span>)}
        </div>
      </section>

      <section className="network-proof-ledger">
        <div className="proof-ledger-head"><div><Eyebrow>SOURCE LEDGER</Eyebrow><h2>What each metric proves.</h2></div><span><ShieldCheck/> Aggregate-only output<br/><small>No identities or wallet addresses</small></span></div>
        <div className="proof-source-list">{(proof?.sources??[]).map((source,index)=><article key={source.metric}><small>0{index+1}</small><div><h3>{source.metric}</h3><code>{source.record}</code><p>{source.rule}</p></div><CheckCircle2/></article>)}</div>
        <footer><div><small>SHA-256 SNAPSHOT DIGEST</small><code>{proof?.digest??"Waiting for verified snapshot…"}</code></div><div><small>SNAPSHOT TIME</small><strong>{proof?new Date(proof.asOf).toLocaleString():"Verifying…"}</strong></div><button onClick={refresh}><RefreshCw/>Refresh proof</button><p>{proof?.privacy??"Only aggregate records are published."}</p></footer>
      </section>
    </main>
  </div>;
}

function CampaignProofExplorerView({go}:{go:(v:View)=>void}) {
  const [proof,setProof]=useState<CampaignProofState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<CampaignProofState>("/campaign-proofs").then(value=>{setProof(value);setError(null)}).catch(reason=>setError(reason instanceof Error?reason.message:"Campaign proof is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<CampaignProofState>("/campaign-proofs").then(value=>{if(active)setProof(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Campaign proof is temporarily unavailable.")});return()=>{active=false}},[]);
  const campaign=proof?.campaigns.find(item=>item.proofRef===selected)??proof?.campaigns[0];
  const amount=(atomic:string|undefined,decimals=6)=>atomic===undefined?"—":(Number(atomic)/10**decimals).toLocaleString(undefined,{maximumFractionDigits:6});
  const tx=(hash:string)=>`${proof?.explorerUrl??"https://testnet.arcscan.app"}/tx/${hash}`;
  const anchors=campaign?[campaign.anchors.fundingTransactionHash,...campaign.settlement.claimTransactions.map(item=>item.hash),campaign.anchors.refundTransactionHash].filter((value):value is string=>Boolean(value)):[];
  return <div className="campaign-proof-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-dossier")}>Grant dossier</button><button onClick={()=>go("network-proof")}>Network proof</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="campaign-proof-hero"><FluidCanvas mode="branches"/><div><Eyebrow light><Fingerprint/> PUBLIC CAMPAIGN PROOF</Eyebrow><h1>Follow every<br/><em>current.</em></h1><p>Inspect campaign funding, allocation state, Arc settlement, activation, and recovery—without exposing a recipient or private project record.</p></div><aside><span><i/>{proof?.configured?"Live records connected":"Waiting for records"}</span><small>PRIVACY MODE</small><strong>One-way campaign aliases</strong><small>INTEGRITY</small><strong>Per-campaign SHA-256</strong><code>{proof?.digest.slice(0,24)??"Verifying…"}</code></aside></section>
      {error?<section className="campaign-proof-error"><ShieldAlert/><div><h2>Proof service unavailable</h2><p>{error}</p></div><Button tone="blue" onClick={()=>void load()}>Try again <RefreshCw/></Button></section>:null}
      <section className="campaign-proof-metrics">{[["CAMPAIGNS",proof?.totals.campaigns],["RECIPIENTS",proof?.totals.recipients],["ARC SETTLEMENTS",proof?.totals.settlementTransactions],["ACTIVATION EVENTS",proof?.totals.activationEvents],["FUNDED CAMPAIGNS",proof?.totals.fundedCampaigns]].map(([label,value])=><article key={String(label)}><small>{label}</small><strong>{value===undefined?"—":Number(value).toLocaleString()}</strong></article>)}</section>
      <section className="campaign-proof-workbench">
        <aside><div><Eyebrow>PROOF INDEX</Eyebrow><h2>Recorded campaigns</h2><p>Names and internal IDs are replaced with stable one-way references.</p></div>{!proof&&!error?<div className="proof-list-loading"><RefreshCw className="spin"/>Reading campaign ledger…</div>:proof?.campaigns.map(item=><button className={item.proofRef===campaign?.proofRef?"active":""} onClick={()=>setSelected(item.proofRef)} key={item.proofRef}><span><b>{item.proofRef}</b><small>{item.kind.replaceAll("-"," ")} · {item.status}</small></span><strong>{item.asset.symbol}</strong><i>{item.settlement.confirmedClaims}/{item.targeting.recipients} claims</i><ArrowRight/></button>)}</aside>
        <div className="campaign-proof-detail">{campaign?<>
          <div className="proof-detail-head"><div><small>ANONYMOUS PUBLIC REFERENCE</small><h2>{campaign.proofRef}</h2><p>{campaign.kind.replaceAll("-"," ")} · {campaign.targeting.claimMode}</p></div><span className={campaign.anchors.fundingTransactionHash?"funded":""}><BadgeCheck/>{campaign.anchors.fundingTransactionHash?"Funding anchored":"Record created"}</span></div>
          <div className="proof-detail-funnel"><article><Users/><strong>{campaign.targeting.recipients.toLocaleString()}</strong><small>Targeted</small></article><article><Gift/><strong>{campaign.settlement.confirmedClaims.toLocaleString()}</strong><small>Claimed</small></article><article><Target/><strong>{campaign.activation.distinctUsers.toLocaleString()}</strong><small>Activated</small></article><article><Fingerprint/><strong>{campaign.identity.attestations.toLocaleString()}</strong><small>Attested</small></article></div>
          <div className="proof-detail-grid">
            <article><small>ASSET</small><h3>{campaign.asset.name} <em>{campaign.asset.symbol}</em></h3><p>{amount(campaign.asset.claimedAmountAtomic,campaign.asset.decimals)} of {amount(campaign.asset.amountAtomic,campaign.asset.decimals)} claimed</p><code>{campaign.asset.contractAddress}</code></article>
            <article><small>RECOVERY</small><h3>{campaign.recovery.refunded?"Refund settled":campaign.recovery.refundable?"Funds recoverable":"Campaign protected"}</h3><p>{amount(campaign.settlement.remainingAtomic,campaign.asset.decimals)} {campaign.asset.symbol} remains in campaign accounting.</p><code>{campaign.recovery.expiresAt?new Date(campaign.recovery.expiresAt).toLocaleString():"No public expiry"}</code></article>
            <article><small>ALLOCATION STATES</small><h3>{Object.values(campaign.targeting.allocationStates).reduce((a,b)=>a+b,0)} verified records</h3><div className="proof-chips">{Object.entries(campaign.targeting.allocationStates).map(([key,value])=><span key={key}>{key} · {value}</span>)}</div></article>
            <article><small>ACTIVATION + IDENTITY</small><h3>{campaign.activation.events} activation events</h3><div className="proof-chips">{Object.entries({...campaign.activation.eventTypes,...campaign.identity.types}).map(([key,value])=><span key={key}>{key.replaceAll("_"," ")} · {value}</span>)}</div></article>
          </div>
          <section className="proof-anchor-ledger"><div><small>PUBLIC ARC ANCHORS</small><h3>{anchors.length} transaction proofs</h3></div>{anchors.length?anchors.map((hash,index)=><a href={tx(hash)} target="_blank" rel="noreferrer" key={`${hash}-${index}`}><span><small>{index===0?"CAMPAIGN FUNDING":"SETTLEMENT"}</small><code>{hash}</code></span><ArrowUpRight/></a>):<p>No transaction hash is recorded for this campaign yet.</p>}
          {campaign.anchors.merkleRoot?<div className="proof-root"><span><small>MERKLE COMMITMENT</small><code>{campaign.anchors.merkleRoot}</code></span><ShieldCheck/></div>:null}</section>
          <footer><span><small>CAMPAIGN DIGEST</small><code>{campaign.digest}</code></span><span><small>CREATED</small><b>{new Date(campaign.timeline.createdAt).toLocaleString()}</b></span></footer>
        </>:<div className="proof-empty"><Radio/><h2>No campaign records yet</h2><p>The explorer will populate from persisted Current CoFi campaigns.</p></div>}</div>
      </section>
      <section className="campaign-proof-privacy"><ShieldCheck/><div><Eyebrow>PUBLIC BY DESIGN</Eyebrow><h2>Evidence without exposure.</h2><p>{proof?.privacy??"Recipient identities and private project records remain outside the public proof boundary."}</p></div><a href="/api/v1/campaign-proofs" target="_blank" rel="noreferrer">Machine-readable API <ArrowUpRight/></a></section>
    </main>
  </div>;
}

function ReviewerDemoView({go}:{go:(v:View)=>void}) {
  const [demo,setDemo]=useState<ReviewerDemoState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [activeStage,setActiveStage]=useState(-1);
  const [running,setRunning]=useState(false);
  const timers=useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(()=>{let active=true;currentApi.get<ReviewerDemoState>("/reviewer-demo").then(value=>{if(active)setDemo(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"The verified replay is temporarily unavailable.")});return()=>{active=false;timers.current.forEach(clearTimeout)}},[]);
  const replay=()=>{
    if(!demo||running)return;
    timers.current.forEach(clearTimeout);timers.current=[];setActiveStage(-1);setRunning(true);
    demo.stages.forEach((_,index)=>timers.current.push(setTimeout(()=>{setActiveStage(index);if(index===demo.stages.length-1)setRunning(false)},450+index*820)));
  };
  const currentStage=demo?.stages[Math.max(0,activeStage)]??null;
  const amount=demo?(Number(demo.story.amountAtomic)/10**demo.story.decimals).toLocaleString(undefined,{maximumFractionDigits:6}):"—";
  return <div className="reviewer-demo-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-dossier")}>Grant dossier</button><button onClick={()=>go("proof-explorer")}>Campaign proofs</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="reviewer-demo-hero"><FluidCanvas mode="network"/><div><Eyebrow light><Play/> VERIFIED PRODUCT REPLAY</Eyebrow><h1>Watch one user<br/><em>enter the current.</em></h1><p>A guided, account-free replay of Current CoFi’s complete Arc testnet loop. Every completed stage points to persisted evidence; the replay itself never changes production data.</p><div><Button tone="cyan" onClick={replay}>{running?"Replay running":"Run the verified replay"} {running?<RefreshCw className="spin"/>:<Play/>}</Button><button onClick={()=>go("proof-explorer")}>Inspect source evidence <ArrowUpRight/></button></div></div><aside><small>REPLAY ID</small><strong>{demo?.replayId??"Assembling…"}</strong><span><i/>{demo?.readiness.complete?"Complete live evidence chain":"Evidence chain loading"}</span><small>MODE</small><code>NON-MUTATING</code><p>{demo?.boundary??"Loading the public evidence boundary…"}</p></aside></section>
      {error?<section className="reviewer-demo-error"><ShieldAlert/><div><h2>Replay unavailable</h2><p>{error}</p></div></section>:null}
      <section className="reviewer-demo-context"><article><small>VERIFIED STAGES</small><strong>{demo?`${demo.readiness.verifiedStages}/${demo.readiness.stages}`:"—"}</strong><span>Persisted or digest-verified</span></article><article><small>LIVE CAMPAIGNS</small><strong>{demo?.liveContext.campaigns??"—"}</strong><span>Arc testnet records</span></article><article><small>CONFIRMED CLAIMS</small><strong>{demo?.liveContext.confirmedClaims??"—"}</strong><span>Not replay interactions</span></article><article><small>ACTIVATED USERS</small><strong>{demo?.liveContext.activatedUsers??"—"}</strong><span>Distinct linked records</span></article></section>
      <section className="reviewer-demo-stage">
        <div className="replay-stage-copy"><Eyebrow>THE CORE PRODUCT LOOP</Eyebrow><h2>{demo?.story.headline??"Loading the verified story…"}</h2><p>Press replay to follow the same evidence chain a Circle reviewer can independently inspect.</p><div className="replay-progress" aria-label="Replay progress">{(demo?.stages??Array.from({length:5},(_,index)=>({id:String(index),index:index+1,label:"Loading",actor:"",status:"",explanation:"",evidence:{}}))).map((stage,index)=><button key={stage.id} className={index<activeStage?"complete":index===activeStage?"active":""} onClick={()=>demo&&setActiveStage(index)} disabled={!demo}><span>{index<activeStage?<Check/>:String(stage.index).padStart(2,"0")}</span><div><b>{stage.label}</b><small>{stage.actor}</small></div><i/></button>)}</div></div>
        <div className={`replay-visual ${running?"running":""} stage-${Math.max(0,activeStage)}`}>
          <FluidCanvas mode="branches"/>
          <div className="replay-project"><span>C</span><small>ARC PROJECT</small><b>{demo?.story.asset??"USDC"} campaign</b></div>
          <div className="replay-current-line"><i/><i/><i/></div>
          <div className="replay-phone"><span className="phone-sensor"/><small>{activeStage<1?"Audience member":"Current account"}</small><div className="replay-avatar">{activeStage<1?<Users/>:<Wallet/>}</div><p>{activeStage<1?"No wallet. No gas. No crypto setup.":activeStage<2?"Embedded wallet created privately.":`${amount} ${demo?.story.asset??"USDC"} received.`}</p><strong className={activeStage>=2?"visible":""}><CheckCircle2/>Funded on Arc</strong></div>
          <div className="replay-event"><span>{currentStage?String(currentStage.index).padStart(2,"0"):"00"}</span><small>{currentStage?.status.replaceAll("-"," ")??"READY"}</small><h3>{currentStage?.label??"Run the replay"}</h3><p>{currentStage?.explanation??"The product story will advance through five independently inspectable stages."}</p></div>
          {activeStage>=3?<div className="replay-activation"><Target/><span><b>User activated</b><small>Project-signed event attributed</small></span></div>:null}
          {activeStage>=4?<div className="replay-seal"><Fingerprint/><span><b>Evidence sealed</b><code>{demo?.digest.slice(0,16)}…</code></span></div>:null}
        </div>
      </section>
      <section className="reviewer-demo-evidence"><div><Eyebrow light>STAGE-BY-STAGE EVIDENCE</Eyebrow><h2>Nothing hidden<br/>behind the animation.</h2><p>Every visual step maps to a public anchor, privacy-safe aggregate, or canonical digest. Capability-only states remain labeled honestly.</p></div><div>{(demo?.stages??[]).map((stage,index)=><article key={stage.id}><span>{String(index+1).padStart(2,"0")}</span><div><small>{stage.status.replaceAll("-"," ")}</small><h3>{stage.label}</h3><p>{stage.explanation}</p><code>{JSON.stringify(stage.evidence)}</code></div>{stage.status==="capability-verified"?<Clock3/>:<BadgeCheck/>}</article>)}</div></section>
      <section className="reviewer-demo-links"><div><Eyebrow>OPEN THE SOURCE</Eyebrow><h2>Verify the replay yourself.</h2><p>{demo?.privacy??"Public evidence excludes every private recipient and project identifier."}</p><code>SHA-256 · {demo?.digest??"Verifying…"}</code></div><div>{(demo?.reviewerActions??[]).map(action=>action.url?<a href={action.url} target="_blank" rel="noreferrer" key={action.id}><span><small>{action.id.replaceAll("-"," ")}</small><b>{action.label}</b></span><ArrowUpRight/></a>:<span className="unavailable" key={action.id}><span><small>{action.id.replaceAll("-"," ")}</small><b>{action.label}</b></span><Clock3/></span>)}</div></section>
      <section className="reviewer-demo-recipe"><div><Eyebrow>BUILDER RECIPE</Eyebrow><h2>The same loop,<br/>one integration.</h2><p>Games, communities, token projects, and agents can use hosted claims, the SDK, React embeds, or signed REST calls.</p></div><pre><code>{(demo?.developerRecipe.sequence??[]).map((line,index)=><span key={line}><i>{String(index+1).padStart(2,"0")}</i>{line}</span>)}</code></pre></section>
    </main>
  </div>;
}

function ProjectTokenProofView({go}:{go:(v:View)=>void}) {
  const [proof,setProof]=useState<ProjectTokenProofState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<ProjectTokenProofState>("/project-token-proof").then(value=>{setProof(value);setError(null)}).catch(reason=>setError(reason instanceof Error?reason.message:"Project-token proof is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<ProjectTokenProofState>("/project-token-proof").then(value=>{if(active)setProof(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Project-token proof is temporarily unavailable.")});return()=>{active=false}},[]);
  const short=(value?:string|null)=>value?`${value.slice(0,8)}…${value.slice(-6)}`:"Unavailable";
  return <div className="project-token-proof-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-dossier")}>Grant dossier</button><button onClick={()=>go("reviewer-demo")}>Verified replay</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="project-token-proof-hero">
        <FluidCanvas mode="branches"/>
        <div className="project-token-proof-copy"><Eyebrow light><TestTube2/> PROJECT-TOKEN PROOF</Eyebrow><h1>USDC isn’t the<br/>only <em>current.</em></h1><p>{proof?.headline??"Verifying Current CoFi’s arbitrary-token campaign rail directly against Arc testnet."}</p><div><a href="/api/v1/project-token-proof" target="_blank" rel="noreferrer">Open public JSON <ArrowUpRight/></a><button onClick={load}><RefreshCw/>Refresh chain reads</button></div></div>
        <aside><span><i className={proof?.readiness.complete?"complete":""}/>{proof?.readiness.complete?"PROOF COMPLETE":"VERIFYING"}</span><strong>{proof?`${proof.readiness.verifiedStages}/${proof.readiness.stages}`:"—"}</strong><small>ONCHAIN STAGES</small><p>{proof?.valueStatus??"Arc testnet demonstration asset. No monetary value."}</p></aside>
      </section>
      {error?<section className="project-token-proof-error"><ShieldAlert/><div><h2>Chain proof unavailable</h2><p>{error}</p></div><Button tone="cyan" onClick={load}>Try again</Button></section>:null}
      <section className="project-token-proof-stats">
        <article><small>RESERVED</small><strong>{proof?.asset?`${Number(proof.asset.totalDeposited).toLocaleString()} ${proof.asset.symbol}`:"—"}</strong><span>Governed project-token reserve</span></article>
        <article><small>CAMPAIGN FUNDED</small><strong>{proof?.campaign?`${Number(proof.campaign.totalAmount).toLocaleString()} ${proof.asset?.symbol??"CPT"}`:"—"}</strong><span>Fully allocated before activation</span></article>
        <article><small>RECIPIENT CAPACITY</small><strong>{proof?.campaign?.recipientCount??"—"}</strong><span>Merkle-bound walletless claims</span></article>
        <article><small>SETTLED</small><strong>{proof?.settlement?`${Number(proof.settlement.totalAmount).toLocaleString()} ${proof.asset?.symbol??"CPT"}`:"—"}</strong><span>Confirmed recipient transfer</span></article>
      </section>
      <section className="project-token-proof-flow">
        <div><Eyebrow>THE ARBITRARY-ASSET RAIL</Eyebrow><h2>One visible current.<br/>Five verified stages.</h2><p>Each stage resolves to a public Arc contract or transaction. The interface never turns this internal protocol demonstration into a traction claim.</p></div>
        <div className="project-token-proof-flowline">{(proof?.flow??["erc20","reserve","governance","campaign","settlement"].map((id,index)=>({id,label:["Arbitrary ERC-20 registered","Project reserve funded","Delayed governance","Campaign fully funded","Recipient claim settled"][index],status:"loading",evidence:null}))).map((stage,index)=><article key={stage.id}><span>{String(index+1).padStart(2,"0")}</span><i/><div><small>{stage.status}</small><h3>{stage.label}</h3>{stage.evidence?<a href={stage.evidence} target="_blank" rel="noreferrer">Inspect evidence <ArrowUpRight/></a>:<b>Reading Arc…</b>}</div>{stage.status==="verified"?<BadgeCheck/>:<Clock3/>}</article>)}</div>
      </section>
      <section className="project-token-proof-campaign">
        <div><Eyebrow light>COMPLETED SETTLEMENT</Eyebrow><h2>The allocation moved<br/><em>all the way through.</em></h2><p>Current’s campaign vault funded an isolated 25 CPT allocation, verified its Merkle claim, transferred the token, and closed with zero remaining.</p><span><BadgeCheck/>{proof?.settlement?.claimEvidence?.replaceAll("-"," ")??"verifying settlement"}</span></div>
        <aside><small>SETTLEMENT REFERENCE</small><code>{proof?.settlement?.proofRef??"Assembling…"}</code><dl><div><dt>State</dt><dd>{proof?.settlement?.state??"—"}</dd></div><div><dt>Settled</dt><dd>{proof?.settlement?`${Number(proof.settlement.totalAmount).toLocaleString()} ${proof.asset?.symbol??"CPT"}`:"—"}</dd></div><div><dt>Remaining</dt><dd>{proof?.settlement?`${Number(proof.settlement.remainingAmount).toLocaleString()} ${proof.asset?.symbol??"CPT"}`:"—"}</dd></div><div><dt>Claimed</dt><dd>{proof?.settlement?.claimed?"Yes":"Verifying"}</dd></div></dl><small>MERKLE ROOT</small><code>{short(proof?.settlement?.merkleRoot)}</code>{proof?.settlement?.claimTransactionUrl?<a href={proof.settlement.claimTransactionUrl} target="_blank" rel="noreferrer">Inspect recipient settlement <ArrowUpRight/></a>:null}</aside>
      </section>
      <section className="project-token-proof-ledger">
        <div><Eyebrow>PUBLIC PROOF STACK</Eyebrow><h2>Review every contract.<br/>Follow every transaction.</h2><p>{proof?.boundary??"Protocol-owned testnet evidence only."}</p><code>SHA-256 · {proof?.digest??"Verifying…"}</code></div>
        <div><h3>Contracts</h3>{(proof?.contracts??[]).map(item=><a href={item.url??undefined} target="_blank" rel="noreferrer" key={item.id}><span><small>{item.label}</small><b>{short(item.address)}</b></span><ArrowUpRight/></a>)}<h3>Transactions</h3>{(proof?.transactions??[]).map(item=><a href={item.url??undefined} target="_blank" rel="noreferrer" key={item.id}><span><small>{item.label}</small><b>{short(item.hash)}</b></span><ArrowUpRight/></a>)}</div>
      </section>
      <section className="project-token-proof-boundary"><ShieldCheck/><div><small>HONEST EVIDENCE BOUNDARY</small><h2>Capability proven. External adoption still earned.</h2><p>{proof?.privacy} This demonstration is kept separate from the persisted user-traction totals in Network Proof.</p></div><Button tone="blue" onClick={()=>go("grant-dossier")}>Open grant dossier <ArrowRight/></Button></section>
    </main>
  </div>;
}

function GrantProofHealthView({go}:{go:(v:View)=>void}) {
  const [proof,setProof]=useState<GrantProofHealthState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<GrantProofHealthState>("/proof-health").then(value=>{setProof(value);setError(null)}).catch(reason=>setError(reason instanceof Error?reason.message:"Grant proof health is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<GrantProofHealthState>("/proof-health").then(value=>{if(active)setProof(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Grant proof health is temporarily unavailable.")});return()=>{active=false}},[]);
  const compact=(value?:string|null)=>value?`${value.slice(0,9)}…${value.slice(-7)}`:"No digest";
  return <div className="proof-health-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-dossier")}>Grant dossier</button><button onClick={()=>go("project-token-proof")}>Token settlement</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="proof-health-hero"><FluidCanvas mode="network"/><div><Eyebrow light><Activity/> CONTINUOUS GRANT PROOF</Eyebrow><h1>Every claim.<br/><em>Still true.</em></h1><p>A live integrity layer continuously evaluates Current CoFi’s public Arc evidence, release contracts, builder interface, and honest external boundaries.</p><span><i className={proof?.status==="healthy"?"healthy":""}/>{proof?.status==="healthy"?"ALL PUBLIC PROOFS HEALTHY":"VERIFYING PUBLIC PROOFS"}</span></div><aside><small>PROOF HEALTH</small><strong>{proof?`${proof.score}%`:"—"}</strong><p>{proof?`${proof.verifiedChecks}/${proof.totalChecks} independent checks verified`:"Reading Current’s public evidence…"}</p><code>SHA-256 · {compact(proof?.digest)}</code><button onClick={load}><RefreshCw/>Run fresh verification</button></aside></section>
      {error?<section className="proof-health-error"><ShieldAlert/><div><h2>Proof health unavailable</h2><p>{error}</p></div><Button tone="cyan" onClick={load}>Try again</Button></section>:null}
      <section className="proof-health-intro"><div><Eyebrow>ONE REVIEWER SURFACE</Eyebrow><h2>Six systems.<br/>One living record.</h2></div><p>{proof?.boundary??"Current verifies only evidence it can independently reproduce. External validation remains explicitly separate."}</p></section>
      <section className="proof-health-grid">{(proof?.checks??[]).map((check,index)=><article className={check.status} key={check.id}><header><span>{String(index+1).padStart(2,"0")}</span>{check.status==="verified"?<BadgeCheck/>:<Clock3/>}</header><small>{check.status}</small><h3>{check.label}</h3><p>{check.statement}</p>{check.externalGate?<div><ShieldAlert/><span>{check.externalGate}</span></div>:<div className="internal"><ShieldCheck/><span>Internally reproducible evidence</span></div>}<footer><code>{compact(check.digest)}</code>{check.evidence?<a href={check.evidence} target="_blank" rel="noreferrer" aria-label={`Inspect ${check.label}`}>Inspect <ArrowUpRight/></a>:null}</footer></article>)}</section>
      <section className="proof-health-current"><div><Eyebrow light>VERIFICATION CURRENT</Eyebrow><h2>Records become evidence.<br/>Evidence stays inspectable.</h2><p>The verifier reads persisted campaign records and public Arc state, checks their digests and runtime constraints, then publishes one new tamper-evident health record.</p></div><div className="proof-health-current-map"><span>Network records</span><i/><span>Campaign evidence</span><i/><span>Arc contracts</span><i/><strong>HEALTHY</strong></div></section>
      <section className="proof-health-ledger"><div><Eyebrow>REVIEWER ROUTES</Eyebrow><h2>Open the layer<br/>behind every check.</h2><p>{proof?.privacy??"No private recipient or project data enters this verifier."}</p></div><div>{Object.entries(proof?.reviewerLinks??{}).map(([label,url])=><a href={url} target="_blank" rel="noreferrer" key={label}><span><small>{label.replace(/([A-Z])/g," $1")}</small><b>{new URL(url).pathname||"/"}</b></span><ArrowUpRight/></a>)}</div></section>
      <section className="proof-health-boundary"><ShieldCheck/><div><small>THE LINE CURRENT WILL NOT CROSS</small><h2>Internal proof is not external validation.</h2><p>Proof health can verify deployed technology and persisted testnet records. It cannot manufacture partner traction, audit independence, legal approval, or mainnet availability.</p></div><Button tone="blue" onClick={()=>go("grant-dossier")}>Open full dossier <ArrowRight/></Button></section>
    </main>
  </div>;
}

function GrantApplicationView({go}:{go:(v:View)=>void}) {
  const [packet,setPacket]=useState<GrantApplicationState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [copied,setCopied]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<GrantApplicationState>("/grant-application").then(value=>{setPacket(value);setError(null)}).catch(reason=>setError(reason instanceof Error?reason.message:"The application packet is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<GrantApplicationState>("/grant-application").then(value=>{if(active)setPacket(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"The application packet is temporarily unavailable.")});return()=>{active=false}},[]);
  const copyAnswer=async(id:string,value:string)=>{await navigator.clipboard.writeText(value);setCopied(id);window.setTimeout(()=>setCopied(current=>current===id?null:current),1600)};
  const saveJson=()=>{if(!packet)return;const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="current-cofi-circle-grant-application.json";anchor.click();URL.revokeObjectURL(url)};
  const compactDigest=(value:string|undefined)=>value?`${value.slice(0,12)}…${value.slice(-10)}`:"Verifying…";
  return <div className="grant-application-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-dossier")}>Grant dossier</button><button onClick={()=>go("proof-health")}>Proof health</button><button onClick={()=>go("reviewer-demo")}>Product replay</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="grant-application-hero"><FluidCanvas mode="network"/><div><Eyebrow light><FileCheck2/> SUBMISSION READINESS</Eyebrow><h1>Built to answer.<br/><em>Ready to prove.</em></h1><p>{packet?.executiveSummary??"Assembling Current CoFi's verified application answers, milestones, and reviewer evidence."}</p><div><a className="cofi-button tone-cyan" href="/api/v1/grant-application/markdown" download>Download application <Download/></a><Button tone="ghost" onClick={()=>go("grant-dossier")}>Inspect dossier <ArrowUpRight/></Button></div></div><aside><small>APPLICATION PACKET</small><strong>{packet?.applicationAnswers.length??"—"}</strong><p>evidence-backed application answers</p><dl><div><dt>Milestones</dt><dd>{packet?.proposedMilestones.length??"—"}</dd></div><div><dt>Internal sections</dt><dd>{packet?.submissionChecklist.internallyComplete.length??"—"}</dd></div><div><dt>Invented claims</dt><dd>0</dd></div></dl><code>SHA-256 · {compactDigest(packet?.digest)}</code></aside></section>

      {error?<section className="grant-application-error"><ShieldAlert/><div><h2>Application packet unavailable</h2><p>{error}</p></div><Button tone="blue" onClick={load}>Try again <RefreshCw/></Button></section>:null}

      <section className="grant-application-source"><div><Eyebrow>OFFICIAL REVIEW MAP</Eyebrow><h2>{"Circle's criteria."}<br/>{"Current's evidence."}</h2><p>{"The packet follows Circle's currently published review criteria and keeps the application-window status separate from product readiness."}</p><a href={packet?.officialGrantSource.url??"https://www.circle.com/grant"} target="_blank" rel="noreferrer">Open official grant criteria <ArrowUpRight/></a></div><div>{(packet?.officialGrantSource.criteria??[]).map((item,index)=><article key={item}><span>{String(index+1).padStart(2,"0")}</span><b>{item}</b><CheckCircle2/></article>)}<footer><Clock3/><span><b>Window observed closed</b><small>Checked {packet?.officialGrantSource.researchedAt??"2026-08-01"} · packet remains submission-ready</small></span></footer></div></section>

      <section className="grant-application-evidence"><div><small>VERIFIED TESTNET RECORD</small><strong>{packet?.evidenceSnapshot.campaigns??"—"}</strong><span>campaigns</span></div><div><small>TARGETED RECIPIENTS</small><strong>{packet?.evidenceSnapshot.targetedRecipients??"—"}</strong><span>persisted allocations</span></div><div><small>CONFIRMED CLAIMS</small><strong>{packet?.evidenceSnapshot.confirmedClaims??"—"}</strong><span>settled records</span></div><div><small>RELEASE READINESS</small><strong>{packet?`${packet.evidenceSnapshot.releaseReadinessScore}%`:"—"}</strong><span>runtime verified</span></div><div><small>SECURITY READINESS</small><strong>{packet?`${packet.evidenceSnapshot.securityReadinessScore}%`:"—"}</strong><span>internal controls</span></div></section>

      <section className="grant-application-answers"><header><Eyebrow light>APPLICATION ANSWERS</Eyebrow><h2>Concise enough to submit.<br/>Deep enough to inspect.</h2><p>Every answer includes its word count and direct reviewer evidence. Copy one response or download the full Markdown packet.</p></header><div>{(packet?.applicationAnswers??[]).map((item,index)=><article key={item.id}><div><span>{String(index+1).padStart(2,"0")}</span><small>{item.wordCount} words</small></div><h3>{item.prompt}</h3><p>{item.response}</p><footer><button onClick={()=>void copyAnswer(item.id,item.response)}>{copied===item.id?<Check/>:<Copy/>}{copied===item.id?"Copied":"Copy answer"}</button><div>{item.evidence.slice(0,3).map((url,evidenceIndex)=><a href={url} target="_blank" rel="noreferrer" key={url} aria-label={`Open evidence ${evidenceIndex+1} for ${item.prompt}`}><Fingerprint/>{evidenceIndex+1}</a>)}</div></footer></article>)}</div></section>

      <section className="grant-application-milestones"><div><Eyebrow>GRANT MILESTONE DESIGN</Eyebrow><h2>Disbursement tied<br/>to public outcomes.</h2><p>No vague “grow the community” promises. Each milestone defines acceptance evidence Circle can inspect.</p></div><div>{(packet?.proposedMilestones??[]).map(item=><article key={item.id}><span>{String(item.sequence).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.measurement}</p><ul>{item.acceptanceEvidence.map(evidence=><li key={evidence}><Check/>{evidence}</li>)}</ul></article>)}</div></section>

      <section className="grant-application-readiness"><div><Eyebrow light>HONEST COMPLETION LINE</Eyebrow><h2>Everything we can finish,<br/>already packaged.</h2><p>{packet?.boundary??"Public proof and external validation remain deliberately separate."}</p></div><div><article className="complete"><header><CheckCircle2/><span><b>Complete internally</b><small>Ready without outside help</small></span></header>{(packet?.submissionChecklist.internallyComplete??[]).map(item=><p key={item}><Check/>{item}</p>)}</article><article><header><Users/><span><b>Applicant input</b><small>Private founder details</small></span></header>{(packet?.applicantInputs??[]).map(item=><p key={item.id}><Clock3/>{item.label}</p>)}</article><article><header><Handshake/><span><b>External gates</b><small>Cannot be self-attested</small></span></header>{(packet?.submissionChecklist.awaitingExternal??[]).map(item=><p key={item}><ShieldAlert/>{item}</p>)}</article></div></section>

      <section className="grant-application-export"><div><FileCheck2/><span><small>CANONICAL SUBMISSION DRAFT</small><h2>One packet. Every proof route.</h2><p>{packet?.privacy??"Reviewer-safe public evidence only."}</p></span></div><div><a className="cofi-button tone-cyan" href="/api/v1/grant-application/markdown" download>Download Markdown <Download/></a><Button tone="ghost" onClick={saveJson}>Download JSON <Braces/></Button><Button tone="ghost" onClick={()=>go("proof-health")}>Verify live health <Activity/></Button></div><footer><span><small>PACKET DIGEST</small><code>{packet?.digest??"Verifying…"}</code></span><span><small>GENERATED</small><b>{packet?new Date(packet.generatedAt).toLocaleString():"Loading…"}</b></span></footer></section>
    </main>
  </div>;
}

function GrantDossierView({go}:{go:(v:View)=>void}) {
  const [dossier,setDossier]=useState<GrantDossierState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<GrantDossierState>("/grant-dossier").then(setDossier).catch(reason=>setError(reason instanceof Error?reason.message:"The public dossier is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<GrantDossierState>("/grant-dossier").then(value=>{if(active)setDossier(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"The public dossier is temporarily unavailable.")});return()=>{active=false}},[]);
  const totals=dossier?.liveProof.network.totals;
  const save=()=>{if(!dossier)return;const url=URL.createObjectURL(new Blob([JSON.stringify(dossier,null,2)],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="current-cofi-public-grant-dossier.json";anchor.click();URL.revokeObjectURL(url)};
  const copy=()=>navigator.clipboard.writeText(location.href);
  const compact=(value:number|undefined)=>value===undefined?"—":value.toLocaleString();
  return <div className="dossier-page">
    <header><Brand light onClick={()=>go("home")}/><nav><button onClick={()=>go("grant-application")}>Application packet</button><button onClick={()=>go("network-proof")}>Network proof</button><button onClick={()=>go("developers")}>Developers</button><button onClick={()=>go("security")}>Security</button></nav><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header>
    <main>
      <section className="dossier-hero">
        <FluidCanvas mode="network"/>
        <div className="dossier-hero-copy"><Eyebrow light><BadgeCheck/> CIRCLE GRANT REVIEW DOSSIER</Eyebrow><h1>Inspect the<br/><em>product,</em><br/>not the pitch.</h1><p>{dossier?.application.oneLiner??"Assembling Current CoFi’s public Arc testnet record, security boundary, and builder infrastructure."}</p><div><Button tone="cyan" onClick={()=>go("reviewer-demo")}>Run the verified product replay <Play/></Button><button onClick={copy}><Share2/>Copy reviewer URL</button></div></div>
        <aside><small>PUBLIC REVIEW BOUNDARY</small><p>{dossier?.boundary??"Loading reviewer-safe evidence…"}</p><div><span><ShieldCheck/>Aggregate proof</span><span><TestTube2/>Arc testnet</span><span><Fingerprint/>SHA-256 integrity</span></div><code>{dossier?.digest??"Verifying dossier digest…"}</code></aside>
      </section>

      {error?<section className="dossier-error"><ShieldAlert/><div><h2>Dossier service unavailable</h2><p>{error}</p></div><Button tone="blue" onClick={load}>Try again <RefreshCw/></Button></section>:null}

      <section className="dossier-proof-strip">
        <article><small>RECORDED PROJECTS</small><strong>{compact(totals?.projects)}</strong><span>Persisted testnet workspaces</span></article>
        <article><small>TESTNET CAMPAIGNS</small><strong>{compact(totals?.campaigns)}</strong><span>{compact(totals?.recipientsTargeted)} recipients targeted</span></article>
        <article><small>CONFIRMED CLAIMS</small><strong>{compact(totals?.confirmedClaims)}</strong><span>{dossier?`${dossier.liveProof.network.rates.claimRate}% claim rate`:"Verified records only"}</span></article>
        <article><small>ACTIVATED USERS</small><strong>{compact(totals?.activatedUsers)}</strong><span>Distinct linked users</span></article>
        <article><small>RELEASE READINESS</small><strong>{dossier?`${dossier.liveProof.release.readinessScore}%`:"—"}</strong><span>{dossier?.liveProof.release.available?`${dossier.liveProof.release.verifiedComponents}/${dossier.liveProof.release.componentCount} components verified`:"Proof temporarily unavailable"}</span></article>
      </section>

      <section className="dossier-thesis">
        <div className="dossier-section-title"><Eyebrow>WHY CURRENT</Eyebrow><h2>Projects have audiences.<br/>They need active users.</h2></div>
        <div className="dossier-thesis-grid"><article><span>01</span><h3>The onboarding gap</h3><p>{dossier?.application.problem??"Loading…"}</p></article><article><span>02</span><h3>The activation current</h3><p>{dossier?.application.solution??"Loading…"}</p></article><article><span>03</span><h3>The ecosystem layer</h3><p>{dossier?.application.ecosystemValue??"Loading…"}</p></article></div>
      </section>

      <section className="dossier-criteria">
        <div className="dossier-section-title light"><Eyebrow light>CIRCLE REVIEW MAP</Eyebrow><h2>Four criteria.<br/>Direct evidence.</h2><p>Each claim points to a public product surface or machine-readable proof instead of relying on presentation language.</p></div>
        <div>{(dossier?.criteria??[]).map((item,index)=><article key={item.id}><span>0{index+1}</span><div><h3>{item.label}</h3><p>{item.statement}</p><footer>{item.proof.map(proof=><code key={proof}>{proof}</code>)}</footer></div><CheckCircle2/></article>)}</div>
      </section>

      <section className="dossier-architecture">
        <div className="dossier-section-title"><Eyebrow>ARC + CIRCLE ARCHITECTURE</Eyebrow><h2>Every dependency<br/>has one necessary role.</h2></div>
        <div className="dossier-architecture-flow">{(dossier?.architecture??[]).map((item,index)=><article key={item.product}><span>{String(index+1).padStart(2,"0")}</span><div><b>{item.product}</b><p>{item.role}</p></div>{index<(dossier?.architecture.length??0)-1?<ArrowRight/>:null}</article>)}</div>
      </section>

      <section className="dossier-shipped">
        <div className="dossier-section-title"><Eyebrow>ALREADY SHIPPED</Eyebrow><h2>A working platform<br/>before grant funding.</h2><p>Grant capital is framed around external validation and ecosystem scale—not finishing an unbuilt prototype.</p></div>
        <div>{(dossier?.shipped??[]).map((item,index)=><article key={item.id}><small>0{index+1}</small><span><Check/></span><h3>{item.label}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <section className="dossier-gates">
        <div><ShieldAlert/><Eyebrow light>HONEST GAP REGISTER</Eyebrow><h2>What we cannot<br/>self-attest.</h2><p>These gates require a real partner, independent specialist, or an official external network state. They remain visibly incomplete.</p></div>
        <div>{(dossier?.externalGates??[]).map((gate,index)=><article key={gate.id}><span>0{index+1}</span><div><small>{gate.status.replaceAll("-"," ")}</small><h3>{gate.label}</h3><p>{gate.target}</p></div><Clock3/></article>)}</div>
      </section>

      <section className="dossier-milestones">
        <div className="dossier-section-title"><Eyebrow>MEASURABLE GRANT MILESTONES</Eyebrow><h2>Funding tied to<br/>verifiable outcomes.</h2></div>
        <div>{(dossier?.proposedGrantMilestones??[]).map((item,index)=><article key={item.id}><span>0{index+1}</span><h3>{item.title}</h3><p>{item.measurement}</p></article>)}</div>
      </section>

      <section className="dossier-links">
        <div><Eyebrow light>TECHNICAL REVIEW</Eyebrow><h2>Open every layer.</h2><p>{dossier?.privacy??"Reviewer-safe public records only."}</p><div><Button tone="cyan" onClick={save}>Download JSON dossier <Download/></Button><Button tone="ghost" onClick={()=>go("network-proof")}>Verify network activity <ArrowUpRight/></Button></div></div>
        <div>{Object.entries(dossier?.reviewerLinks??{}).map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer"><span><small>{label.replace(/([A-Z])/g," $1")}</small><b>{new URL(url).hostname}</b></span><ArrowUpRight/></a>)}</div>
        <footer><span><small>DOSSIER DIGEST</small><code>{dossier?.digest??"Verifying…"}</code></span><span><small>GENERATED</small><b>{dossier?new Date(dossier.generatedAt).toLocaleString():"Loading…"}</b></span></footer>
      </section>
      <section className="dossier-application-cta"><FileCheck2/><div><small>SUBMISSION-READY EXPORT</small><h2>Move from technical dossier to application answers.</h2><p>Open the evidence-backed packet, copy concise responses, and download the complete Markdown or JSON draft.</p></div><Button tone="blue" onClick={()=>go("grant-application")}>Open application packet <ArrowRight/></Button></section>
    </main>
  </div>;
}

function Marketing({ go }: { go: (v: View) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const {proof}=useNetworkProof();
  const proofNumber=(value:number|undefined)=>value===undefined?"—":value.toLocaleString();

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
            <div><strong>{proofNumber(proof?.totals.fundedWallets)}</strong><span>verified wallets funded</span></div>
            <div><strong>{proofNumber(proof?.totals.campaigns)}</strong><span>testnet currents</span></div>
            <div><strong>{proof?`${proof.rates.activationRate}%`:"—"}</strong><span>verified activation rate</span></div>
            <button aria-label={motionPaused ? "Play hero animation" : "Pause hero animation"} onClick={() => setMotionPaused(!motionPaused)}>{motionPaused ? <Play/> : <Pause/>}</button>
          </div>
        </section>

        <section className="proof-section" id="network">
          <Eyebrow>VERIFIED ARC TESTNET</Eyebrow>
          <div className="proof-number" data-reveal><small>Confirmed test USDC claimed · no monetary value</small><strong>{proof?`${formatAtomic(proof.totals.usdcClaimedAtomic)} USDC`:"Verifying…"}</strong></div>
          <div className="proof-grid" data-reveal>
            <div><b>{proofNumber(proof?.totals.fundedWallets)}</b><span>confirmed funded wallets</span></div>
            <div><b>{proofNumber(proof?.totals.activatedUsers)}</b><span>distinct activated users</span></div>
            <div><b>{proofNumber(proof?.totals.campaigns)}</b><span>recorded testnet campaigns</span></div>
            <div><b>0</b><span>gas required to claim</span></div>
          </div>
          <div className="network-proof-cta" data-reveal><div><BadgeCheck/><span><b>Verified-records-only</b><small>Replay the product loop, inspect the source rules, or open the complete Circle reviewer dossier.</small></span></div><div className="network-proof-cta-actions"><Button tone="ghost" onClick={()=>go("reviewer-demo")}>Verified replay <Play/></Button><Button tone="ghost" onClick={()=>go("grant-dossier")}>Grant dossier <BadgeCheck/></Button><Button tone="blue" onClick={()=>go("network-proof")}>Network proof <ArrowUpRight/></Button></div></div>
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
            {[["Live","Token + USDC distribution"],["Live","Merchant checkout"],["Live","Milestone escrow"],["Live","Subscriptions"],["Live","Cross-chain USDC"]].map(([time,title],i)=><article key={title}><span>{i+1}</span><small>{time}</small><h3>{title}</h3></article>)}
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
  const [continuing,setContinuing] = useState(false);
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
  const continueToProject=async()=>{
    if(!preview?.activationDestination)return;
    setContinuing(true);setClaimError(null);
    try{
      const result=await currentApi.post<{url:string}>("/campaigns/destination",{allocationId:preview.allocationId});
      window.location.assign(result.url);
    }catch(reason){
      setClaimError(reason instanceof Error?reason.message:"The project destination could not be opened.");
      setContinuing(false);
    }
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
      : preview?.status==="locked"&&preview.availableAt
        ? `Unlocks ${new Date(preview.availableAt).toLocaleDateString()}`
      : preview?.fundingStatus==="awaiting_funding"
        ? "Awaiting sender funding"
        : "Claim unavailable";
  const unavailableNote = preview?.status==="confirmed"
    ? "This value has already settled into its recipient wallet."
    : preview?.status==="expired"
      ? "The claim window ended and the sender can recover the funds."
      : preview?.status==="locked"&&preview.availableAt
        ? `This allocation is fully committed, but Current will not authorize settlement before ${new Date(preview.availableAt).toLocaleString()}.`
      : preview?.fundingStatus==="awaiting_funding"
        ? "This link is secured, but its Arc vault has not been funded yet."
        : "This claim can no longer be completed.";
  return (
    <main className={`claim-route branded-public surface-${preview?.project.brand.surface??"midnight"}`} style={brandStyle(preview?.project.brand)}>
      <FluidCanvas mode="network"/>
      <header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Secured on Arc testnet</span></header>
      <section className="claim-shell" aria-live="polite">
        {visibleStep === "ready" && <>
          {previewState==="loading"?<div className="creating-state"><span className="creating-orbit"><i/><i/><Link2/></span><small>VERIFYING SECURE LINK</small><h2>Following the current…</h2></div>:previewState==="error"?<><span className="claim-brand-avatar"><X/></span><small>LINK UNAVAILABLE</small><h2>This current cannot be opened.</h2><p className="auth-copy">The link may be invalid, expired, or already removed.</p><Button tone="ghost" onClick={()=>go("home")}>Return home</Button></>:<>
          <span className="claim-brand-avatar">{preview?.project.logoUrl?<img src={preview.project.logoUrl} alt=""/>:(preview?.project.name??"Tidebreak")[0]}</span><small>{preview?.sender??"Tidebreak"} sent you</small><h1>{preview?.amount??"2,500"} <em>{preview?.asset??"TIDE"}</em></h1>{!preview&&<p className="claim-usd">≈ $42.80</p>}
          <blockquote>{preview?.message||(preview?.project.brand.headline??(preview?"A funded claim is waiting for you on Arc.":"Welcome to the Tidebreak Genesis current."))}</blockquote>
          <div className="claim-meta"><span><Clock3/>{preview?.expiresAt?`Expires ${new Date(preview.expiresAt).toLocaleDateString()}`:"Expires in 6 days"}</span><span><Zap/>Gas sponsored</span></div>
          {preview?.assetTrust&&<div className="claim-asset-trust"><ShieldCheck/><div><b>Arc contract observations recorded</b><small>{preview.assetTrust.posture.replaceAll("-"," ")}{preview.assetTrust.reviewDigest?` · Review ${preview.assetTrust.reviewDigest.slice(0,10)}`:""}</small><small>{preview.assetTrust.boundary}</small>{preview.assetTrust.explorerUrl&&<a href={preview.assetTrust.explorerUrl} target="_blank" rel="noreferrer">Inspect on ArcScan <ExternalLink/></a>}</div></div>}
          {preview?.identityBinding.required&&<div className="claim-identity-binding"><ShieldCheck/><div><b>Identity-bound reward</b><small>{preview.identityBinding.verifier==="project-attestation"?`Your ${preview.identityBinding.type?.toUpperCase()} identity must be verified by the project and bound to this wallet.`:`Only ${preview.identityBinding.recipient??`the assigned ${preview.identityBinding.type}`} can claim after verification.`}</small></div></div>}
          {preview?.claimCondition?.required&&<div className="claim-condition-gate"><Target/><div><b>{preview.claimCondition.label}</b><small>{preview.claimCondition.description||"The project verifies this action before Current authorizes settlement."}</small><code>{preview.claimCondition.eventType}</code></div><Status tone="cyan">Proof required</Status></div>}
          <Button tone="blue" onClick={claim} disabled={Boolean(preview&&!preview.claimable)}>{preview&&!preview.claimable?unavailableLabel:(preview?.project.brand.claimCta??"Claim your tokens")} <ArrowRight/></Button><p className="claim-note">{preview&&!preview.claimable?unavailableNote:"No wallet or payment required."}</p>
          {claimError&&<p className="auth-system-note is-error"><X/>{claimError}</p>}
          </>}
        </>}
        {visibleStep === "auth" && <>
          <button className="claim-back" onClick={()=>setStep("ready")}><ArrowLeft/>Back</button><span className="claim-brand-avatar"><Fingerprint/></span><small>CREATE YOUR CURRENT ACCOUNT</small><h2>Claim with an identity you already use.</h2>
          <p className="auth-copy">Your embedded wallet is created automatically in the background.</p>
          {!emailMode&&<><button className="auth-provider" onClick={auth.startGoogle} disabled={!auth.config?.methods.google}><b>G</b>Continue with Google</button>
          <button className="auth-provider" onClick={()=>setEmailMode(true)} disabled={!auth.config?.methods.email}><b>@</b>Continue with email</button>
          <button className="auth-provider" onClick={()=>void auth.startApple()} disabled={!auth.config?.methods.apple}><b>●</b>Continue with Apple {!auth.config?.methods.apple&&<em>Setup pending</em>}</button>
          <button className="auth-provider" onClick={()=>void auth.startFacebook()} disabled={!auth.config?.methods.facebook}><b>f</b>Continue with Facebook {!auth.config?.methods.facebook&&<em>Setup pending</em>}</button>
          <p className="identity-link-note"><Network/>X, Discord, and Telegram connect after your secure wallet opens, so community identities never replace wallet authorization.</p></>}
          {emailMode&&<form className="auth-email-form" onSubmit={(event)=>{event.preventDefault();void auth.startEmail(email)}}><label>Email address<input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@community.xyz" autoFocus/></label><Button tone="blue">Send secure code <ArrowRight/></Button><button type="button" onClick={()=>setEmailMode(false)}>Use another method</button></form>}
          {auth.state==="unavailable"&&<p className="auth-system-note"><ShieldCheck/>The production onboarding flow is installed. Circle credentials are the final activation switch.</p>}
          {auth.error&&<p className="auth-system-note is-error"><X/>{auth.error}</p>}
          {claimError&&<p className="auth-system-note is-error"><X/>{claimError}</p>}
        </>}
        {visibleStep === "creating" && <div className="creating-state"><span className="creating-orbit"><i/><i/><Wallet/></span><small>CREATING YOUR EMBEDDED WALLET</small><h2>Opening your current…</h2><div className="creating-steps"><span className="done"><Check/>Identity verified</span><span className={auth.state==="creating-wallet"?"done":""}><RefreshCw/>Creating Arc wallet</span><span>Securing account recovery</span></div></div>}
        {visibleStep === "claiming" && <div className="creating-state"><span className="creating-orbit"><i/><i/><Zap/></span><small>SETTLING ON ARC</small><h2>Bringing the value into your wallet…</h2><div className="creating-steps"><span className="done"><Check/>Identity authorized</span><span className="done"><RefreshCw/>Gasless claim submitted</span><span>Confirming settlement</span></div></div>}
        {visibleStep === "success" && <div className="success-state"><span className="success-ripple"><Check/></span><small>{claimToken?"CLAIM SETTLED":"ACCOUNT READY"}</small><h2>{claimToken?"The value is yours.":"Your wallet is open."}</h2><p>{claimToken?`${preview?.amount??""} ${preview?.asset??"tokens"} settled into your user-controlled Arc wallet.`:"Your user-controlled Arc wallet is ready for walletless distributions."}</p><div className="success-balance"><span>Arc wallet</span><b>{auth.account?.wallets[0]?.address?`${auth.account.wallets[0].address.slice(0,8)}…${auth.account.wallets[0].address.slice(-5)}`:"Creating address"}</b><small>Gas sponsored · Arc testnet SCA</small></div><Button tone="blue" onClick={()=>go("overview")}>Open your account <ArrowRight/></Button></div>}
        {visibleStep === "success"&&preview?.activationDestination&&<div className="success-followup"><Button tone="cyan" disabled={continuing} onClick={()=>void continueToProject()}>{continuing?"Recording return…":preview.activationDestination.label} <ArrowUpRight/></Button><small>Authenticated return clicks are measured separately from project-verified activations.</small>{claimError&&<p className="auth-system-note is-error"><X/>{claimError}</p>}</div>}
      </section>
      <div className="claim-trust"><span><Lock/>Identity bound</span><span><Wallet/>Embedded wallet</span><span><Zap/>No gas needed</span></div>
    </main>
  );
}

function MetricCard({label,value,change,icon:Icon}:{label:string;value:string;change?:string;icon:typeof Activity}) {
  return <article className="metric-card-new"><span><Icon/></span><small>{label}</small><strong>{value}</strong>{change&&<em><TrendingUp/>{change}</em>}</article>;
}

function HostedSocialPayment({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const token=new URLSearchParams(location.search).get("payment")??"";
  const [payment,setPayment]=useState<PublicSocialPayment|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
  const load=useCallback(()=>{if(!token){setError("This payment link is missing its secure token.");setLoading(false);return}setLoading(true);currentApi.get<PublicSocialPayment>(`/social-payments/public?token=${encodeURIComponent(token)}`).then(setPayment).catch(reason=>setError(reason instanceof Error?reason.message:"This payment is unavailable.")).finally(()=>setLoading(false))},[token]);
  useEffect(()=>{const task=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(task)},[load]);
  const pay=async()=>{if(!auth.account){sessionStorage.setItem("current.auth.return",location.hash);go("claim");return}setBusy(true);setError(null);try{const prepared=await currentApi.post<WalletActionResult&{shareId?:string}>("/social-payments/pay",{token});if(!prepared.complete){if(!prepared.challengeId||!prepared.shareId)throw new Error("Circle did not return the payment approval.");await auth.executeChallenge(prepared.challengeId);await confirmWalletAction("/social-payments/pay",{token,shareId:prepared.shareId},prepared.challengeId)}await load()}catch(reason){setError(reason instanceof Error?reason.message:"The payment could not be completed.")}finally{setBusy(false)}};
  return <div className="social-pay-public"><header><Brand light onClick={()=>go("home")}/><button onClick={()=>go("home")}><ArrowLeft/>Back to Current</button></header><main><FluidCanvas mode="branches"/><section className="social-pay-card">{loading?<div className="creating-state"><RefreshCw className="spin"/><small>FOLLOWING THE PAYMENT CURRENT</small><h2>Opening secure payment…</h2></div>:error&&!payment?<div className="creating-state"><ShieldAlert/><small>PAYMENT UNAVAILABLE</small><h2>This current cannot be opened.</h2><p>{error}</p></div>:payment?<><div className="social-pay-avatar">{payment.creator?.displayName?.[0]??"C"}</div><Eyebrow>{payment.kind.toUpperCase()} · ARC TESTNET</Eyebrow><h1>{payment.title}</h1><p>{payment.note||`${payment.creator?.displayName??"A Current user"} created this secure ${payment.currency} payment.`}</p><div className="social-pay-amount"><small>{payment.share.label||"YOUR SHARE"}</small><strong>{payment.share.amount}<em>{payment.currency}</em></strong></div><div className="social-pay-proof"><span><ShieldCheck/>{payment.asset.verified?"Circle verified":"Onchain token"}</span><span><Wallet/>Your embedded wallet</span><span><Zap/>Direct Arc settlement</span></div>{!payment.asset.verified?<p className="token-safety-note social-token-warning"><ShieldCheck/>Token metadata comes directly from {payment.asset.address.slice(0,8)}…{payment.asset.address.slice(-6)}. Current CoFi does not endorse the asset.</p>:null}{error?<p className="auth-system-note is-error"><X/>{error}</p>:null}{payment.payable?<Button tone="blue" onClick={()=>void pay()} disabled={busy}>{busy?"Confirming on Arc…":auth.account?`Pay ${payment.share.amount} ${payment.currency}`:"Sign in and pay"}<ArrowRight/></Button>:<div className="social-pay-complete"><CheckCircle2/><div><b>{payment.share.status==="confirmed"?"Payment complete":"Payment unavailable"}</b><small>{payment.share.receiptNumber?`Receipt ${payment.share.receiptNumber}`:payment.status.replaceAll("_"," ")}</small></div></div>}<footer><span>No seed phrase required.</span><span>Funds transfer directly to the recipient.</span></footer></>:null}</section></main></div>;
}

function SocialPayments({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [kind,setKind]=useState<"send"|"request"|"tip"|"split">("send");const [title,setTitle]=useState("Coffee is on me");const [note,setNote]=useState("Sent through Current CoFi.");const [amount,setAmount]=useState("10");const [username,setUsername]=useState("");const [shares,setShares]=useState([{label:"Alex",amount:"24"},{label:"Jordan",amount:"24"},{label:"Sam",amount:"24"}]);
  const [assetMode,setAssetMode]=useState<"usdc"|"token">("usdc");const [tokenAddress,setTokenAddress]=useState("");const [inspectedToken,setInspectedToken]=useState<InspectedToken|null>(null);const [inspecting,setInspecting]=useState(false);
  const [state,setState]=useState<{requests:SocialPayment[];payments:Array<{id:string;title:string;kind:string;amount:string;currency:string;status:string;receiptNumber:string;transactionHash:string|null;createdAt:string}>}|null>(null);const [created,setCreated]=useState<SocialPayment|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(()=>{if(!auth.account){setState(null);return}currentApi.get<{requests:SocialPayment[];payments:Array<{id:string;title:string;kind:string;amount:string;currency:string;status:string;receiptNumber:string;transactionHash:string|null;createdAt:string}>}>("/social-payments").then(setState).catch(reason=>setError(reason instanceof Error?reason.message:"Social payments are unavailable."))},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const total=kind==="split"?shares.reduce((sum,item)=>sum+(Number(item.amount)||0),0):Number(amount)||0;
  const asset=assetMode==="usdc"?"USDC":inspectedToken?.symbol??"TOKEN";
  const inspectToken=async()=>{setError(null);setInspectedToken(null);setInspecting(true);try{setInspectedToken(await currentApi.post<InspectedToken>("/tokens/inspect",{address:tokenAddress}))}catch(reason){setError(reason instanceof Error?reason.message:"This token could not be read on Arc.")}finally{setInspecting(false)}};
  const create=async(event:React.FormEvent)=>{event.preventDefault();if(!auth.account){go("claim");return}if(assetMode==="token"&&!inspectedToken){setError("Inspect the Arc token contract before creating this payment.");return}setLoading(true);setError(null);try{const result=await currentApi.post<SocialPayment>("/social-payments",{kind,title,note,amount,username,tokenAddress:assetMode==="token"?inspectedToken?.address:undefined,shares:kind==="split"?shares:undefined});setCreated(result);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The payment could not be created.")}finally{setLoading(false)}};
  const updateShare=(index:number,key:"label"|"amount",value:string)=>setShares(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  const copy=async(url?:string)=>{if(url)await navigator.clipboard.writeText(url)};
  return <><PageHero eyebrow="SOCIAL MONEY" title="Move any Arc asset like a message." copy="Send USDC or project tokens to a Current username, request a payment, accept tips, or split a bill. Every payment settles directly between embedded Arc wallets." mode="branches"><Button tone="cyan" onClick={()=>document.querySelector(".social-pay-builder")?.scrollIntoView({behavior:"smooth"})}>Create a payment <ArrowRight/></Button></PageHero>
    <div className="social-pay-metrics"><MetricCard label="Requests created" value={(state?.requests.length??0).toLocaleString()} icon={ReceiptText}/><MetricCard label="Shares settled" value={(state?.requests.reduce((sum,item)=>sum+item.progress.paid,0)??0).toLocaleString()} icon={CheckCircle2}/><MetricCard label="Sent from your wallet" value={(state?.payments.filter(item=>item.status==="confirmed").length??0).toLocaleString()} icon={ArrowUpRight}/><MetricCard label="Custody held by Current" value="$0" icon={ShieldCheck}/></div>
    {!auth.account?<div className="campaign-empty social-pay-locked"><Wallet/><h3>Open your Current account to move value socially</h3><p>Email or Google creates your embedded Arc wallet. No extension, seed phrase, or separate gas token.</p><Button tone="blue" onClick={()=>go("claim")}>Create your account <ArrowRight/></Button></div>:<div className="social-pay-layout"><form className="social-pay-builder data-panel" onSubmit={event=>void create(event)}><div className="panel-head"><div><h3>Create a social current</h3><p>One exact action, one verifiable settlement.</p></div><Status tone="cyan">Non-custodial</Status></div><div className="social-pay-tabs">{(["send","request","tip","split"] as const).map(item=><button type="button" className={kind===item?"active":""} onClick={()=>setKind(item)} key={item}>{item==="split"?"Split bill":item[0].toUpperCase()+item.slice(1)}</button>)}</div><label className="social-asset-label">Payment asset<div className="asset-options"><button type="button" className={assetMode==="usdc"?"selected":""} onClick={()=>{setAssetMode("usdc");setInspectedToken(null);setError(null)}}>USDC</button><button type="button" className={assetMode==="token"?"selected":""} onClick={()=>{setAssetMode("token");setError(null)}}>Project token</button></div></label>{assetMode==="token"?<div className="token-inspector social-token-inspector"><label>Arc token contract<div className="token-address-row"><input value={tokenAddress} onChange={event=>{setTokenAddress(event.target.value);setInspectedToken(null)}} placeholder="0x…" spellCheck={false}/><button type="button" onClick={()=>void inspectToken()} disabled={inspecting||!tokenAddress.trim()}>{inspecting?<RefreshCw className="spin"/>:<Search/>}{inspecting?"Reading…":"Inspect"}</button></div></label>{inspectedToken?<div className="inspected-token-result"><span>{inspectedToken.symbol.slice(0,1)}</span><div><b>{inspectedToken.name} <small>{inspectedToken.symbol}</small></b><p>{inspectedToken.decimals} decimals · {inspectedToken.address.slice(0,8)}…{inspectedToken.address.slice(-6)}</p></div><Status tone={inspectedToken.verified?"green":"cyan"}>{inspectedToken.verified?"Circle verified":"Onchain metadata"}</Status></div>:null}{inspectedToken?<TokenTrustPanel token={inspectedToken}/>:null}{inspectedToken?.warning?<p className="token-safety-note"><ShieldCheck/>{inspectedToken.warning}</p>:null}</div>:null}<div className="social-pay-fields">{kind==="send"?<label>Current username<div className="input-prefix"><span>@</span><input value={username} onChange={event=>setUsername(event.target.value.replace(/^@/,""))} placeholder="current-user" required/></div></label>:null}<label>Title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100} required/></label>{kind!=="split"?<label>Amount<div className="amount-input"><input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} required/><span>{asset}</span></div></label>:<div className="social-split-list"><div><b>Bill shares</b><button type="button" onClick={()=>setShares(current=>[...current,{label:`Person ${current.length+1}`,amount:"0"}])}><Plus/>Add person</button></div>{shares.map((share,index)=><div className="social-split-row" key={index}><i>{index+1}</i><input aria-label={`Person ${index+1}`} value={share.label} onChange={event=>updateShare(index,"label",event.target.value)}/><div className="amount-input"><input aria-label={`Share ${index+1} amount`} inputMode="decimal" value={share.amount} onChange={event=>updateShare(index,"amount",event.target.value)}/><span>{asset}</span></div>{shares.length>2?<button type="button" aria-label={`Remove ${share.label}`} onClick={()=>setShares(current=>current.filter((_,itemIndex)=>itemIndex!==index))}><X/></button>:null}</div>)}</div>}<label className="full">Note<textarea value={note} onChange={event=>setNote(event.target.value)} maxLength={280}/></label></div><div className="social-pay-summary"><span><small>TOTAL</small><b>{total.toLocaleString(undefined,{maximumFractionDigits:18})} {asset}</b></span><span><small>SETTLEMENT</small><b>Direct on Arc</b></span><span><small>CURRENT CUSTODY</small><b>None</b></span></div>{error?<p className="auth-system-note is-error"><X/>{error}</p>:null}<Button tone="blue" type="submit" disabled={loading||kind==="send"&&!username||assetMode==="token"&&!inspectedToken}>{loading?"Creating secure current…":kind==="send"?"Prepare direct payment":"Create share links"}<ArrowRight/></Button>{created?<div className="social-created"><CheckCircle2/><div><b>{created.kind==="split"?`${created.shares.length} private shares are ready`:"Secure payment link ready"}</b><small>{created.kind==="send"?`Open the link to approve the exact ${created.currency} transfer from your wallet.`:"Copy the private link and send it anywhere."}</small></div><div>{created.shares.map(share=><button type="button" onClick={()=>void copy(share.payUrl)} key={share.id}><Copy/>{share.label||"Copy link"}</button>)}</div></div>:null}</form><aside className="social-pay-preview"><div className="social-preview-flow"><span className="source">{kind==="send"?"YOU":"FRIENDS"}</span><i/><span className="amount">{total.toLocaleString()}<small>{asset}</small></span><i/><span className="destination">{kind==="send"?username||"@USER":"YOU"}</span></div><Eyebrow light>LIVE PREVIEW</Eyebrow><h2>{title}</h2><p>{note}</p><div><ShieldCheck/>Exact {asset} amount · direct wallet settlement</div></aside></div>}
    {auth.account?<div className="social-pay-ledger data-panel"><div className="panel-head"><div><h3>Payment currents</h3><p>Requests, split progress, receipts, and Arc settlement proof.</p></div><Status tone="green">Live records</Status></div>{state?.requests.map(request=><article key={request.id}><span className={`social-kind ${request.kind}`}><CircleDollarSign/></span><div><b>{request.title}</b><small>{request.kind} · {request.progress.paid}/{request.progress.total} settled</small></div><strong>{request.paidAmount} / {request.amount} <small>{request.currency}</small></strong><Status tone={request.status==="completed"?"green":request.status==="active"?"cyan":"grey"}>{request.status}</Status><button aria-label={`Copy ${request.title}`} onClick={()=>void copy(request.shares[0]?.payUrl??request.url)}><Copy/></button></article>)}{!state?.requests.length?<div className="campaign-empty compact"><CircleDollarSign/><b>No social currents yet</b><p>Your first send, request, tip, or split will appear here.</p></div>:null}</div>:null}</>;
}

function PageHero({eyebrow,title,copy,mode="network",children,action}:{eyebrow:string;title:string;copy:string;mode?:"network"|"branches"|"orbit";children?:React.ReactNode;action?:React.ReactNode}) {
  return <section className="app-page-hero"><FluidCanvas mode={mode}/><div><Eyebrow light>{eyebrow}</Eyebrow><h1>{title}</h1><p>{copy}</p>{children}{action}</div></section>;
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

function AccountPortfolio({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [state,setState]=useState<PortfolioState|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState<string|null>(null);
  const [transferOpen,setTransferOpen]=useState(false);const [transferAsset,setTransferAsset]=useState("");const [destination,setDestination]=useState("");const [transferAmount,setTransferAmount]=useState("");const [transferNote,setTransferNote]=useState("");
  const [transferBusy,setTransferBusy]=useState(false);const [transferError,setTransferError]=useState<string|null>(null);const [transferReceipt,setTransferReceipt]=useState<WalletTransferReceipt|null>(null);
  const refresh=useCallback(()=>{if(!auth.account){setState(null);return}setLoading(true);setError(null);currentApi.get<PortfolioState>("/portfolio").then(setState).catch(reason=>setError(reason instanceof Error?reason.message:"Your Arc portfolio is unavailable.")).finally(()=>setLoading(false))},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const short=(value:string)=>`${value.slice(0,7)}…${value.slice(-5)}`;
  const selectedAsset=state?.assets.find(asset=>asset.address===transferAsset)??state?.assets[0]??null;
  const openTransfer=(address?:string)=>{setTransferAsset(address??state?.assets[0]?.address??"");setDestination("");setTransferAmount("");setTransferNote("");setTransferError(null);setTransferReceipt(null);setTransferOpen(true)};
  const closeTransfer=()=>{if(!transferBusy)setTransferOpen(false)};
  const transfer=async(event:React.FormEvent)=>{event.preventDefault();if(!selectedAsset)return;setTransferBusy(true);setTransferError(null);try{const started=await currentApi.post<WalletActionResult&{transferId?:string;transfer?:WalletTransferReceipt}>("/portfolio/transfer",{tokenAddress:selectedAsset.address,destination,amount:transferAmount,note:transferNote});if(!started.challengeId||!started.transferId)throw new Error("Circle did not return a wallet approval.");await auth.executeChallenge(started.challengeId);const confirmed=await confirmWalletAction("/portfolio/transfer",{transferId:started.transferId},started.challengeId) as WalletActionResult&{transfer?:WalletTransferReceipt};if(!confirmed.transfer)throw new Error("The Arc transfer could not be confirmed.");setTransferReceipt(confirmed.transfer);await refresh()}catch(reason){setTransferError(reason instanceof Error?reason.message:"The transfer could not be completed.")}finally{setTransferBusy(false)}};
  return <><PageHero eyebrow="YOUR CURRENT ACCOUNT" title="Every asset. One honest record." copy="See verified Arc balances and the Current activity that moved them. Project tokens stay unpriced until a trustworthy market source exists." mode="branches"><Button tone="cyan" onClick={()=>openTransfer()}>Move an asset <ArrowRight/></Button></PageHero>
    {!auth.account?<div className="portfolio-locked"><FluidCanvas mode="orbit"/><span><Wallet/></span><Eyebrow light>WALLETLESS ACCOUNT</Eyebrow><h2>Your portfolio begins with one claim.</h2><p>Sign in with email or Google. Current creates your embedded Arc wallet without a seed phrase, extension, or gas balance.</p><Button tone="light" onClick={()=>go("claim")}>Create your account <ArrowRight/></Button></div>:<>
      <section className="portfolio-proofbar"><div><span className="portfolio-wallet-mark"><Wallet/></span><div><small>ARC TESTNET WALLET</small><b>{short(state?.walletAddress??auth.account.wallets.find(wallet=>wallet.blockchain==="ARC-TESTNET")?.address??"0x000000000000")}</b></div></div><div><small>READ AT BLOCK</small><b>{state?.blockNumber??(loading?"Reading…":"—")}</b></div><div><small>DATA MODE</small><b><i/>Verified onchain</b></div>{state?<a href={state.explorerUrl} target="_blank" rel="noreferrer">Open in ArcScan <ExternalLink/></a>:<button onClick={()=>void refresh()}><RefreshCw className={loading?"spin":""}/>Refresh</button>}</section>
      {error?<div className="portfolio-error"><ShieldAlert/><div><b>The account current was interrupted.</b><p>{error} Your funds have not moved.</p></div><button onClick={()=>void refresh()}>Try again</button></div>:null}
      <div className="portfolio-metrics"><article className="portfolio-total"><small>VERIFIED USDC PARITY</small><strong>{loading&&!state?"—":state?.totals.verifiedUsd??"0.00"}<em>USDC</em></strong><p>Arc testnet assets have no real monetary value.</p><span className="portfolio-waterline"><i/></span></article><MetricCard label="Assets detected" value={(state?.totals.assets??0).toLocaleString()} icon={Layers3}/><MetricCard label="Unpriced assets" value={(state?.assets.filter(asset=>asset.valuation==="unpriced").length??0).toLocaleString()} icon={ShieldCheck}/><MetricCard label="Account events" value={(state?.totals.activity??0).toLocaleString()} icon={Activity}/></div>
      <div className="portfolio-layout"><section className="data-panel portfolio-assets"><div className="panel-head"><div><h3>Arc assets</h3><p>Balances read from token contracts at the block above</p></div><Status tone="green">Onchain</Status></div>{loading&&!state?<div className="portfolio-loading">{[1,2,3].map(item=><i key={item}/>)}</div>:state?.assets.map(asset=><article key={asset.address}><span className={`portfolio-token token-${asset.verified?"verified":"project"}`}>{asset.symbol.slice(0,2)}</span><div><b>{asset.name}</b><small>{asset.symbol} · {short(asset.address)} · {asset.trustPosture.replaceAll("-"," ")}</small></div><strong>{Number(asset.balance).toLocaleString(undefined,{maximumFractionDigits:6})}<small>{asset.symbol}</small></strong><div className="portfolio-value">{asset.usdValue!==null?<><b>{asset.usdValue} USDC</b><small>stablecoin parity</small></>:<><b>Unpriced</b><small>No trusted market source</small></>}</div><button className="portfolio-send-button" disabled={Number(asset.balance)<=0} onClick={()=>openTransfer(asset.address)} aria-label={`Send ${asset.symbol}`}><ArrowUpRight/></button></article>)}{!loading&&!state?.assets.length?<div className="campaign-empty compact"><Wallet/><b>No onchain balance detected</b><p>Claim USDC or a project token and it will appear after Arc confirms the transfer.</p><Button tone="blue" onClick={()=>go("create")}>Create a claim link</Button></div>:null}</section>
        <section className="data-panel portfolio-activity"><div className="panel-head"><div><h3>Unified activity</h3><p>Claims, social payments, checkout, and subscriptions</p></div><Activity/></div>{loading&&!state?<div className="portfolio-loading">{[1,2,3,4].map(item=><i key={item}/>)}</div>:state?.activity.map(item=><article key={item.id}><span className={`portfolio-direction ${item.direction}`}>{item.direction==="in"?<ArrowLeft/>:<ArrowUpRight/>}</span><div><b>{item.title}</b><small>{item.kind.replace("-"," ")} · {new Date(item.occurredAt).toLocaleDateString()}</small></div><strong className={item.direction}>{item.direction==="in"?"+":"−"}{item.amount}<small>{item.symbol}</small></strong>{item.transactionHash?<a href={`https://testnet.arcscan.app/tx/${item.transactionHash}`} target="_blank" rel="noreferrer"><ExternalLink/></a>:<Status tone={item.status==="confirmed"?"green":"grey"}>{item.status}</Status>}</article>)}{!loading&&!state?.activity.length?<div className="campaign-empty compact"><Activity/><b>No account activity yet</b><p>Verified claims and payments will form one readable history here.</p></div>:null}</section></div>
      <aside className="portfolio-boundary"><ShieldCheck/><div><b>What this account does—and does not—claim</b><p>{state?.provenance??"Balances are read directly from Arc testnet."} {state?.valuationBoundary??"Project tokens are not assigned fabricated prices."}</p></div></aside>
      {transferOpen?<div className="wallet-transfer-shade" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeTransfer()}}><section className="wallet-transfer-sheet" role="dialog" aria-modal="true" aria-labelledby="wallet-transfer-title"><header><div><Eyebrow>ACTIVE ARC ACCOUNT</Eyebrow><h2 id="wallet-transfer-title">{transferReceipt?"Transfer confirmed.":"Move an asset."}</h2></div><button onClick={closeTransfer} disabled={transferBusy} aria-label="Close transfer"><X/></button></header>{transferReceipt?<div className="wallet-transfer-success"><span><Check/></span><strong>{transferReceipt.amount} {transferReceipt.asset.symbol}</strong><p>Reached {short(transferReceipt.toAddress)} on Arc testnet.</p><div><small>RECEIPT</small><code>{transferReceipt.receiptNumber}</code><small>STATUS</small><b>{transferReceipt.status}</b></div>{transferReceipt.explorerUrl?<a href={transferReceipt.explorerUrl} target="_blank" rel="noreferrer">Inspect Arc settlement <ExternalLink/></a>:null}<Button tone="blue" onClick={closeTransfer}>Back to account <ArrowRight/></Button></div>:<form onSubmit={event=>void transfer(event)}><label>Asset<select value={transferAsset} onChange={event=>setTransferAsset(event.target.value)}>{state?.assets.map(asset=><option value={asset.address} key={asset.address}>{asset.symbol} · {Number(asset.balance).toLocaleString(undefined,{maximumFractionDigits:6})} available</option>)}</select></label><label>Destination Arc address<input value={destination} onChange={event=>setDestination(event.target.value.trim())} placeholder="0x…" autoComplete="off" spellCheck={false}/></label><label>Amount<div className="wallet-transfer-amount"><input inputMode="decimal" value={transferAmount} onChange={event=>setTransferAmount(event.target.value)} placeholder="0.00"/><button type="button" onClick={()=>setTransferAmount(selectedAsset?.balance??"")}>MAX</button></div></label><label>Private note <small>optional</small><input value={transferNote} maxLength={140} onChange={event=>setTransferNote(event.target.value)} placeholder="What is this transfer for?"/></label><div className="wallet-transfer-review"><span><small>YOU SEND</small><b>{transferAmount||"0"} {selectedAsset?.symbol??"TOKEN"}</b></span><ArrowRight/><span><small>RECIPIENT</small><b>{destination?short(destination):"Not entered"}</b></span></div><aside><ShieldCheck/><p><b>You approve the exact transfer in your Circle wallet.</b> Current never takes custody, cannot redirect it, and does not assign a market value to project tokens.</p></aside>{transferError?<p className="wallet-transfer-error"><ShieldAlert/>{transferError}</p>:null}<Button tone="blue" type="submit" disabled={transferBusy||!selectedAsset||!destination||!transferAmount}>{transferBusy?"Confirming current…":"Review in wallet"} <ArrowUpRight/></Button></form>}</section></div>:null}
    </>}
  </>;
}

function CreateLink({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  type CreatedLink={id:string;claimUrl:string;status:string;asset:string;assetDetails:InspectedToken};
  const [assetMode,setAssetMode]=useState<"usdc"|"token">("usdc"); const [tokenAddress,setTokenAddress]=useState("");
  const [inspectedToken,setInspectedToken]=useState<InspectedToken|null>(null); const [inspecting,setInspecting]=useState(false);
  const [amount,setAmount]=useState("25"); const [message,setMessage]=useState("A little value for your next current.");
  const [created,setCreated]=useState<CreatedLink|null>(null);
  const [fundingStep,setFundingStep]=useState<"idle"|"creating"|"approving"|"funding"|"complete">("idle");
  const [submitting,setSubmitting]=useState(false); const [error,setError]=useState<string|null>(null);
  const asset=assetMode==="usdc"?"USDC":inspectedToken?.symbol??"TOKEN";
  const inspectToken=async()=>{
    setError(null);setInspectedToken(null);
    if(!auth.account){go("claim");return}
    setInspecting(true);
    try{setInspectedToken(await currentApi.post<InspectedToken>("/tokens/inspect",{address:tokenAddress}))}
    catch(inspectError){setError(inspectError instanceof Error?inspectError.message:"This token could not be read on Arc.")}
    finally{setInspecting(false)}
  };
  const fund=async(link:CreatedLink)=>{
    setFundingStep("approving");
    const approval=await currentApi.post<WalletActionResult>("/links/fund",{distributionId:link.id,action:"approve"});
    if(!approval.complete){
      if(!approval.challengeId)throw new Error(`Circle did not return the ${link.asset} approval.`);
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
        if(assetMode==="token"&&!inspectedToken)throw new Error("Inspect the Arc token contract before creating this link.");
        const result=await currentApi.post<CreatedLink>("/links",{amount,message,expiresInHours:168,tokenAddress:assetMode==="token"?inspectedToken?.address:undefined});
        setCreated(result);await fund(result);
      }
    }catch(linkError){if(!created)setFundingStep("idle");setError(linkError instanceof Error?linkError.message:"The link could not be created.")}
    finally{setSubmitting(false)}
  };
  const buttonLabel=fundingStep==="creating"?"Securing link…":fundingStep==="approving"?`Approve ${asset} access…`:fundingStep==="funding"?"Fund the Arc vault…":created&&fundingStep!=="complete"?"Resume secure funding":auth.account?"Create and fund link":"Sign in to create";
  return <><PageHero eyebrow="PERSONAL CURRENT" title="Send value before a wallet exists." copy="Create one private, identity-bound, or open link for USDC or any supported project token."/>
    <div className="form-preview-grid"><form className="form-panel" onSubmit={submit}><div className="panel-head"><div><h3>Create an asset link</h3><p>Funds remain recoverable until claimed.</p></div><Status tone="blue">Arc testnet</Status></div>
      <label>Asset<div className="asset-options"><button type="button" className={assetMode==="usdc"?"selected":""} onClick={()=>{setAssetMode("usdc");setInspectedToken(null);setError(null)}}>USDC</button><button type="button" className={assetMode==="token"?"selected":""} onClick={()=>{setAssetMode("token");setError(null)}}>Project token</button></div></label>
      {assetMode==="token"&&<div className="token-inspector"><label>Arc token contract<div className="token-address-row"><input value={tokenAddress} onChange={event=>{setTokenAddress(event.target.value);setInspectedToken(null)}} placeholder="0x…" spellCheck={false}/><button type="button" onClick={()=>void inspectToken()} disabled={inspecting||!tokenAddress.trim()}>{inspecting?<RefreshCw className="spin"/>:<Search/>}{inspecting?"Reading…":"Inspect"}</button></div></label>{inspectedToken&&<div className="inspected-token-result"><span>{inspectedToken.symbol.slice(0,1)}</span><div><b>{inspectedToken.name} <small>{inspectedToken.symbol}</small></b><p>{inspectedToken.decimals} decimals · {inspectedToken.address.slice(0,8)}…{inspectedToken.address.slice(-6)}</p></div><Status tone={inspectedToken.verified?"green":"cyan"}>{inspectedToken.verified?"Circle verified":"Onchain metadata"}</Status></div>}{inspectedToken&&<TokenTrustPanel token={inspectedToken}/>} {inspectedToken?.warning&&<p className="token-safety-note"><ShieldCheck/>{inspectedToken.warning}</p>}</div>}
      <label>Amount<div className="amount-input"><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><span>{asset}</span></div></label>
      <div className="two-fields"><label>Recipient rule<select><option>Anyone with the private link</option><option>Verified email</option><option>Verified X identity</option></select></label><label>Expiration<select><option>7 days</option><option>24 hours</option><option>30 days</option></select></label></div>
      <label>Message<textarea value={message} onChange={event=>setMessage(event.target.value)}/></label>
      <div className="fee-summary"><span>Distribution <b>{amount} {asset}</b></span><span>Sponsored gas <b>$0.02</b></span><span>Current CoFi fee <b>$0.00</b></span></div>
      {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
      <Button tone="blue" type="submit" disabled={submitting||fundingStep==="complete"||(assetMode==="token"&&!inspectedToken)}>{buttonLabel} <ArrowRight/></Button>
      {created&&<div className="link-result"><CheckCircle2/><div><b>{fundingStep==="complete"?"Funded claim link copied":"Secure claim link reserved"}</b><small>{fundingStep==="complete"?`The ${created.asset} is locked in the Arc vault and ready to claim.`:"Complete both wallet approvals to make the link claimable."}</small></div><button type="button" onClick={()=>void navigator.clipboard?.writeText(created.claimUrl)} aria-label="Copy claim link"><Copy/></button></div>}</form>
      <aside className="live-link-preview"><FluidCanvas/><Eyebrow light>LIVE PREVIEW</Eyebrow><span className="preview-token">{asset[0]}</span><small>You’re sending</small><strong>{amount || "0"} {asset}</strong><p>{message}</p><button>Claim — no gas required</button>{created&&<div className="created-toast"><CheckCircle2/>{fundingStep==="complete"?"Vault funded":"Link secured"}</div>}</aside></div></>;
}

/* Retained in git history only; the live workspace below replaces this static prototype.
function LegacyProjectOnboarding({go}:{go:(v:View)=>void}) {
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
*/

function ProjectOnboarding({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [step,setStep]=useState(1);const [workspace,setWorkspace]=useState<ProjectSetupWorkspace|null>(null);const [loading,setLoading]=useState(Boolean(auth.account));const [saving,setSaving]=useState(false);const [inspecting,setInspecting]=useState(false);const [error,setError]=useState<string|null>(null);const [saved,setSaved]=useState(false);
  const [name,setName]=useState("");const [websiteUrl,setWebsiteUrl]=useState("");const [description,setDescription]=useState("");const [logoUrl,setLogoUrl]=useState("");const [tokenAddress,setTokenAddress]=useState("");const [inspectedToken,setInspectedToken]=useState<InspectedSetupToken|null>(null);
  const hydrate=useCallback((value:ProjectSetupWorkspace)=>{setWorkspace(value);setName(value.project.name);setWebsiteUrl(value.project.websiteUrl??"");setDescription(value.project.description??"");setLogoUrl(value.project.logoUrl??"");if(value.tokens[0]){setTokenAddress(value.tokens[0].address);setInspectedToken({...value.tokens[0],network:value.project.network,warning:value.tokens[0].verified?null:"Contract metadata was read directly from Arc."})}},[]);
  const load=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{hydrate(await currentApi.get<ProjectSetupWorkspace>("/project-setup"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Project setup is unavailable.")}finally{setLoading(false)}},[auth.account,hydrate]);
  useEffect(()=>{const task=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(task)},[load]);
  const inspect=async()=>{setInspecting(true);setError(null);try{setInspectedToken(await currentApi.post<InspectedSetupToken>("/tokens/inspect",{address:tokenAddress}))}catch(reason){setInspectedToken(null);setError(reason instanceof Error?reason.message:"The token could not be inspected on Arc.")}finally{setInspecting(false)}};
  const publish=async()=>{setSaving(true);setError(null);try{const result=await currentApi.post<ProjectSetupWorkspace>("/project-setup",{name,websiteUrl,description,logoUrl,tokenAddress:inspectedToken?.address});hydrate(result);setSaved(true)}catch(reason){setError(reason instanceof Error?reason.message:"The launch workspace could not be published.")}finally{setSaving(false)}};
  const next=async()=>{if(step===1&&(!name.trim()||!description.trim()||!/^https:\/\//i.test(websiteUrl))){setError("Add a project name, description, and HTTPS website before continuing.");return}if(step===4){await publish();return}setError(null);setStep(current=>Math.min(4,current+1))};
  const readiness=workspace?.readiness;
  if(!auth.account)return <><PageHero eyebrow="PROJECT LAUNCH WORKSPACE" title="Build the proof before the pitch." copy="Publish a real project identity, inspect an Arc token, and turn the setup into verifiable grant readiness."/><div className="project-setup-boundary"><Lock/><h3>Open your embedded wallet first</h3><p>Your project identity, token review, and readiness evidence are private to its owner.</p><Button tone="blue" onClick={()=>go("claim")}>Open Current account <ArrowRight/></Button></div></>;
  return <><PageHero eyebrow="PROJECT LAUNCH WORKSPACE" title="Connect the source. Prove the current." copy="Publish the project, inspect its Arc token, confirm ownership, and move directly into a measurable testnet campaign."/>
    {loading?<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reading launch evidence</b><small>Reconciling the project, wallet, token, and integration record.</small></div></div>:<div className="project-setup-layout">
      <section className="project-setup-main"><div className="onboarding-progress">{["Project","Token","Access","Review"].map((label,index)=><span className={step>=index+1?"active":""} key={label}><i>{step>index+1?<Check/>:index+1}</i>{label}</span>)}</div>
        <div className="form-panel onboarding-card"><div className="setup-heading"><div><Eyebrow>STEP {step} OF 4</Eyebrow><h2>{["Publish the project identity","Inspect the project token","Confirm the operating boundary","Review the launch source"][step-1]}</h2></div><Status tone="cyan">Arc testnet</Status></div>
          {step===1&&<div className="field-grid"><label>Project name<input value={name} onChange={event=>setName(event.target.value)} maxLength={80}/></label><label>HTTPS website<input value={websiteUrl} onChange={event=>setWebsiteUrl(event.target.value)} placeholder="https://project.xyz"/></label><label className="full">Logo URL <small>(optional HTTPS asset)</small><input value={logoUrl} onChange={event=>setLogoUrl(event.target.value)} placeholder="https://project.xyz/logo.png"/></label><label className="full">What does this project activate?<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={500} placeholder="Explain the audience and the useful action after a claim."/></label></div>}
          {step===2&&<div className="setup-token-stage"><div className="token-inspector"><label>Arc project-token contract <small>(optional—USDC works by default)</small><div><input value={tokenAddress} onChange={event=>{setTokenAddress(event.target.value);setInspectedToken(null)}} placeholder="0x…"/><Button tone="ghost" disabled={!tokenAddress||inspecting} onClick={()=>void inspect()}>{inspecting?"Inspecting…":"Inspect on Arc"} <Search/></Button></div></label></div>{inspectedToken?<article className="inspected-token-card"><span>{inspectedToken.symbol.slice(0,2)}</span><div><Status tone={inspectedToken.verified?"green":"cyan"}>{inspectedToken.verified?"Circle-listed":"Onchain inspected"}</Status><h3>{inspectedToken.name} <small>{inspectedToken.symbol}</small></h3><code>{inspectedToken.address}</code><p>{inspectedToken.decimals} decimals · {inspectedToken.network}</p></div><ShieldCheck/></article>:<div className="token-optional-note"><CircleDollarSign/><div><b>USDC distribution is already available</b><p>Add the project token only when you want Current to inspect and distribute that ERC-20 alongside USDC.</p></div></div>}</div>}
          {step===3&&<div className="setup-access-stage"><div className="team-invite"><span>{workspace?.owner?.displayName.slice(0,2).toUpperCase()??"CO"}</span><div><b>{workspace?.owner?.displayName??auth.account.displayName}</b><small>@{workspace?.owner?.username??"current-owner"} · Owner · Full access</small></div><Status tone="green">Verified</Status></div><div className="access-boundary-grid"><article><ShieldCheck/><b>Wallet approvals stay human</b><p>Circle challenges remain bound to the signed-in owner. Project tokens never authorize wallet access.</p></article><article><Braces/><b>Integrations stay scoped</b><p>API keys, webhooks, and agents receive explicit permissions and can be revoked independently.</p></article><article><Users/><b>Team expansion stays controlled</b><p>Owner, admin, operator, analyst, and developer roles are enforced server-side as collaborators are added.</p></article></div></div>}
          {step===4&&<div className="review-stack project-review-stack"><span><CheckCircle2/><b>Project identity</b><small>{name} · {websiteUrl}</small></span><span className={inspectedToken?"":"optional"}>{inspectedToken?<CheckCircle2/>:<CircleDollarSign/>}<b>{inspectedToken?"Project token inspected":"USDC-first launch"}</b><small>{inspectedToken?`${inspectedToken.symbol} · ${inspectedToken.decimals} decimals`:"A project token can be added later"}</small></span><span><CheckCircle2/><b>Owner boundary</b><small>{workspace?.owner?.displayName??auth.account.displayName} controls wallet approvals</small></span><span><Rocket/><b>Next measurable milestone</b><small>Create, fund, and deliver the first walletless Arc testnet campaign</small></span></div>}
          {error&&<p className="auth-system-note is-error"><X/>{error}</p>}{saved&&<p className="auth-system-note"><CheckCircle2/>Launch workspace published. Your readiness evidence is now persistent.</p>}
          <div className="form-actions"><Button tone="ghost" disabled={step===1||saving} onClick={()=>setStep(current=>Math.max(1,current-1))}>Back</Button>{saved?<Button tone="cyan" onClick={()=>go("new-campaign")}>Create first campaign <ArrowRight/></Button>:<Button tone="blue" disabled={saving} onClick={()=>void next()}>{saving?"Publishing evidence…":step<4?"Continue":"Publish launch workspace"} <ArrowRight/></Button>}</div>
        </div></section>
      <aside className="setup-readiness"><header><div><Eyebrow>GRANT READINESS</Eyebrow><h3>{readiness?.score??0}%</h3></div><Status tone={readiness?.requiredComplete?"green":"blue"}>{readiness?.stage.replaceAll("-"," ")??"setup required"}</Status></header><div className="readiness-ring" style={{"--readiness":`${readiness?.score??0}%`} as CSSProperties}><span>{readiness?.completed??0}<small>of {readiness?.total??7}</small></span></div><div className="readiness-checks">{readiness?.checks.map(check=><button key={check.id} onClick={()=>check.id==="campaign"?go("new-campaign"):check.id==="developer"?go("api-keys"):check.id==="webhook"?go("webhooks"):check.id==="pilot"?go("pilots"):undefined}><i className={check.complete?"complete":""}>{check.complete?<Check/>:<span/>}</i><span><b>{check.label}{check.required&&<em>Required</em>}</b><small>{check.detail}</small></span></button>)}</div><footer><ShieldCheck/><span><b>Evidence, not a self-reported checklist</b><small>Current calculates this from persisted project records and Arc-connected product activity.</small></span></footer></aside>
    </div>}
  </>;
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

function CommunityPayroll({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [state,setState]=useState<PayrollWorkspace|null>(null);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);const [name,setName]=useState("Core community contributors");const [tokenAddress,setTokenAddress]=useState("");const [cadenceDays,setCadenceDays]=useState(14);
  const [nextRunAt,setNextRunAt]=useState(()=>new Date(Date.now()+86_400_000).toISOString().slice(0,10));
  const [members,setMembers]=useState([{displayName:"",role:"",identityType:"email",identity:"",amount:""}]);
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<PayrollWorkspace>("/payroll"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Community payroll is unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const updateMember=(index:number,key:string,value:string)=>setMembers(current=>current.map((member,position)=>position===index?{...member,[key]:value}:member));
  const create=async()=>{if(!auth.account){go("claim");return}setBusy("create");setError(null);try{await currentApi.post("/payroll",{name,tokenAddress:tokenAddress||undefined,cadenceDays,nextRunAt:new Date(`${nextRunAt}T12:00:00Z`).toISOString(),claimExpiresHours:168,members});setCreating(false);setMembers([{displayName:"",role:"",identityType:"email",identity:"",amount:""}]);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The payroll schedule could not be created.")}finally{setBusy(null)}};
  const prepare=async(scheduleId:string)=>{setBusy(`prepare:${scheduleId}`);setError(null);try{const result=await currentApi.post<{distributionId:string}>("/payroll",{action:"prepare",scheduleId});setBusy(`fund:${scheduleId}`);const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:result.distributionId,action:"approve"});if(!approval.complete){if(!approval.challengeId)throw new Error("Circle did not return the payroll token approval.");await auth.executeChallenge(approval.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId:result.distributionId,action:"approve"},approval.challengeId)}const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId:result.distributionId,action:"deposit"});if(!deposit.complete){if(!deposit.challengeId)throw new Error("Circle did not return the payroll funding approval.");await auth.executeChallenge(deposit.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId:result.distributionId,action:"deposit"},deposit.challengeId)}await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The payroll run could not be prepared and funded.");await refresh()}finally{setBusy(null)}};
  const toggle=async(scheduleId:string,status:string)=>{setBusy(`status:${scheduleId}`);try{await currentApi.post("/payroll",{action:status==="active"?"pause":"resume",scheduleId});await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The payroll status could not be changed.")}finally{setBusy(null)}};
  const totals=state?.totals;
  return <><PageHero eyebrow="COMMUNITY PAYROLL" title="Pay the people who move the current." copy="Schedule repeat USDC or project-token payroll for contributors who can claim through email, social identity, or wallet—without needing crypto first." mode="branches"><Button tone="cyan" onClick={()=>setCreating(true)}>New payroll <Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Active schedules" value={(totals?.activeSchedules??0).toLocaleString()} icon={Repeat2}/><MetricCard label="Contributors" value={(totals?.contributors??0).toLocaleString()} icon={Users}/><MetricCard label="Prepared runs" value={(totals?.preparedRuns??0).toLocaleString()} icon={CheckCircle2}/><MetricCard label="Settlement rail" value="Arc" icon={Zap}/></div>
    <div className="payroll-boundary"><ShieldCheck/><div><b>Recurring preparation, explicit settlement</b><small>Current prepares each encrypted roster and walletless allocation automatically. A project owner still approves funds in Circle before anything moves.</small></div><Status tone="green">Non-custodial approval</Status></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Open your workspace to run payroll</h3><p>Community rosters, schedules, and settlement history are private to authorized project operators.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling payroll</b><small>Reading encrypted rosters, due cycles, and Arc settlement state.</small></div></div>}
    {auth.account&&!loading&&!state?.schedules.length&&<div className="campaign-empty"><Users/><h3>Your first contributor current starts here</h3><p>Create a reusable roster once, then prepare a fully funded walletless campaign every pay cycle.</p><Button tone="blue" onClick={()=>setCreating(true)}>Create payroll <Plus/></Button></div>}
    {!!state?.schedules.length&&<div className="payroll-grid">{state.schedules.map(schedule=><article className="data-panel payroll-card" key={schedule.id}><header><div className="payroll-mark"><Repeat2/></div><div><Status tone={schedule.status==="active"?"green":"grey"}>{schedule.status}</Status><h3>{schedule.name}</h3><p>{schedule.asset.symbol} · every {schedule.cadenceDays} days</p></div><button className="payroll-pause" disabled={Boolean(busy)} onClick={()=>void toggle(schedule.id,schedule.status)}>{schedule.status==="active"?<><Pause/>Pause</>:<><Play/>Resume</>}</button></header><div className="payroll-stats"><span><small>NEXT RUN</small><b>{new Date(schedule.nextRunAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</b></span><span><small>CONTRIBUTORS</small><b>{schedule.memberCount}</b></span><span><small>RUN TOTAL</small><b>{schedule.totalAmount} {schedule.asset.symbol}</b></span></div><div className="payroll-roster">{schedule.members.slice(0,4).map(member=><div key={member.id}><i>{member.displayName.slice(0,2).toUpperCase()}</i><span><b>{member.displayName}</b><small>{member.role||member.identityType} · {member.maskedIdentity}</small></span><strong>{member.amount} {schedule.asset.symbol}</strong></div>)}{schedule.members.length>4&&<small>+ {schedule.members.length-4} more contributors</small>}</div><div className="payroll-run-history">{schedule.runs.slice(0,3).map(run=><span key={run.id}><Status tone={run.status==="active"||run.status==="completed"?"green":run.status==="awaiting_funding"?"blue":"grey"}>{run.status.replaceAll("_"," ")}</Status><b>{new Date(run.cycleAt).toLocaleDateString()}</b><small>{run.totalAmount} {schedule.asset.symbol} · {run.memberCount} people</small></span>)}</div><footer><span><Lock/>Identities encrypted</span><Button tone="blue" disabled={Boolean(busy)||schedule.status!=="active"} onClick={()=>void prepare(schedule.id)}>{busy===`prepare:${schedule.id}`?"Preparing…":busy===`fund:${schedule.id}`?"Approve in Circle…":"Prepare & fund run"} <ArrowRight/></Button></footer></article>)}</div>}
    {creating&&<div className="payroll-modal-shade" role="presentation"><section className="payroll-modal" role="dialog" aria-modal="true" aria-label="Create community payroll"><header><div><Eyebrow>NEW COMMUNITY PAYROLL</Eyebrow><h2>Build a reusable contributor roster.</h2><p>Raw identities are encrypted before storage and never returned to the dashboard.</p></div><button aria-label="Close" onClick={()=>setCreating(false)}><X/></button></header><div className="payroll-form-grid"><label>Payroll name<input value={name} onChange={event=>setName(event.target.value)} maxLength={100}/></label><label>Cadence<select value={cadenceDays} onChange={event=>setCadenceDays(Number(event.target.value))}><option value={7}>Weekly</option><option value={14}>Every two weeks</option><option value={30}>Monthly</option></select></label><label>First pay date<input type="date" value={nextRunAt} onChange={event=>setNextRunAt(event.target.value)}/></label><label>Project token contract <small>(blank = USDC)</small><input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="0x… or leave blank for USDC"/></label></div><div className="payroll-member-head"><div><b>Contributor roster</b><small>Email, X, wallet, game ID, or a custom identity.</small></div><button onClick={()=>setMembers(current=>[...current,{displayName:"",role:"",identityType:"email",identity:"",amount:""}])}><Plus/>Add contributor</button></div><div className="payroll-member-list">{members.map((member,index)=><div key={index}><input aria-label="Contributor name" value={member.displayName} onChange={event=>updateMember(index,"displayName",event.target.value)} placeholder="Name"/><input aria-label="Contributor role" value={member.role} onChange={event=>updateMember(index,"role",event.target.value)} placeholder="Role"/><select aria-label="Identity type" value={member.identityType} onChange={event=>updateMember(index,"identityType",event.target.value)}><option value="email">Email</option><option value="x">X account</option><option value="wallet">Wallet</option><option value="game">Game ID</option><option value="custom">Custom ID</option></select><input aria-label="Recipient identity" value={member.identity} onChange={event=>updateMember(index,"identity",event.target.value)} placeholder={member.identityType==="email"?"name@example.com":"Recipient identity"}/><input aria-label="Payroll amount" inputMode="decimal" value={member.amount} onChange={event=>updateMember(index,"amount",event.target.value)} placeholder="Amount"/><button aria-label="Remove contributor" disabled={members.length===1} onClick={()=>setMembers(current=>current.filter((_,position)=>position!==index))}><X/></button></div>)}</div><footer><div><ShieldCheck/><span><b>Walletless by default</b><small>Each pay run becomes a fully funded identity-bound Arc campaign.</small></span></div><Button tone="blue" disabled={busy==="create"||!name||members.some(member=>!member.displayName||!member.identity||!member.amount)} onClick={()=>void create()}>{busy==="create"?"Securing roster…":"Create payroll"} <ArrowRight/></Button></footer></section></div>}
  </>;
}

function CommunityBounties({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [state,setState]=useState<BountyWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);const [selected,setSelected]=useState<string|null>(null);const [winningClaimUrl,setWinningClaimUrl]=useState<string|null>(null);
  const [title,setTitle]=useState("Create the launch story in motion");const [summary,setSummary]=useState("Produce an original 30–45 second launch animation that explains how Current turns an offchain audience into funded wallets and active token users.");const [category,setCategory]=useState("Creative");const [amount,setAmount]=useState("250");const [tokenAddress,setTokenAddress]=useState("");const [deadline,setDeadline]=useState(()=>new Date(Date.now()+7*86_400_000).toISOString().slice(0,10));
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<BountyWorkspace>("/bounties"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Community bounties are unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const fund=async(distributionId:string,key:string)=>{setBusy(`fund:${key}`);const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"approve"});if(!approval.complete){if(!approval.challengeId)throw new Error("Circle did not return the bounty token approval.");await auth.executeChallenge(approval.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"approve"},approval.challengeId)}const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"deposit"});if(!deposit.complete){if(!deposit.challengeId)throw new Error("Circle did not return the bounty funding approval.");await auth.executeChallenge(deposit.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"deposit"},deposit.challengeId)}};
  const create=async()=>{if(!auth.account){go("claim");return}setBusy("create");setError(null);try{const created=await currentApi.post<{id:string;distributionId?:string;campaign:CreatedCampaign}>("/bounties",{title,summary,category,amount,tokenAddress:tokenAddress||undefined,submissionDeadline:new Date(`${deadline}T23:59:00Z`).toISOString()});await fund(created.campaign.id,created.id);setCreating(false);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The bounty could not be created and funded.");await refresh()}finally{setBusy(null)}};
  const fundExisting=async(item:BountyRecord)=>{setError(null);try{await fund(item.distributionId,item.id);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The bounty prize could not be funded.")}finally{setBusy(null)}};
  const review=async(bountyId:string,submissionId:string,action:"shortlist"|"reject"|"award")=>{setBusy(`${action}:${submissionId}`);setError(null);try{const result=await currentApi.post<{claimUrl?:string}>("/bounties",{action,bountyId,submissionId});if(result.claimUrl){setWinningClaimUrl(result.claimUrl);await navigator.clipboard.writeText(result.claimUrl)}await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The submission could not be reviewed.")}finally{setBusy(null)}};
  const copyWinningClaim=async(bountyId:string)=>{setBusy(`claim:${bountyId}`);try{const result=await currentApi.post<{claimUrl:string}>("/bounties",{action:"winning-claim",bountyId});setWinningClaimUrl(result.claimUrl);await navigator.clipboard.writeText(result.claimUrl)}catch(reason){setError(reason instanceof Error?reason.message:"The winning claim could not be opened.")}finally{setBusy(null)}};
  const totals=state?.totals;
  return <><PageHero eyebrow="COMMUNITY BOUNTIES" title="Fund the work. Prove the payout." copy="Publish fully funded USDC or project-token work bounties, review verifiable submissions, and send the winner a walletless Arc claim." mode="orbit"><Button tone="cyan" onClick={()=>setCreating(true)}>New bounty <Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Open bounties" value={(totals?.open??0).toLocaleString()} icon={Target}/><MetricCard label="Submissions" value={(totals?.submissions??0).toLocaleString()} icon={FileCheck2}/><MetricCard label="Awards" value={(totals?.awarded??0).toLocaleString()} icon={BadgeCheck}/><MetricCard label="Prize custody" value="Arc" icon={Lock}/></div>
    <div className="bounty-proof-strip"><ShieldCheck/><div><b>Prize-backed before participation</b><small>A public bounty opens only after the complete reward is locked in Current’s Campaign Vault.</small></div><Status tone="green">Verifiable on Arc</Status></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}{winningClaimUrl&&<p className="bounty-claim-notice"><Gift/><span><b>Winning claim copied</b><small>Send the private link only to the selected contributor. It creates a wallet if they need one.</small></span><button onClick={()=>void navigator.clipboard.writeText(winningClaimUrl)}><Copy/>Copy again</button></p>}
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Open your workspace to publish bounties</h3><p>Funding, submissions, evidence, and winner claims stay scoped to authorized project operators.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling bounty proofs</b><small>Checking prize funding, submissions, and award history.</small></div></div>}
    {auth.account&&!loading&&!state?.bounties.length&&<div className="campaign-empty"><Target/><h3>No funded work bounties yet</h3><p>Publish a clear task, lock the prize, and invite contributors through one public link.</p><Button tone="blue" onClick={()=>setCreating(true)}>Create first bounty <Plus/></Button></div>}
    {!!state?.bounties.length&&<div className="bounty-board">{state.bounties.map(item=><article className={`data-panel bounty-card ${selected===item.id?"expanded":""}`} key={item.id}><header><span className="bounty-category">{item.category}</span><Status tone={item.status==="open"?"green":item.status==="awarded"?"blue":item.status==="awaiting_funding"?"red":"grey"}>{item.status.replaceAll("_"," ")}</Status></header><h3>{item.title}</h3><p>{item.summary}</p><div className="bounty-prize"><span><small>PRIZE</small><strong>{item.prize.amount} {item.prize.symbol}</strong></span><span><small>SUBMISSIONS</small><strong>{item.submissionCount}</strong></span><span><small>DEADLINE</small><strong>{new Date(item.submissionDeadline).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</strong></span></div><div className="bounty-funding-proof"><i className={item.funding.fullyFunded?"funded":"pending"}>{item.funding.fullyFunded?<Check/>:<Clock3/>}</i><span><b>{item.funding.fullyFunded?"Prize locked on Arc":"Prize awaits Circle approval"}</b><code>{item.funding.merkleRoot?`${item.funding.merkleRoot.slice(0,18)}…`:"Commitment ready"}</code></span></div><footer><button onClick={()=>void navigator.clipboard.writeText(item.publicUrl)}><Share2/>Copy public link</button>{item.status==="awaiting_funding"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void fundExisting(item)}>{busy===`fund:${item.id}`?"Approve in Circle…":"Fund prize"} <ArrowRight/></Button>:item.status==="awarded"?<Button tone="ghost" disabled={Boolean(busy)} onClick={()=>void copyWinningClaim(item.id)}>Winner claim <Copy/></Button>:<Button tone="ghost" onClick={()=>setSelected(current=>current===item.id?null:item.id)}>{selected===item.id?"Close review":`Review ${item.submissionCount}`} <Eye/></Button>}</footer>{selected===item.id&&<div className="bounty-submissions"><div className="panel-head"><div><h4>Submission review</h4><p>Proof links open in a new tab. Contacts remain masked.</p></div><Status tone="cyan">{item.submissionCount} received</Status></div>{item.submissions?.map(submission=><article key={submission.id}><div className="submission-person"><i>{submission.displayName.slice(0,2).toUpperCase()}</i><span><b>{submission.displayName}</b><small>{submission.contactType} · {submission.maskedContact}</small></span><Status tone={submission.status==="awarded"?"green":submission.status==="rejected"?"grey":"cyan"}>{submission.status}</Status></div><p>{submission.workSummary}</p><div className="submission-proof"><a href={submission.workUrl} target="_blank" rel="noreferrer">Open proof <ArrowUpRight/></a><code>{submission.proofDigest.slice(0,20)}…</code></div>{!["awarded","rejected"].includes(submission.status)&&<footer><button disabled={Boolean(busy)} onClick={()=>void review(item.id,submission.id,"reject")}>Reject</button><button disabled={Boolean(busy)} onClick={()=>void review(item.id,submission.id,"shortlist")}>Shortlist</button><Button tone="blue" disabled={Boolean(busy)||!item.funding.fullyFunded} onClick={()=>void review(item.id,submission.id,"award")}>Award prize <Gift/></Button></footer>}</article>)}{!item.submissions?.length&&<div className="campaign-empty compact"><FileCheck2/><b>No work submitted yet</b><p>Share the public bounty link with your community.</p></div>}</div>}</article>)}</div>}
    {creating&&<div className="payroll-modal-shade"><section className="payroll-modal bounty-create-modal" role="dialog" aria-modal="true" aria-label="Create community bounty"><header><div><Eyebrow>NEW COMMUNITY BOUNTY</Eyebrow><h2>Lock the prize before asking for work.</h2><p>Current creates the public brief and an encrypted walletless winning claim in one flow.</p></div><button aria-label="Close" onClick={()=>setCreating(false)}><X/></button></header><div className="bounty-create-grid"><label className="wide">Bounty title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100}/></label><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option>Creative</option><option>Development</option><option>Community</option><option>Research</option><option>Translation</option><option>Security</option></select></label><label>Submission deadline<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label><label>Prize amount<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)}/></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="0x… or USDC"/></label><label className="wide">Work brief<textarea value={summary} onChange={event=>setSummary(event.target.value)} maxLength={2000}/></label></div><div className="bounty-create-proof"><Lock/><span><b>One prize. One private winning claim.</b><small>The prize campaign is funded now; the claim credential stays encrypted until you award a submission.</small></span></div><footer><span><ShieldCheck/><b>Refundable through campaign recovery if no award is made</b></span><Button tone="blue" disabled={Boolean(busy)||title.length<3||summary.length<30||!amount} onClick={()=>void create()}>{busy?"Approve & lock in Circle…":"Create & fund bounty"} <ArrowRight/></Button></footer></section></div>}
  </>;
}

function HostedBounty({go}:{go:(v:View)=>void}) {
  const [slug]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("bounty")??"");const [bounty,setBounty]=useState<PublicBounty|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [submitted,setSubmitted]=useState<{id:string;proofDigest:string}|null>(null);
  useProjectBrand(bounty?.project.brand);
  const [displayName,setDisplayName]=useState("");const [contactType,setContactType]=useState("email");const [contact,setContact]=useState("");const [workUrl,setWorkUrl]=useState("");const [workSummary,setWorkSummary]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{const task=window.setTimeout(()=>{if(!slug){setError("This bounty link is incomplete.");setLoading(false);return}currentApi.get<PublicBounty>(`/bounties/public?slug=${encodeURIComponent(slug)}`).then(setBounty).catch(reason=>setError(reason instanceof Error?reason.message:"This bounty is unavailable.")).finally(()=>setLoading(false))},0);return()=>window.clearTimeout(task)},[slug]);
  const submit=async()=>{setBusy(true);setError(null);try{setSubmitted(await currentApi.post<{id:string;proofDigest:string}>("/bounties/public",{slug,displayName,contactType,contact,workUrl,workSummary}));setBounty(current=>current?{...current,canSubmit:false,submissionCount:current.submissionCount+1}:current)}catch(reason){setError(reason instanceof Error?reason.message:"Your work could not be submitted.")}finally{setBusy(false)}};
  return <main className="hosted-bounty"><header><Brand onClick={()=>go("home")}/><span><TestTube2/>Arc testnet bounty</span></header>{loading&&<div className="hosted-bounty-loading"><RefreshCw className="spin"/><b>Verifying prize custody…</b></div>}{error&&!bounty&&<div className="hosted-bounty-error"><ShieldAlert/><h1>Bounty unavailable</h1><p>{error}</p><Button tone="dark" onClick={()=>go("home")}>Visit Current CoFi</Button></div>}{bounty&&<div className="hosted-bounty-shell"><section className="hosted-bounty-brief"><div className="bounty-public-project"><span>{bounty.project.name.slice(0,2).toUpperCase()}</span><div><small>PUBLISHED BY</small><b>{bounty.project.name}</b></div><Status tone={bounty.status==="open"?"green":bounty.status==="awarded"?"blue":"grey"}>{bounty.status}</Status></div><Eyebrow>{bounty.category.toUpperCase()} BOUNTY</Eyebrow><h1>{bounty.title}</h1><p>{bounty.summary}</p><div className="hosted-prize"><small>GUARANTEED PRIZE</small><strong>{bounty.prize.amount} <em>{bounty.prize.symbol}</em></strong><span><Lock/>Fully funded before submissions</span></div><div className="hosted-bounty-facts"><span><Clock3/><b>{new Date(bounty.submissionDeadline).toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</b><small>Submission deadline</small></span><span><Users/><b>{bounty.submissionCount}</b><small>Submissions</small></span><span><Network/><b>Arc testnet</b><small>Settlement network</small></span></div><div className="hosted-bounty-proof"><ShieldCheck/><div><b>{bounty.proof.fullyFunded?"Prize custody verified":"Prize awaiting funding"}</b><p>{bounty.proof.boundary}</p><code>{bounty.funding.merkleRoot?`${bounty.funding.merkleRoot.slice(0,26)}…`:"Arc commitment pending"}</code></div></div></section><aside className="hosted-bounty-submit">{submitted?<div className="bounty-submit-success"><CheckCircle2/><Eyebrow>SUBMISSION SEALED</Eyebrow><h2>Your work is in review.</h2><p>The project received a tamper-evident proof digest. If selected, they will send you a private Current claim link—no existing wallet required.</p><code>{submitted.proofDigest}</code><Button tone="dark" onClick={()=>go("home")}>Explore Current CoFi <ArrowRight/></Button></div>:bounty.canSubmit?<><Eyebrow>SUBMIT YOUR WORK</Eyebrow><h2>Enter the current.</h2><p>Your contact is encrypted. The project sees only a masked label during review.</p><label>Display name<input value={displayName} onChange={event=>setDisplayName(event.target.value)} placeholder="How the project should credit you"/></label><div className="bounty-contact-row"><label>Contact type<select value={contactType} onChange={event=>setContactType(event.target.value)}><option value="email">Email</option><option value="x">X account</option><option value="wallet">Wallet</option><option value="game">Game ID</option><option value="custom">Custom ID</option></select></label><label>Contact<input value={contact} onChange={event=>setContact(event.target.value)} placeholder={contactType==="email"?"you@example.com":"Your identity"}/></label></div><label>Public proof URL<input value={workUrl} onChange={event=>setWorkUrl(event.target.value)} placeholder="https://…"/></label><label>What did you make?<textarea value={workSummary} onChange={event=>setWorkSummary(event.target.value)} placeholder="Describe the work, decisions, and what the reviewer should inspect."/></label>{error&&<p className="auth-system-note is-error"><X/>{error}</p>}<Button tone="blue" disabled={busy||displayName.length<2||!contact||!workUrl||workSummary.length<30} onClick={()=>void submit()}>{busy?"Sealing proof…":"Submit verified work"} <ArrowRight/></Button><small className="bounty-privacy"><Lock/>Contact encrypted · one submission per identity</small></>:<div className="bounty-submit-success"><BadgeCheck/><Eyebrow>SUBMISSIONS CLOSED</Eyebrow><h2>{bounty.status==="awarded"?"A winner was selected.":"This bounty is in review."}</h2><p>The prize remains governed by the published Arc campaign state.</p><Button tone="dark" onClick={()=>go("home")}>Visit Current CoFi</Button></div>}</aside></div>}</main>;
}

function PublicMassDrops({go,auth}:{go:(v:View)=>void;auth:CircleAuth}){
  const [state,setState]=useState<PublicDropWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null);const [configuring,setConfiguring]=useState(false);const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState("Founding community current");const [description,setDescription]=useState("The first community members to enter receive a fully funded reward and a Current wallet—without gas or prior crypto setup.");const [claimAmount,setClaimAmount]=useState("25");const [maxClaims,setMaxClaims]=useState("100");const [expiresInHours,setExpiresInHours]=useState("168");const [tokenAddress,setTokenAddress]=useState("");const [requireAction,setRequireAction]=useState(true);const [actionEvent,setActionEvent]=useState("game.completed_3");const [actionLabel,setActionLabel]=useState("Complete 3 matches");const [actionDescription,setActionDescription]=useState("Finish three matches in the project before this reward can settle.");
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<PublicDropWorkspace>("/drops"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Public drops are unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const fund=async(distributionId:string,key:string)=>{setBusy(`fund:${key}`);const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"approve"});if(!approval.complete){if(!approval.challengeId)throw new Error("Circle did not return token approval.");await auth.executeChallenge(approval.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"approve"},approval.challengeId)}const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"deposit"});if(!deposit.complete){if(!deposit.challengeId)throw new Error("Circle did not return pool funding approval.");await auth.executeChallenge(deposit.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"deposit"},deposit.challengeId)}};
  const create=async()=>{setBusy("create");setError(null);try{const created=await currentApi.post<{id:string;campaign:CreatedCampaign}>("/drops",{title,description,claimAmount,maxClaims:Number(maxClaims),expiresInHours:Number(expiresInHours),tokenAddress:tokenAddress||undefined,claimCondition:requireAction?{eventType:actionEvent,label:actionLabel,description:actionDescription,proofWindowMinutes:60}:undefined});await fund(created.campaign.id,created.id);setCreating(false);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The public drop could not be created and funded.");await refresh()}finally{setBusy(null)}};
  const fundExisting=async(item:PublicDropRecord)=>{try{await fund(item.distributionId,item.id);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Drop funding failed.")}finally{setBusy(null)}};
  const totals=state?.totals;
  return <><PageHero eyebrow="PROOF-GATED MASS DROPS" title="Do not just airdrop. Activate." copy="Launch a fully funded USDC or project-token current, require a verifiable project action, and measure the people who become real users—not only claimants." mode="branches"><Button tone="cyan" onClick={()=>setConfiguring(true)}>New activation drop <Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Open drops" value={String(totals?.open??0)} icon={Radio}/><MetricCard label="Reserved rewards" value={String(totals?.reserved??0)} icon={Users}/><MetricCard label="Settled claims" value={String(totals?.claimed??0)} icon={BadgeCheck}/><MetricCard label="Attributed referrals" value={String(totals?.referrals??0)} icon={Network}/></div>
    <div className="drop-assurance"><ShieldCheck/><div><b>Committed first. Activated before settlement.</b><small>Every slot enters one Merkle root before opening. Optional wallet-bound proofs keep rewards locked until the project verifies the promised action.</small></div><Status tone="green">Signed proof gate</Status></div>
    {configuring&&<section className="drop-action-config"><header><Target/><div><b>Activation proof</b><small>Make this distribution reward a verified project action instead of an empty claim.</small></div><input aria-label="Require verified action" type="checkbox" checked={requireAction} onChange={event=>setRequireAction(event.target.checked)}/></header>{requireAction&&<div><label>Event type<input value={actionEvent} onChange={event=>setActionEvent(event.target.value)} placeholder="game.completed_3"/></label><label>Recipient-facing action<input value={actionLabel} onChange={event=>setActionLabel(event.target.value)} maxLength={80}/></label><label>Instructions<input value={actionDescription} onChange={event=>setActionDescription(event.target.value)} maxLength={240}/></label><p><ShieldCheck/>A scoped project key signs a wallet-bound proof. Current rejects missing, expired, reused, or mismatched proofs.</p></div>}<footer><button onClick={()=>setConfiguring(false)}>Cancel</button><Button tone="cyan" disabled={requireAction&&(actionEvent.length<3||actionLabel.length<3)} onClick={()=>{setConfiguring(false);setCreating(true)}}>Configure rewards <ArrowRight/></Button></footer></section>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Open your workspace to launch a mass drop</h3><p>Funding, private recipient identities, live capacity, referrals, and settlement evidence remain project-scoped.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reading public currents</b><small>Reconciling reward capacity, encrypted reservations, and Arc claims.</small></div></div>}
    {auth.account&&!loading&&!state?.drops.length&&<div className="campaign-empty"><Radio/><h3>Create the first activation current</h3><p>Set the verified action first, then commit the per-person reward, hard cap, and expiry.</p><Button tone="blue" onClick={()=>setConfiguring(true)}>Create activation drop <Plus/></Button></div>}
    {!!state?.drops.length&&<div className="drop-grid">{state.drops.map(item=><article className="data-panel drop-card" key={item.id}><header><Status tone={item.status==="open"?"green":item.status==="awaiting_funding"?"red":item.status==="full"?"blue":"grey"}>{item.status.replaceAll("_"," ")}</Status><code>{item.funding.merkleRoot?.slice(0,12)??"commit pending"}…</code></header><h3>{item.title}</h3><p>{item.description}</p><div className="drop-reward"><small>EACH VERIFIED RECIPIENT</small><strong>{item.reward.amount} <em>{item.reward.symbol}</em></strong><span>{item.funding.totalAmount} {item.reward.symbol} total pool</span></div><div className="drop-capacity"><i><b style={{width:`${item.capacity.percentReserved}%`}}/></i><div><span><strong>{item.capacity.reserved}</strong><small>reserved</small></span><span><strong>{item.capacity.claimed}</strong><small>claimed</small></span><span><strong>{item.capacity.remaining}</strong><small>remaining</small></span></div></div><footer><button onClick={()=>void navigator.clipboard.writeText(item.publicUrl)}><Share2/>Copy public link</button>{item.status==="awaiting_funding"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void fundExisting(item)}>Fund pool <ArrowRight/></Button>:<span><Clock3/>{item.expiresAt?new Date(item.expiresAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No expiry"}</span>}</footer></article>)}</div>}
    {creating&&<div className="payroll-modal-shade"><section className="payroll-modal drop-create-modal" role="dialog" aria-modal="true" aria-label="Create public mass drop"><header><div><Eyebrow>NEW OPEN CURRENT</Eyebrow><h2>Fund every reward before the first claim.</h2><p>Current commits the cap, reward, identities, referral path, expiry, and recovery rules.</p></div><button aria-label="Close" onClick={()=>setCreating(false)}><X/></button></header><div className="bounty-create-grid"><label className="wide">Public title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100}/></label><label>Reward per person<input inputMode="decimal" value={claimAmount} onChange={event=>setClaimAmount(event.target.value)}/></label><label>Maximum claims<input type="number" min="2" max="500" value={maxClaims} onChange={event=>setMaxClaims(event.target.value)}/></label><label>Open for<select value={expiresInHours} onChange={event=>setExpiresInHours(event.target.value)}><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="336">14 days</option><option value="720">30 days</option></select></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="0x… or USDC"/></label><label className="wide">Public description<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={1000}/></label></div><div className="bounty-create-proof"><Fingerprint/><span><b>{Number(claimAmount||0)*Number(maxClaims||0)} {tokenAddress?"project tokens":"USDC"} committed</b><small>{maxClaims||0} Merkle allocations · verified-email identity binding · gas-sponsored walletless claims · automatic expiry recovery.</small></span></div><footer><span><ShieldCheck/><b>One verified email, one reward</b></span><Button tone="blue" disabled={Boolean(busy)||title.length<3||description.length<12||Number(claimAmount)<=0||Number(maxClaims)<2||Number(maxClaims)>500} onClick={()=>void create()}>{busy?"Approving pool in Circle…":"Create & fund public drop"} <ArrowRight/></Button></footer></section></div>}
  </>;
}

function HostedPublicDrop({go}:{go:(v:View)=>void}){
  const [slug]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("drop")??"");const [referral]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("ref")??"");const [item,setItem]=useState<PublicDropRecord|null>(null);const [error,setError]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [displayName,setDisplayName]=useState("");const [email,setEmail]=useState("");const [reservation,setReservation]=useState<{claimUrl:string;referralUrl:string;maskedIdentity:string|null}|null>(null);
  useProjectBrand(item?.project.brand);
  useEffect(()=>{const task=window.setTimeout(()=>{if(!slug){setError("This public-drop link is incomplete.");setLoading(false);return}currentApi.get<PublicDropRecord>(`/drops/public?slug=${encodeURIComponent(slug)}`).then(setItem).catch(reason=>setError(reason instanceof Error?reason.message:"Public drop unavailable.")).finally(()=>setLoading(false))},0);return()=>window.clearTimeout(task)},[slug]);
  const reserve=async()=>{setBusy(true);setError(null);try{const result=await currentApi.post<{claimUrl:string;referralUrl:string;maskedIdentity:string|null}>("/drops/public",{slug,displayName,email,referredByCode:referral||undefined});setReservation(result);setItem(current=>current?{...current,canReserve:false,capacity:{...current.capacity,reserved:current.capacity.reserved+1,remaining:Math.max(0,current.capacity.remaining-1),percentReserved:Math.min(100,(current.capacity.reserved+1)/current.capacity.maximum*100)}}:current)}catch(reason){setError(reason instanceof Error?reason.message:"Your reward could not be reserved.")}finally{setBusy(false)}};
  return <main className="hosted-drop"><header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Committed on Arc testnet</span></header>{loading?<div className="hosted-bounty-loading"><RefreshCw className="spin"/><b>Verifying the reward current…</b></div>:error&&!item?<div className="hosted-bounty-error"><ShieldAlert/><h1>Public drop unavailable</h1><p>{error}</p></div>:item?<div className="hosted-drop-shell"><section><div className="bounty-public-project"><span>{item.project.name.slice(0,2).toUpperCase()}</span><div><small>PUBLISHED BY</small><b>{item.project.name}</b></div><Status tone={item.status==="open"?"green":item.status==="full"?"blue":"grey"}>{item.status.replaceAll("_"," ")}</Status></div><Eyebrow light>WALLETLESS FIRST-COME DROP</Eyebrow><h1>{item.title}</h1><p>{item.description}</p><div className="drop-public-reward"><small>YOUR REWARD</small><strong>{item.reward.amount} <em>{item.reward.symbol}</em></strong><span><Zap/>No wallet or gas required</span></div><div className="drop-public-meter"><div><b>{item.capacity.reserved} of {item.capacity.maximum}</b><span>{item.capacity.remaining} rewards remain</span></div><i><b style={{width:`${item.capacity.percentReserved}%`}}/></i></div><div className="giveaway-public-proof"><Fingerprint/><div><b>{item.funding.fullyFunded?"Every reward is already funded":"Pool funding is not complete"}</b><p>{item.proof.boundary}</p><code>{item.funding.merkleRoot??"Merkle commitment pending"}</code></div></div></section><aside>{reservation?<div className="drop-reserve-success"><CheckCircle2/><Eyebrow>REWARD RESERVED</Eyebrow><h2>Now create your funded wallet.</h2><p>{reservation.maskedIdentity} owns this allocation. Sign in with that email and Current will create the wallet before the claim settles.</p><Button tone="blue" onClick={()=>location.assign(reservation.claimUrl)}>Create wallet & claim <ArrowRight/></Button><button onClick={()=>void navigator.clipboard.writeText(reservation.referralUrl)}><Share2/>Copy your referral current</button></div>:item.canReserve?<><Eyebrow>RESERVE YOUR REWARD</Eyebrow><h2>Enter the current.</h2><p>Your email is encrypted and binds one reward to the Current wallet created during sign-in.</p>{referral&&<p className="giveaway-referral-note"><Network/>A community referral brought you here.</p>}<label>Display name<input value={displayName} onChange={event=>setDisplayName(event.target.value)} placeholder="How the project should know you"/></label><label>Email address<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label>{error&&<p className="auth-system-note is-error"><X/>{error}</p>}<Button tone="blue" disabled={busy||displayName.length<2||!email.includes("@")} onClick={()=>void reserve()}>{busy?"Securing your allocation…":"Reserve reward"} <ArrowRight/></Button><small className="bounty-privacy"><Lock/>Encrypted identity · one reward per verified email</small></>:<div className="drop-reserve-success"><BadgeCheck/><Eyebrow>CURRENT CLOSED</Eyebrow><h2>{item.status==="full"?"Every reward found a wallet.":"This drop is not accepting claims."}</h2><p>The published Merkle commitment and Arc settlement record remain independently verifiable.</p><Button tone="dark" onClick={()=>go("home")}>Explore Current CoFi</Button></div>}</aside></div>:null}</main>;
}

function CommunityGiveaways({go,auth}:{go:(v:View)=>void;auth:CircleAuth}){
  const [state,setState]=useState<GiveawayWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null);const [creating,setCreating]=useState(false);const [claimUrl,setClaimUrl]=useState<string|null>(null);
  const [title,setTitle]=useState("The first Current community drop");const [description,setDescription]=useState("Enter once, invite your community, and let a precommitted public draw select one walletless winner for the Arc launch current.");const [amount,setAmount]=useState("500");const [tokenAddress,setTokenAddress]=useState("");const [maxEntries,setMaxEntries]=useState("1000");const [deadline,setDeadline]=useState(()=>new Date(Date.now()+7*86_400_000).toISOString().slice(0,10));
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<GiveawayWorkspace>("/giveaways"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Giveaways are unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const fund=async(distributionId:string,key:string)=>{setBusy(`fund:${key}`);const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"approve"});if(!approval.complete){if(!approval.challengeId)throw new Error("Circle did not return token approval.");await auth.executeChallenge(approval.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"approve"},approval.challengeId)}const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"deposit"});if(!deposit.complete){if(!deposit.challengeId)throw new Error("Circle did not return prize funding approval.");await auth.executeChallenge(deposit.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"deposit"},deposit.challengeId)}};
  const create=async()=>{setBusy("create");setError(null);try{const created=await currentApi.post<{id:string;campaign:CreatedCampaign}>("/giveaways",{title,description,amount,tokenAddress:tokenAddress||undefined,maxEntries:Number(maxEntries),entryDeadline:new Date(`${deadline}T23:59:00Z`).toISOString()});await fund(created.campaign.id,created.id);setCreating(false);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The giveaway could not be created and funded.");await refresh()}finally{setBusy(null)}};
  const fundExisting=async(item:GiveawayRecord)=>{try{await fund(item.distributionId,item.id);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Prize funding failed.")}finally{setBusy(null)}};
  const draw=async(id:string)=>{setBusy(`draw:${id}`);setError(null);try{const result=await currentApi.post<{claimUrl:string}>("/giveaways",{action:"draw",giveawayId:id});setClaimUrl(result.claimUrl);await navigator.clipboard.writeText(result.claimUrl);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The winner could not be drawn.")}finally{setBusy(null)}};
  const copyWinner=async(id:string)=>{setBusy(`claim:${id}`);try{const result=await currentApi.post<{claimUrl:string}>("/giveaways",{action:"winning-claim",giveawayId:id});setClaimUrl(result.claimUrl);await navigator.clipboard.writeText(result.claimUrl)}catch(reason){setError(reason instanceof Error?reason.message:"The winner claim is unavailable.")}finally{setBusy(null)}};
  const totals=state?.totals;
  return <><PageHero eyebrow="VERIFIABLE GIVEAWAYS" title="Let the current choose." copy="Launch fully funded USDC or project-token giveaways with encrypted entries, referral attribution, precommitted randomness, and one walletless winner claim." mode="network"><Button tone="cyan" onClick={()=>setCreating(true)}>New giveaway <Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Live giveaways" value={String(totals?.open??0)} icon={Gift}/><MetricCard label="Encrypted entries" value={String(totals?.entries??0)} icon={Users}/><MetricCard label="Attributed referrals" value={String(totals?.referrals??0)} icon={Share2}/><MetricCard label="Proven draws" value={String(totals?.drawn??0)} icon={Fingerprint}/></div>
    <div className="giveaway-proof-strip"><ShieldCheck/><div><b>Commit first. Fund second. Reveal after entries close.</b><small>The committed random secret is bound into the campaign allocation before the prize reaches Arc.</small></div><Status tone="green">Reproducible draw</Status></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}{claimUrl&&<p className="bounty-claim-notice"><Gift/><span><b>Private winner claim copied</b><small>Send it only to the selected entrant. Their embedded wallet is created during claim.</small></span><button onClick={()=>void navigator.clipboard.writeText(claimUrl)}><Copy/>Copy again</button></p>}
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Open your workspace to launch giveaways</h3><p>Prize funding, encrypted entries, referrals, draw proof, and the winning link remain project-scoped.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Verifying giveaway currents</b><small>Reading funding, entry commitments, referrals, and public draw proof.</small></div></div>}
    {auth.account&&!loading&&!state?.giveaways.length&&<div className="campaign-empty"><Gift/><h3>No giveaway currents yet</h3><p>Commit a fair draw, fund its prize, and share one walletless entry page.</p><Button tone="blue" onClick={()=>setCreating(true)}>Create first giveaway <Plus/></Button></div>}
    {!!state?.giveaways.length&&<div className="giveaway-grid">{state.giveaways.map(item=><article className="data-panel giveaway-card" key={item.id}><header><Status tone={item.status==="open"?"green":item.status==="drawn"?"blue":item.status==="awaiting_funding"?"red":"cyan"}>{item.status.replaceAll("_"," ")}</Status><code>{item.proof.randomnessCommitment.slice(0,12)}…</code></header><h3>{item.title}</h3><p>{item.description}</p><div className="giveaway-numbers"><span><small>PRIZE</small><b>{item.prize.amount} {item.prize.symbol}</b></span><span><small>ENTRIES</small><b>{item.entryCount}/{item.maxEntries}</b></span><span><small>REFERRALS</small><b>{item.referrals}</b></span></div><div className="giveaway-commit"><Fingerprint/><span><b>{item.proof.deterministic?"Draw proof revealed":"Randomness precommitted"}</b><small>{item.proof.drawDigest?`${item.proof.drawDigest.slice(0,24)}…`:item.funding.fullyFunded?"Prize and commitment anchored on Arc":"Awaiting Arc prize funding"}</small></span></div>{item.winner&&<div className="giveaway-winner"><BadgeCheck/><span><small>SELECTED WINNER</small><b>{item.winner.displayName} · {item.winner.maskedIdentity}</b></span></div>}<footer><button onClick={()=>void navigator.clipboard.writeText(item.publicUrl)}><Share2/>Copy entry page</button>{item.status==="awaiting_funding"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void fundExisting(item)}>Fund prize <ArrowRight/></Button>:item.status==="ready_to_draw"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void draw(item.id)}>{busy===`draw:${item.id}`?"Revealing…":"Draw winner"} <Sparkles/></Button>:item.status==="drawn"?<Button tone="ghost" disabled={Boolean(busy)} onClick={()=>void copyWinner(item.id)}>Winner claim <Copy/></Button>:<span className="giveaway-deadline"><Clock3/>{new Date(item.entryDeadline).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>}</footer></article>)}</div>}
    {creating&&<div className="payroll-modal-shade"><section className="payroll-modal giveaway-create-modal" role="dialog" aria-modal="true" aria-label="Create verifiable giveaway"><header><div><Eyebrow>NEW GIVEAWAY CURRENT</Eyebrow><h2>Commit the draw before anyone enters.</h2><p>Current creates one funded winner allocation, encrypts the claim, and publishes the selection commitment.</p></div><button aria-label="Close" onClick={()=>setCreating(false)}><X/></button></header><div className="bounty-create-grid"><label className="wide">Giveaway title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100}/></label><label>Prize amount<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)}/></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="0x… or USDC"/></label><label>Entry deadline<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label><label>Maximum entries<input type="number" min="2" max="100000" value={maxEntries} onChange={event=>setMaxEntries(event.target.value)}/></label><label className="wide">Public description<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={1000}/></label></div><div className="bounty-create-proof"><Fingerprint/><span><b>Precommitted SHA-256 selection</b><small>The encrypted secret is committed before funding. The reveal, sorted entry set, draw digest, and winner become publicly reproducible.</small></span></div><footer><span><ShieldCheck/><b>One identity, one entry · private winner claim</b></span><Button tone="blue" disabled={Boolean(busy)||title.length<3||description.length<20||!amount||Number(maxEntries)<2} onClick={()=>void create()}>{busy?"Approve & lock in Circle…":"Create & fund giveaway"} <ArrowRight/></Button></footer></section></div>}
  </>;
}

function HostedGiveaway({go}:{go:(v:View)=>void}){
  const [slug]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("giveaway")??"");const [referral]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("ref")??"");const [item,setItem]=useState<PublicGiveaway|null>(null);const [error,setError]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [displayName,setDisplayName]=useState("");const [identityType,setIdentityType]=useState("email");const [identity,setIdentity]=useState("");const [entry,setEntry]=useState<{entryDigest:string;referralCode:string}|null>(null);
  useProjectBrand(item?.project.brand);
  useEffect(()=>{const task=window.setTimeout(()=>{if(!slug){setError("This giveaway link is incomplete.");setLoading(false);return}currentApi.get<PublicGiveaway>(`/giveaways/public?slug=${encodeURIComponent(slug)}`).then(setItem).catch(reason=>setError(reason instanceof Error?reason.message:"Giveaway unavailable.")).finally(()=>setLoading(false))},0);return()=>window.clearTimeout(task)},[slug]);
  const enter=async()=>{setBusy(true);setError(null);try{const result=await currentApi.post<{entryDigest:string;referralCode:string}>("/giveaways/public",{slug,displayName,identityType,identity,referredByCode:referral||undefined});setEntry(result);setItem(current=>current?{...current,canEnter:false,entryCount:current.entryCount+1}:current)}catch(reason){setError(reason instanceof Error?reason.message:"Entry failed.")}finally{setBusy(false)}};
  const referralUrl=entry&&typeof window!=="undefined"?`${window.location.origin}/?giveaway=${encodeURIComponent(slug)}&ref=${entry.referralCode}#/giveaway`:"";
  return <main className="hosted-giveaway"><header><Brand light onClick={()=>go("home")}/><span><Fingerprint/>Verifiable on Arc testnet</span></header>{loading?<div className="hosted-bounty-loading"><RefreshCw className="spin"/><b>Reading prize and draw commitment…</b></div>:error&&!item?<div className="hosted-bounty-error"><ShieldAlert/><h1>Giveaway unavailable</h1><p>{error}</p></div>:item?<div className="hosted-giveaway-shell"><section><div className="bounty-public-project"><span>{item.project.name.slice(0,2).toUpperCase()}</span><div><small>PUBLISHED BY</small><b>{item.project.name}</b></div><Status tone={item.status==="open"?"green":item.status==="drawn"?"blue":"grey"}>{item.status.replaceAll("_"," ")}</Status></div><Eyebrow light>WALLETLESS COMMUNITY DRAW</Eyebrow><h1>{item.title}</h1><p>{item.description}</p><div className="giveaway-prize"><small>ONE FULLY FUNDED PRIZE</small><strong>{item.prize.amount} <em>{item.prize.symbol}</em></strong><span><Lock/>{item.funding.fullyFunded?"Locked in Current’s Arc campaign vault":"Awaiting project funding"}</span></div><div className="hosted-giveaway-stats"><span><b>{item.entryCount.toLocaleString()}</b><small>encrypted entries</small></span><span><b>{item.referrals.toLocaleString()}</b><small>attributed referrals</small></span><span><b>{new Date(item.entryDeadline).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</b><small>entry deadline</small></span></div><div className="giveaway-public-proof"><Fingerprint/><div><b>{item.proof.deterministic?"Winner draw is reproducible":"Randomness committed before entry"}</b><p>{item.proof.boundary}</p><code>COMMIT · {item.proof.randomnessCommitment}</code>{item.proof.drawDigest&&<code>DRAW · {item.proof.drawDigest}</code>}</div></div>{item.winner&&<div className="public-winner"><BadgeCheck/><span><small>SELECTED WINNER</small><b>{item.winner.displayName} · {item.winner.maskedIdentity}</b></span></div>}</section><aside>{entry?<div className="giveaway-entry-success"><CheckCircle2/><Eyebrow>ENTRY COMMITTED</Eyebrow><h2>You’re in the current.</h2><p>Your identity is encrypted and your entry digest is part of the deterministic draw set.</p><code>{entry.entryDigest}</code><label>Your referral current<input readOnly value={referralUrl}/></label><Button tone="dark" onClick={()=>void navigator.clipboard.writeText(referralUrl)}>Copy referral link <Copy/></Button></div>:item.canEnter?<><Eyebrow>ENTER ONCE</Eyebrow><h2>No wallet required.</h2><p>Your identity prevents duplicate entries. It is encrypted and never appears on the public page.</p><label>Display name<input value={displayName} onChange={event=>setDisplayName(event.target.value)} placeholder="Public winner name"/></label><label>Identity type<select value={identityType} onChange={event=>setIdentityType(event.target.value)}><option value="email">Email</option><option value="x">X account</option><option value="wallet">Wallet</option><option value="game">Game ID</option><option value="custom">Other ID</option></select></label><label>Private identity<input value={identity} onChange={event=>setIdentity(event.target.value)} placeholder={identityType==="email"?"you@example.com":"Your unique identity"}/></label>{referral&&<p className="giveaway-referral-note"><Share2/>Referral attribution active</p>}{error&&<p className="auth-system-note is-error"><X/>{error}</p>}<Button tone="blue" disabled={busy||displayName.length<2||!identity} onClick={()=>void enter()}>{busy?"Encrypting entry…":"Enter giveaway"} <ArrowRight/></Button><small className="bounty-privacy"><Lock/>One entry per encrypted identity</small></>:<div className="giveaway-entry-success"><BadgeCheck/><Eyebrow>ENTRIES CLOSED</Eyebrow><h2>{item.status==="drawn"?"The current chose.":"The draw is being prepared."}</h2><p>{item.winner?`${item.winner.displayName} was selected through the published commitment and draw digest.`:"The precommitted secret will be revealed when the project draws the winner."}</p></div>}</aside></div>:null}</main>;
}

function LaunchVesting({go,auth}:{go:(v:View)=>void;auth:CircleAuth}){
  const [workspace,setWorkspace]=useState<VestingWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null);const [creating,setCreating]=useState(false);const [links,setLinks]=useState<Array<{displayName:string;maskedIdentity:string;url:string}>>([]);
  const [name,setName]=useState("Founding community allocation");const [description,setDescription]=useState("A transparent, identity-bound launch allocation that unlocks gradually for founding community contributors.");const [tokenAddress,setTokenAddress]=useState("");const [cliffAt,setCliffAt]=useState(()=>new Date(Date.now()+30*86_400_000).toISOString().slice(0,10));const [releaseCount,setReleaseCount]=useState(4);const [intervalDays,setIntervalDays]=useState(30);const [recipients,setRecipients]=useState([{displayName:"",identityType:"email",identity:"",totalAmount:""}]);
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setWorkspace(await currentApi.get<VestingWorkspace>("/vesting"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Launch vesting is unavailable.")}finally{setLoading(false)}},[auth.account]);useEffect(()=>{queueMicrotask(()=>void refresh())},[refresh]);
  const fund=async(distributionId:string,key:string)=>{setBusy(`fund:${key}`);const approval=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"approve"});if(!approval.complete){if(!approval.challengeId)throw new Error("Circle did not return token approval.");await auth.executeChallenge(approval.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"approve"},approval.challengeId)}const deposit=await currentApi.post<WalletActionResult>("/campaigns/fund",{distributionId,action:"deposit"});if(!deposit.complete){if(!deposit.challengeId)throw new Error("Circle did not return vesting funding approval.");await auth.executeChallenge(deposit.challengeId);await confirmWalletAction("/campaigns/fund",{distributionId,action:"deposit"},deposit.challengeId)}};
  const create=async()=>{setBusy("create");setError(null);try{const result=await currentApi.post<{id:string;campaign:CreatedCampaign;recipientLinks:Array<{displayName:string;maskedIdentity:string;url:string}>}>("/vesting",{name,description,tokenAddress:tokenAddress||undefined,cliffAt:new Date(`${cliffAt}T12:00:00Z`).toISOString(),releaseCount,intervalDays,recipients});setLinks(result.recipientLinks);await fund(result.campaign.id,result.id);setCreating(false);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The vesting batch could not be created and funded.");await refresh()}finally{setBusy(null)}};
  const fundExisting=async(batch:VestingBatch)=>{try{await fund(batch.distributionId,batch.id);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Vesting funding failed.")}finally{setBusy(null)}};
  const updateRecipient=(index:number,key:string,value:string)=>setRecipients(current=>current.map((recipient,position)=>position===index?{...recipient,[key]:value}:recipient));const totals=workspace?.totals;
  return <><PageHero eyebrow="WALLETLESS LAUNCH VESTING" title="Commit the allocation. Earn the unlock." copy="Create fully funded USDC or project-token launch allocations with encrypted identities, public schedules, authorizer-enforced cliffs, and gas-sponsored walletless tranche claims." mode="branches"><Button tone="cyan" onClick={()=>setCreating(true)}>New vesting batch <Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Vesting batches" value={String(totals?.batches??0)} icon={Layers3}/><MetricCard label="Recipients" value={String(totals?.recipients??0)} icon={Users}/><MetricCard label="Committed tranches" value={String(totals?.tranches??0)} icon={Clock3}/><MetricCard label="Claims settled" value={String(totals?.claimed??0)} icon={CheckCircle2}/></div>
    <div className="vesting-assurance"><ShieldCheck/><div><b>Funded first. Time enforced at authorization.</b><small>Every tranche is committed in the campaign Merkle root; Current refuses to authorize its Arc settlement before the published unlock.</small></div><Status tone="green">Identity-bound</Status></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}{links.length>0&&<section className="vesting-link-notice"><Gift/><div><b>{links.length} private recipient {links.length===1?"link":"links"} ready</b><small>Copy these into your secure launch communications. They are never shown on the public proof page.</small></div><button onClick={()=>void navigator.clipboard.writeText(links.map(item=>`${item.displayName}: ${item.url}`).join("\n"))}><Copy/>Copy all</button></section>}
    {!auth.account?<div className="campaign-empty"><Lock/><h3>Open your workspace to create launch vesting</h3><p>Recipient identities, private schedule links, funding, and unlock activity remain project-scoped.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>:loading?<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling vesting currents</b><small>Reading Merkle commitments, unlock clocks, and Arc claim receipts.</small></div></div>:!workspace?.batches.length?<div className="campaign-empty"><Clock3/><h3>No launch allocations yet</h3><p>Create a cliff, split each allocation into tranches, then fully fund the complete schedule on Arc.</p><Button tone="blue" onClick={()=>setCreating(true)}>Create first vesting batch <Plus/></Button></div>:<div className="vesting-grid">{workspace.batches.map(batch=><article className="data-panel vesting-card" key={batch.id}><header><Status tone={batch.status==="completed"?"green":batch.status==="claimable"?"blue":batch.status==="awaiting_funding"?"red":"cyan"}>{batch.status.replaceAll("_"," ")}</Status><code>{batch.funding.merkleRoot?`${batch.funding.merkleRoot.slice(0,14)}…`:"Commitment ready"}</code></header><h3>{batch.name}</h3><p>{batch.description}</p><div className="vesting-total"><span><small>TOTAL ALLOCATION</small><strong>{batch.totals.amount} {batch.asset.symbol}</strong></span><i>{batch.totals.claimed}/{batch.totals.tranches}<small> claimed</small></i></div><div className="vesting-timeline"><span className="active"/><span/><span/><span/><small>CLIFF · {new Date(batch.cliffAt).toLocaleDateString()}</small><small>FINAL · {new Date(batch.lastUnlockAt).toLocaleDateString()}</small></div><div className="vesting-recipients">{batch.schedules.slice(0,4).map(schedule=><div key={schedule.id}><i>{schedule.displayName.slice(0,2).toUpperCase()}</i><span><b>{schedule.displayName}</b><small>{schedule.maskedIdentity} · {schedule.claimed}/{batch.releaseCount} claimed</small></span><strong>{schedule.totalAmount} {batch.asset.symbol}</strong>{schedule.recipientUrl&&<button aria-label="Copy private schedule" onClick={()=>void navigator.clipboard.writeText(schedule.recipientUrl!)}><Copy/></button>}</div>)}</div><footer><button onClick={()=>void navigator.clipboard.writeText(batch.publicProofUrl)}><Share2/>Public proof</button>{batch.status==="awaiting_funding"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void fundExisting(batch)}>Fund all tranches <ArrowRight/></Button>:<span><Clock3/>{batch.releaseCount} releases · every {batch.intervalDays}d</span>}</footer></article>)}</div>}
    {creating&&<div className="payroll-modal-shade"><section className="payroll-modal vesting-modal" role="dialog" aria-modal="true" aria-label="Create launch vesting"><header><div><Eyebrow>NEW LAUNCH VESTING</Eyebrow><h2>Turn promises into a published unlock current.</h2><p>Each recipient receives one private schedule with identity-bound tranche claims.</p></div><button aria-label="Close" onClick={()=>setCreating(false)}><X/></button></header><div className="bounty-create-grid"><label className="wide">Batch name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={e=>setTokenAddress(e.target.value)} placeholder="0x… or USDC"/></label><label>First unlock<input type="date" value={cliffAt} onChange={e=>setCliffAt(e.target.value)}/></label><label>Release count<select value={releaseCount} onChange={e=>setReleaseCount(Number(e.target.value))}>{[2,3,4,6,12,24].map(value=><option value={value} key={value}>{value} tranches</option>)}</select></label><label>Release interval<select value={intervalDays} onChange={e=>setIntervalDays(Number(e.target.value))}>{[7,14,30,60,90].map(value=><option value={value} key={value}>Every {value} days</option>)}</select></label><label className="wide">Public schedule description<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label></div><div className="payroll-member-head"><div><b>Launch recipients</b><small>Total allocation is split evenly; the final tranche receives any remainder.</small></div><button onClick={()=>setRecipients(current=>[...current,{displayName:"",identityType:"email",identity:"",totalAmount:""}])}><Plus/>Add recipient</button></div><div className="vesting-recipient-form">{recipients.map((recipient,index)=><div key={index}><input aria-label="Recipient name" value={recipient.displayName} onChange={e=>updateRecipient(index,"displayName",e.target.value)} placeholder="Display name"/><select aria-label="Identity type" value={recipient.identityType} onChange={e=>updateRecipient(index,"identityType",e.target.value)}><option value="email">Email</option><option value="wallet">Wallet</option><option value="x">X account</option><option value="game">Game ID</option><option value="custom">Custom</option></select><input aria-label="Recipient identity" value={recipient.identity} onChange={e=>updateRecipient(index,"identity",e.target.value)} placeholder="Private identity"/><input aria-label="Total allocation" value={recipient.totalAmount} onChange={e=>updateRecipient(index,"totalAmount",e.target.value)} placeholder="Total amount"/><button aria-label="Remove recipient" disabled={recipients.length===1} onClick={()=>setRecipients(current=>current.filter((_,position)=>position!==index))}><X/></button></div>)}</div><div className="bounty-create-proof"><Clock3/><span><b>{releaseCount} authorizer-enforced unlocks</b><small>First unlock {new Date(`${cliffAt}T12:00:00`).toLocaleDateString()}, then every {intervalDays} days. Funding covers every tranche up front.</small></span></div><footer><span><ShieldCheck/><b>Encrypted identities · private recipient schedules</b></span><Button tone="blue" disabled={Boolean(busy)||name.length<3||description.length<20||recipients.some(r=>r.displayName.length<2||!r.identity||!r.totalAmount)} onClick={()=>void create()}>{busy?"Approve & lock in Circle…":"Create & fund vesting"}<ArrowRight/></Button></footer></section></div>}
  </>;
}

function HostedVesting({go}:{go:(v:View)=>void}){
  const params=useMemo(()=>new URLSearchParams(location.search),[]);const schedule=params.get("vesting")??"";const access=params.get("access")??"";const proofSlug=params.get("vestingProof")??"";const [data,setData]=useState<PublicVesting|null>(null);const [proof,setProof]=useState<VestingBatch|null>(null);const [error,setError]=useState<string|null>(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{const path=proofSlug?`/vesting/public?slug=${encodeURIComponent(proofSlug)}`:`/vesting/public?schedule=${encodeURIComponent(schedule)}&access=${encodeURIComponent(access)}`;currentApi.get<PublicVesting|VestingBatch>(path).then(value=>{if(proofSlug)setProof(value as VestingBatch);else setData(value as PublicVesting)}).catch(reason=>setError(reason instanceof Error?reason.message:"Vesting schedule unavailable.")).finally(()=>setLoading(false))},[access,proofSlug,schedule]);
  return <main className="hosted-vesting"><header><Brand light onClick={()=>go("home")}/><span><Clock3/>Time-locked on Arc testnet</span></header>{loading?<div className="hosted-bounty-loading"><RefreshCw className="spin"/><b>Reading the allocation current…</b></div>:error?<div className="hosted-bounty-error"><ShieldAlert/><h1>Vesting unavailable</h1><p>{error}</p></div>:proof?<div className="vesting-proof-public"><section><Eyebrow light>PUBLIC LAUNCH ALLOCATION PROOF</Eyebrow><h1>{proof.name}</h1><p>{proof.description}</p><div className="public-vesting-metrics"><span><strong>{proof.totals.amount}</strong><small>{proof.asset.symbol} committed</small></span><span><strong>{proof.totals.recipients}</strong><small>masked recipients</small></span><span><strong>{proof.totals.tranches}</strong><small>Merkle tranches</small></span></div><div className="giveaway-public-proof"><ShieldCheck/><div><b>{proof.funding.fullyFunded?"Complete allocation funded":"Awaiting Arc funding"}</b><p>Recipient identities and private schedule links are excluded. The Merkle root commits every amount before claims begin.</p><code>{proof.funding.merkleRoot??"Merkle commitment pending"}</code></div></div></section><aside><h2>Published schedule</h2><p>First unlock {new Date(proof.cliffAt).toLocaleDateString()}, followed by {proof.releaseCount-1} releases every {proof.intervalDays} days.</p>{proof.schedules.map(schedule=><div className="public-vesting-recipient" key={schedule.id}><i>{schedule.displayName.slice(0,2).toUpperCase()}</i><span><b>{schedule.displayName}</b><small>{schedule.maskedIdentity}</small></span><strong>{schedule.totalAmount} {proof.asset.symbol}</strong></div>)}</aside></div>:data?<div className="hosted-vesting-shell"><section><Eyebrow light>PRIVATE WALLETLESS ALLOCATION</Eyebrow><h1>{data.batch.name}</h1><p>{data.batch.description}</p><div className="vesting-recipient-hero"><span>{data.recipient.displayName.slice(0,2).toUpperCase()}</span><div><small>ALLOCATED TO</small><b>{data.recipient.displayName}</b><em>{data.recipient.maskedIdentity}</em></div></div><div className="giveaway-prize"><small>TOTAL ALLOCATION</small><strong>{data.totalAmount} <em>{data.asset.symbol}</em></strong><span><Lock/>{data.funding.fullyFunded?"Fully funded in Current’s campaign vault":"Awaiting project funding"}</span></div><div className="giveaway-public-proof"><Fingerprint/><div><b>{data.proof.method}</b><p>{data.proof.boundary}</p><code>{data.proof.merkleRoot??"Merkle root pending"}</code></div></div></section><aside><Eyebrow>YOUR RELEASE CURRENT</Eyebrow><h2>{data.claimedAmount} of {data.totalAmount} claimed</h2><div className="public-tranche-list">{data.tranches.map(tranche=><article className={tranche.status} key={tranche.id}><span>{tranche.status==="claimed"?<Check/>:tranche.status==="claimable"?<Zap/>:<Lock/>}</span><div><b>Release {tranche.position}</b><small>{new Date(tranche.unlockAt).toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</small></div><strong>{tranche.amount} {data.asset.symbol}</strong>{tranche.claimUrl?<a href={tranche.claimUrl}>Claim <ArrowRight/></a>:<Status tone={tranche.status==="claimed"?"green":"grey"}>{tranche.status.replaceAll("_"," ")}</Status>}</article>)}</div><small className="bounty-privacy"><ShieldCheck/>No seed phrase · gas sponsored when claimable</small></aside></div>:null}</main>;
}

function CommunityTreasury({go,auth}:{go:(v:View)=>void;auth:CircleAuth}){
  const [data,setData]=useState<TreasuryWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [panel,setPanel]=useState<"setup"|"budget"|"proposal"|null>(null);const [busy,setBusy]=useState<string|null>(null);
  const [name,setName]=useState("Tidebreak Community Treasury");const [description,setDescription]=useState("Transparent budgets and verifiable contributor spending for our Arc community.");
  const [category,setCategory]=useState("Community growth");const [limit,setLimit]=useState("5000");const [tokenAddress,setTokenAddress]=useState("");
  const [title,setTitle]=useState("Fund the community launch film");const [proposalDescription,setProposalDescription]=useState("Commission and deliver the launch film, source files, and social cutdowns for the community rollout.");const [recipient,setRecipient]=useState("");const [amount,setAmount]=useState("500");const [proofUrl,setProofUrl]=useState("");const [budgetId,setBudgetId]=useState("");
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setData(await currentApi.get<TreasuryWorkspace>("/treasury"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Treasury is unavailable.")}finally{setLoading(false)}},[auth.account]);useEffect(()=>{queueMicrotask(()=>void refresh())},[refresh]);
  const submit=async()=>{if(!auth.account)return;setBusy(panel);setError(null);try{if(panel==="setup")await currentApi.post("/treasury",{action:"setup",name,description});if(panel==="budget")await currentApi.post("/treasury",{action:"budget",treasuryId:data?.treasury?.id,category,limit,tokenAddress:tokenAddress||undefined,periodStart:new Date().toISOString(),periodEnd:new Date(Date.now()+90*86_400_000).toISOString()});if(panel==="proposal")await currentApi.post("/treasury",{action:"proposal",treasuryId:data?.treasury?.id,budgetId:budgetId||undefined,title,description:proposalDescription,category,recipientAddress:recipient,amount,tokenAddress:tokenAddress||undefined,proofUrl:proofUrl||undefined});setPanel(null);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Treasury action failed.")}finally{setBusy(null)}};
  const decide=async(proposalId:string,action:"approve"|"reject")=>{setBusy(`${action}:${proposalId}`);try{await currentApi.post("/treasury",{action,proposalId});await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Proposal review failed.")}finally{setBusy(null)}};
  const execute=async(proposalId:string)=>{setBusy(`execute:${proposalId}`);setError(null);try{const started=await currentApi.post<WalletActionResult&{transferId?:string}>("/treasury",{action:"execute",proposalId});if(!started.complete){if(!started.challengeId||!started.transferId)throw new Error("Circle did not return the treasury approval.");await auth.executeChallenge(started.challengeId);await confirmWalletAction("/treasury",{action:"execute",proposalId,transferId:started.transferId},started.challengeId)}await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"Treasury payment failed.")}finally{setBusy(null)}};
  const totals=data?.totals??{proposals:0,pending:0,executed:0,categories:0};
  return <><PageHero eyebrow="COMMUNITY TREASURY" title="Make every promise traceable." copy="Publish budgets, approve spending, and settle community work from a Circle wallet with public Arc receipts." mode="branches"><Button tone="cyan" onClick={()=>setPanel(data?.treasury?"proposal":"setup")}>{data?.treasury?"New proposal":"Create treasury"}<Plus/></Button></PageHero>
    <div className="campaign-summary-grid"><MetricCard label="Treasury assets" value={String(data?.balances.length??0)} icon={Wallet}/><MetricCard label="Published budgets" value={String(data?.budgets.length??0)} icon={Layers3}/><MetricCard label="Open proposals" value={String(totals.pending)} icon={FileCheck2}/><MetricCard label="Executed payments" value={String(totals.executed)} icon={BadgeCheck}/></div>
    <section className="treasury-assurance"><ShieldCheck/><div><b>Non-custodial by design</b><p>Current organizes approvals and evidence. The configured Circle wallet signs every payment directly.</p></div><Status tone="green">Public Arc proof</Status></section>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}{!auth.account?<div className="campaign-empty"><Lock/><h3>Open your workspace to manage a treasury</h3><p>Only authorized project members can publish budgets or prepare payments.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>:loading?<div className="campaign-empty"><RefreshCw className="spin"/><b>Reading treasury records…</b></div>:!data?.treasury?<div className="campaign-empty"><CircleDollarSign/><h3>Create a transparent community fund</h3><p>Use your existing Circle wallet—Current never takes custody of the balance.</p><Button tone="blue" onClick={()=>setPanel("setup")}>Configure treasury <ArrowRight/></Button></div>:<>
      <section className="data-panel treasury-overview"><div><Eyebrow>PUBLIC TREASURY</Eyebrow><h2>{data.treasury.name}</h2><p>{data.treasury.description}</p><code>{data.treasury.address}</code></div><div className="treasury-balances">{data.balances.length?data.balances.map(balance=><span key={balance.address}><small>{balance.symbol} BALANCE</small><strong>{balance.amount??"RPC unavailable"}</strong></span>):<span><small>ASSET BALANCES</small><strong>Appear after first budget</strong></span>}</div><Button tone="ghost" onClick={()=>void navigator.clipboard.writeText(data.treasury!.publicUrl)}>Copy public page <Share2/></Button></section>
      <div className="treasury-columns"><section className="data-panel"><div className="panel-head"><div><h3>Category budgets</h3><p>Committed spending cannot exceed its published ceiling.</p></div><button onClick={()=>setPanel("budget")}><Plus/>New budget</button></div><div className="treasury-budget-list">{data.budgets.map(budget=>{const pct=Math.min(100,Number(budget.committed)/Math.max(Number(budget.limit),1)*100);return <article key={budget.id}><div><b>{budget.category}</b><Status tone="cyan">{budget.asset}</Status></div><strong>{budget.remaining}<small> remaining of {budget.limit}</small></strong><i><span style={{width:`${pct}%`}}/></i><footer><span>{budget.committed} committed</span><span>{budget.spent} settled</span></footer></article>})}{!data.budgets.length&&<div className="campaign-empty compact"><Layers3/><b>No category budgets</b><p>Publish the first spending ceiling.</p></div>}</div></section>
      <section className="data-panel"><div className="panel-head"><div><h3>Spending proposals</h3><p>Purpose, approval, and settlement stay connected.</p></div><Status tone="blue">{totals.proposals} total</Status></div><div className="treasury-proposal-list">{data.proposals.map(proposal=><article key={proposal.id}><header><span><b>{proposal.title}</b><small>{proposal.category}</small></span><Status tone={proposal.status==="executed"?"green":proposal.status==="rejected"?"grey":proposal.status==="approved"?"blue":"cyan"}>{proposal.status}</Status></header><p>{proposal.description}</p><div><strong>{proposal.amount} {proposal.asset.symbol}</strong><code>{proposal.recipientAddress.slice(0,9)}…{proposal.recipientAddress.slice(-6)}</code></div>{proposal.explorerUrl?<a href={proposal.explorerUrl} target="_blank" rel="noreferrer">View Arc receipt <ArrowUpRight/></a>:proposal.status==="pending"?<footer><button disabled={Boolean(busy)} onClick={()=>void decide(proposal.id,"reject")}>Reject</button><Button tone="blue" disabled={Boolean(busy)} onClick={()=>void decide(proposal.id,"approve")}>Approve <Check/></Button></footer>:proposal.status==="approved"?<Button tone="blue" disabled={Boolean(busy)} onClick={()=>void execute(proposal.id)}>{busy===`execute:${proposal.id}`?"Opening Circle…":"Execute payment"}<ArrowRight/></Button>:null}</article>)}{!data.proposals.length&&<div className="campaign-empty compact"><FileCheck2/><b>No spending proposals</b><p>Create one against a published budget.</p></div>}</div></section></div>
    </>}
    {panel&&<div className="payroll-modal-shade"><section className="payroll-modal treasury-modal" role="dialog" aria-modal="true"><header><div><Eyebrow>{panel==="setup"?"CREATE TREASURY":panel==="budget"?"PUBLISH BUDGET":"NEW PROPOSAL"}</Eyebrow><h2>{panel==="setup"?"Give the community a window into spending.":panel==="budget"?"Set a ceiling before money moves.":"Connect purpose, approval, and payment."}</h2></div><button aria-label="Close" onClick={()=>setPanel(null)}><X/></button></header>{panel==="setup"?<div className="payroll-form-grid"><label>Treasury name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label></div>:panel==="budget"?<div className="payroll-form-grid"><label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label><label>Budget limit<input value={limit} onChange={e=>setLimit(e.target.value)} inputMode="decimal"/></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={e=>setTokenAddress(e.target.value)} placeholder="0x… or USDC"/></label><label>Period<small>90 days from today</small><input value="Quarterly operating window" disabled/></label></div>:<div className="payroll-form-grid"><label>Proposal title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Budget<select value={budgetId} onChange={e=>{setBudgetId(e.target.value);const found=data?.budgets.find(b=>b.id===e.target.value);if(found)setCategory(found.category)}}><option value="">No category budget</option>{data?.budgets.map(b=><option key={b.id} value={b.id}>{b.category} · {b.remaining} {b.asset} remaining</option>)}</select></label><label>Recipient Arc wallet<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x…"/></label><label>Amount<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><label>Project token <small>(blank = USDC)</small><input value={tokenAddress} onChange={e=>setTokenAddress(e.target.value)} placeholder="0x… or USDC"/></label><label>Public supporting proof <small>(optional)</small><input value={proofUrl} onChange={e=>setProofUrl(e.target.value)} placeholder="https://…"/></label><label className="treasury-wide">Purpose<textarea value={proposalDescription} onChange={e=>setProposalDescription(e.target.value)}/></label></div>}<footer><div><ShieldCheck/><span><b>Circle wallet authority</b><small>Creating records never moves funds.</small></span></div><Button tone="blue" disabled={Boolean(busy)} onClick={()=>void submit()}>{busy?"Saving proof…":panel==="setup"?"Create treasury":panel==="budget"?"Publish budget":"Submit proposal"}<ArrowRight/></Button></footer></section></div>}
  </>;
}

function PublicTreasury({go}:{go:(v:View)=>void}){
  const slug=useMemo(()=>new URLSearchParams(location.search).get("treasury")??"",[]);const [data,setData]=useState<TreasuryWorkspace|null>(null);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;if(!slug){setError("This treasury link is incomplete.");return}currentApi.get<TreasuryWorkspace>(`/treasury/public?slug=${encodeURIComponent(slug)}`).then(value=>{if(active)setData(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Treasury unavailable.")})});return()=>{active=false}},[slug]);
  return <main className="public-treasury"><header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Transparent on Arc testnet</span></header>{error?<div className="hosted-bounty-error"><ShieldAlert/><h1>Treasury unavailable</h1><p>{error}</p></div>:!data?<div className="hosted-bounty-loading"><RefreshCw className="spin"/><b>Reading public treasury proof…</b></div>:<div className="public-treasury-shell"><section><Eyebrow light>COMMUNITY FINANCE</Eyebrow><h1>{data.treasury?.name}</h1><p>{data.treasury?.description}</p><div className="public-treasury-metrics"><span><strong>{data.budgets.length}</strong><small>Published budgets</small></span><span><strong>{data.totals.executed}</strong><small>Executed payments</small></span><span><strong>{data.totals.pending}</strong><small>Open proposals</small></span></div><div className="public-treasury-address"><Wallet/><span><small>TREASURY</small><code>{data.treasury?.address}</code></span></div></section><aside><h2>Where the current flows</h2>{data.budgets.map(b=><div className="public-budget" key={b.id}><header><b>{b.category}</b><span>{b.asset}</span></header><strong>{b.spent}<small> spent / {b.limit}</small></strong><i><span style={{width:`${Math.min(100,Number(b.spent)/Math.max(Number(b.limit),1)*100)}%`}}/></i></div>)}<h2>Recent decisions</h2>{data.proposals.slice(0,8).map(p=><article className="public-proposal" key={p.id}><div><Status tone={p.status==="executed"?"green":"cyan"}>{p.status}</Status><small>{p.category}</small></div><h3>{p.title}</h3><p>{p.description}</p><footer><b>{p.amount} {p.asset.symbol}</b>{p.explorerUrl?<a href={p.explorerUrl} target="_blank" rel="noreferrer">Arc receipt <ArrowUpRight/></a>:<span>{p.approvalCount}/{p.approvalsRequired} approvals</span>}</footer></article>)}</aside></div>}</main>;
}

function CampaignBuilder({go,auth}:{go:(v:View)=>void;auth:CircleAuth}) {
  const [step,setStep]=useState(1); const [mode,setMode]=useState("Allowlist");
  const [maxStep,setMaxStep]=useState(1);
  const [purpose,setPurpose]=useState("User acquisition");
  const [name,setName]=useState("Founding community current");
  const [tokenAddress,setTokenAddress]=useState("");
  const [inspectedToken,setInspectedToken]=useState<InspectedToken|null>(null);
  const [inspectingToken,setInspectingToken]=useState(false);
  const [defaultAmount,setDefaultAmount]=useState("25");
  const [csvText,setCsvText]=useState("");
  const [activationEvent,setActivationEvent]=useState("account.created");
  const [activationUrl,setActivationUrl]=useState("");
  const [activationLabel,setActivationLabel]=useState("Continue to project");
  const [requireClaimCondition,setRequireClaimCondition]=useState(false);
  const [claimConditionEvent,setClaimConditionEvent]=useState("game.completed_3");
  const [claimConditionDescription,setClaimConditionDescription]=useState("Complete the required project action to unlock this reward.");
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
  const inspectCampaignToken=async()=>{
    if(!tokenAddress.trim()){setInspectedToken(null);return}
    if(!auth.account){go("claim");return}
    setInspectingToken(true);setError(null);setInspectedToken(null);
    try{setInspectedToken(await currentApi.post<InspectedToken>("/tokens/inspect",{address:tokenAddress}))}
    catch(reason){setError(reason instanceof Error?reason.message:"This Arc token could not be inspected.")}
    finally{setInspectingToken(false)}
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
      if(step===2&&tokenAddress.trim()&&!inspectedToken){setError("Inspect the project token contract before continuing.");return}
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
        activationDestination:activationUrl.trim()?{url:activationUrl.trim(),label:activationLabel.trim()||"Continue to project"}:undefined,
        claimCondition:requireClaimCondition?{
          eventType:claimConditionEvent,
          label:claimConditionEvent==="game.completed_3"?"Complete 3 matches":claimConditionEvent==="purchase.completed"?"Complete your first purchase":claimConditionEvent==="event.attended"?"Verify event attendance":claimConditionEvent==="referral.qualified"?"Refer a qualified user":"Complete the project action",
          description:claimConditionDescription,
          proofWindowMinutes:60,
        }:undefined,
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
        {step===2&&<div className="field-grid"><label className="full">Arc token contract<div className="token-address-row"><input value={tokenAddress} onChange={event=>{setTokenAddress(event.target.value);setInspectedToken(null)}} placeholder="Leave blank for Arc testnet USDC"/><button type="button" onClick={()=>void inspectCampaignToken()} disabled={inspectingToken||!tokenAddress.trim()}>{inspectingToken?<RefreshCw className="spin"/>:<Search/>}{inspectingToken?"Inspecting…":"Inspect contract"}</button></div></label>{inspectedToken?<div className="full"><TokenTrustPanel token={inspectedToken}/></div>:null}<label>Default reward per recipient<input value={defaultAmount} onChange={event=>setDefaultAmount(event.target.value)} inputMode="decimal"/></label><label>Expiration<select><option>7 days</option></select></label><p className="builder-note full"><ShieldCheck/>Current records reproducible contract observations before funding. These signals are not an audit or endorsement.</p></div>}
        {step===3&&<><div className="mode-tabs">{["Allowlist","Identity-bound"].map(x=><button type="button" className={mode===x?"active":""} onClick={()=>{setMode(x);setError(null)}} key={x}>{x}</button>)}</div><div className={`identity-mode-proof ${mode==="Identity-bound"?"active":""}`}><ShieldCheck/><div><b>{mode==="Identity-bound"?"The recipient must prove the assignment":"The private link is the claim credential"}</b><small>{mode==="Identity-bound"?"Email and wallet commitments are verified natively. X, game, and custom identities use a project-signed verifier attestation bound to the recipient wallet. A leaked link cannot redirect the reward.":"Any supported identity type can receive a private, single-use link."}</small></div></div><label className="upload-drop"><Upload/><h3>Drop a recipient CSV</h3><p>Columns: identity, identity_type, amount. Email, wallet, X, game, and custom IDs are accepted.</p><span className="cofi-button tone-ghost">Browse file</span><input type="file" accept=".csv,text/csv" onChange={event=>void upload(event.target.files?.[0]??null)}/></label><label className="csv-paste">Or paste recipient rows<textarea value={csvText} onChange={event=>setCsvText(event.target.value)} placeholder={"identity,identity_type,amount\nmember@example.com,email,25\n@playerone,x,50"}/></label><div className={`recipient-validation ${recipients.length?"valid":""}`}><CheckCircle2/><div><b>{recipients.length.toLocaleString()} valid recipients</b><small>{total.toLocaleString(undefined,{maximumFractionDigits:6})} total units will be fully funded</small></div></div></>}
        {step===4&&<div className="activation-builder"><label><span>Activation event</span><select value={activationEvent} onChange={event=>setActivationEvent(event.target.value)}><option value="account.created">Created embedded wallet</option><option value="project.onboarded">Completed project onboarding</option><option value="game.completed_3">Played 3 matches</option><option value="purchase.completed">Made first purchase</option><option value="custom.signed">Custom signed event</option></select></label><label><span>Referral reward</span><select value={referralReward} onChange={event=>setReferralReward(event.target.value)}><option>No referral reward</option><option>5 USDC per activated referral</option><option>Project token reward</option></select></label><label className="condition-toggle"><span><b>Gate settlement with verified proof</b><small>Require a project-signed action before the recipient can claim.</small></span><input type="checkbox" checked={requireClaimCondition} onChange={event=>setRequireClaimCondition(event.target.checked)}/></label>{requireClaimCondition&&<div className="condition-gate-builder"><Target/><div><label><span>Required action</span><select value={claimConditionEvent} onChange={event=>setClaimConditionEvent(event.target.value)}><option value="game.completed_3">Played 3 matches</option><option value="purchase.completed">Made first purchase</option><option value="event.attended">Verified event attendance</option><option value="referral.qualified">Qualified referral</option><option value="custom.signed">Custom signed project action</option></select></label><label><span>Recipient message</span><input value={claimConditionDescription} onChange={event=>setClaimConditionDescription(event.target.value)} maxLength={240}/></label></div><Status tone="cyan">Pre-claim gate</Status></div>}<div className="event-code"><Webhook/><code>{activationEvent}</code><Status tone="green">Attribution ready</Status></div></div>}
        {step===4&&<div className="activation-destination-builder"><div><ArrowUpRight/><span><b>Post-claim destination</b><small>Bring recipients into your app after their walletless claim settles.</small></span><Status tone="cyan">Return path</Status></div><label>Secure project URL<input type="url" value={activationUrl} onChange={event=>setActivationUrl(event.target.value)} placeholder="https://yourproject.xyz/welcome" maxLength={500}/></label><label>Button label<input value={activationLabel} onChange={event=>setActivationLabel(event.target.value)} maxLength={50}/></label><p><ShieldCheck/>Authenticated return clicks stay separate from project-signed activation events.</p></div>}
        {step===5&&<><div className="fund-review"><div><small>CAMPAIGN</small><b>{name}</b></div><div><small>RECIPIENTS</small><b>{recipients.length.toLocaleString()}</b></div><div><small>TOTAL ALLOCATION</small><b>{total.toLocaleString(undefined,{maximumFractionDigits:6})} {tokenAddress?"TOKEN":"USDC"}</b></div><div><small>CLAIM SECURITY</small><b>{mode}</b></div><div><small>SETTLEMENT GATE</small><b>{requireClaimCondition?"Signed action proof":"Immediate claim"}</b></div><div><small>RECOVERY</small><b>Cancel or expiry refund</b></div></div>{created&&<div className="campaign-created-result"><CheckCircle2/><div><b>{fundingStep==="complete"?"Campaign live on Arc":"Campaign commitments secured"}</b><small>{created.recipientCount} {created.claimMode} links generated · {created.asset.symbol} · root {created.merkleRoot.slice(0,10)}…</small></div><div className="campaign-result-actions"><Button tone="ghost" onClick={()=>void copyFirstClaim()}>{copiedClaim?"Link copied":"Copy first link"} <Copy/></Button><Button tone="ghost" onClick={()=>downloadCampaignLinks(created)}>Download all <Download/></Button></div></div>}</>}
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

function CampaignDeliveryCenter({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [state,setState]=useState<CampaignDeliveryCenterState|null>(null);
  const [loading,setLoading]=useState(Boolean(auth.account));
  const [busy,setBusy]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [campaign,setCampaign]=useState("all");
  const [error,setError]=useState<string|null>(null);
  const [qr,setQr]=useState<{url:string;label:string;dataUrl:string}|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    setLoading(true);
    try{setState(await currentApi.get<CampaignDeliveryCenterState>("/deliveries"));setError(null)}
    catch(fetchError){setError(fetchError instanceof Error?fetchError.message:"Delivery center is unavailable.")}
    finally{setLoading(false)}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const campaigns=useMemo(()=>Array.from(new Map((state?.items??[]).map(item=>[item.distributionId,item.campaignName])).entries()),[state]);
  const visible=useMemo(()=>(state?.items??[]).filter(item=>(campaign==="all"||item.distributionId===campaign)&&`${item.maskedIdentity} ${item.campaignName} ${item.asset} ${item.channel}`.toLowerCase().includes(query.toLowerCase())),[state,campaign,query]);
  const record=async(item:CampaignDeliveryCenterState["items"][number],channel:string)=>{
    setBusy(item.id);setError(null);
    try{
      if(channel==="copy"||channel==="discord")await navigator.clipboard.writeText(item.claimUrl);
      if(channel==="qr"){
        const QRCode=await import("qrcode");
        const dataUrl=await QRCode.toDataURL(item.claimUrl,{width:720,margin:2,color:{dark:"#061b2b",light:"#f4fafa"},errorCorrectionLevel:"H"});
        setQr({url:item.claimUrl,label:`${item.campaignName} · ${item.maskedIdentity}`,dataUrl});
      }
      const shareText=encodeURIComponent(`${item.campaignName}: your private Current CoFi claim is ready.`);
      const shareUrl=encodeURIComponent(item.claimUrl);
      if(channel==="x")window.open(`https://x.com/intent/post?text=${shareText}&url=${shareUrl}`,"_blank","noopener,noreferrer");
      if(channel==="telegram")window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`,"_blank","noopener,noreferrer");
      if(channel==="email")window.open(`mailto:?subject=${encodeURIComponent(`${item.campaignName} claim`)}&body=${shareText}%0A%0A${shareUrl}`,"_self");
      if(channel==="sms")window.open(`sms:?&body=${shareText}%20${shareUrl}`,"_self");
      await currentApi.post("/deliveries",{deliveryId:item.id,channel});
      await refresh();
    }catch(actionError){setError(actionError instanceof Error?actionError.message:"The delivery handoff could not be recorded.")}
    finally{setBusy(null)}
  };
  const downloadManifest=()=>{
    const cells=(value:string)=>`"${value.replaceAll('"','""')}"`;
    const csv=["campaign,recipient,identity_type,amount,asset,status,channel,private_claim_url,expires_at",...visible.map(item=>[item.campaignName,item.maskedIdentity,item.identityType,item.amount,item.asset,item.status,item.channel,item.claimUrl,item.expiresAt].map(cells).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`current-delivery-manifest-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();URL.revokeObjectURL(url);
  };
  const totals=state?.totals??{ready:0,handedOff:0,claimed:0,campaigns:0};
  return <><PageHero eyebrow="SECURE DELIVERY CURRENT" title="Put every private claim in the right hands." copy="Recover encrypted campaign links, prepare social or QR handoffs, and follow each allocation through verified Arc settlement." mode="branches"><Button tone="cyan" onClick={()=>go("new-campaign")}>Create campaign <Plus/></Button></PageHero>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Delivery links stay private</h3><p>Sign in as an authorized project operator to decrypt and manage campaign claim links.</p><Button tone="blue" onClick={()=>go("claim")}>Open workspace <ArrowRight/></Button></div>}
    {auth.account&&<><section className="delivery-assurance"><ShieldCheck/><div><b>Encrypted at rest. Visible only to authorized project operators.</b><small>{state?.privacy??"A recorded handoff means an operator prepared the channel; it is not third-party delivery confirmation."}</small></div><Status tone="green">Operator-only</Status></section>
    <div className="metric-grid-new delivery-metrics"><MetricCard label="Ready to hand off" value={totals.ready.toLocaleString()} icon={Send}/><MetricCard label="Handoffs recorded" value={totals.handedOff.toLocaleString()} icon={Share2}/><MetricCard label="Claims settled" value={totals.claimed.toLocaleString()} icon={CheckCircle2}/><MetricCard label="Campaigns" value={totals.campaigns.toLocaleString()} icon={Layers3}/></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="data-panel delivery-center-panel"><div className="panel-head"><div><h3>Private claim handoffs</h3><p>Decrypted only for this authorized session. Never paste this export into a public channel.</p></div><div className="delivery-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search masked identity"/></label><select value={campaign} onChange={event=>setCampaign(event.target.value)}><option value="all">All campaigns</option>{campaigns.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select><button disabled={!visible.length} onClick={downloadManifest}><Download/>Secure CSV</button></div></div>
      {loading&&<div className="campaign-empty compact"><RefreshCw className="spin"/><b>Decrypting authorized delivery records…</b></div>}
      {!loading&&!visible.length&&<div className="campaign-empty compact"><Send/><b>No private deliveries yet</b><p>Create a recipient campaign and its encrypted delivery records will appear here.</p></div>}
      <div className="delivery-grid">{visible.map(item=><article className="delivery-card" key={item.id}><header><span className="delivery-identity"><i>{item.identityType.slice(0,2).toUpperCase()}</i><span><b>{item.maskedIdentity}</b><small>{item.identityType} · {item.campaignName}</small></span></span><Status tone={item.status==="claimed"?"green":item.status==="handed_off"?"cyan":"grey"}>{item.status.replaceAll("_"," ")}</Status></header><div className="delivery-value"><small>PRIVATE ALLOCATION</small><strong>{item.amount} <em>{item.asset}</em></strong><span>Expires {new Date(item.expiresAt).toLocaleDateString()}</span></div><footer><button disabled={busy===item.id||item.status==="claimed"} onClick={()=>void record(item,"copy")}><Copy/>Copy</button><button disabled={busy===item.id||item.status==="claimed"} onClick={()=>void record(item,"qr")}><QrCode/>QR</button><label><Share2/><select aria-label={`Choose handoff channel for ${item.maskedIdentity}`} disabled={busy===item.id||item.status==="claimed"} value="" onChange={event=>{if(event.target.value)void record(item,event.target.value)}}><option value="">Channel</option><option value="email">Email</option><option value="x">X</option><option value="telegram">Telegram</option><option value="discord">Discord copy</option><option value="sms">SMS</option><option value="game">Game account</option><option value="other">Other</option></select></label></footer>{item.sentAt&&<p><Check/>Handoff prepared via {item.channel} · {new Date(item.sentAt).toLocaleString()}</p>}</article>)}</div>
    </div></>}
    {qr&&<div className="modal-backdrop" onMouseDown={()=>setQr(null)}><section className="modal-card delivery-qr-modal" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" aria-label="Close QR code" onClick={()=>setQr(null)}><X/></button><Eyebrow>PRIVATE CLAIM QR</Eyebrow><h2>Scan into the current.</h2><p>{qr.label}</p>{/* Data-generated QR codes cannot use the framework image optimizer. */}<img src={qr.dataUrl} alt={`Private claim QR for ${qr.label}`}/><small>Anyone with this QR can access the private claim. Share it only with the intended recipient.</small><a download="current-private-claim.png" href={qr.dataUrl}><Download/>Download QR</a></section></div>}
  </>;
}

function Referrals({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [state,setState]=useState<ReferralState|null>(null);
  const [quality,setQuality]=useState<CampaignQualityState|null>(null);
  const [campaignId,setCampaignId]=useState("");
  const [creating,setCreating]=useState(false);
  const [qualityBusy,setQualityBusy]=useState(false);
  const [qualityAction,setQualityAction]=useState<"monitor"|"review"|"hold-referral-reward">("review");
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{const [referralsResult,qualityResult]=await Promise.all([currentApi.get<ReferralState>("/referrals"),currentApi.get<CampaignQualityState>("/quality")]);setState(referralsResult);setQuality(qualityResult);setError(null)}
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
  const evaluateQuality=async()=>{
    if(!selectedCampaignId)return;
    setQualityBusy(true);setError(null);
    try{
      await currentApi.post("/quality",{action:"update-policy",distributionId:selectedCampaignId,reviewThreshold:45,holdThreshold:70,burstWindowMinutes:10,burstReferralCount:8,minimumAccountAgeMinutes:60,minimumActivationDelaySeconds:30,enforcementAction:qualityAction});
      await currentApi.post("/quality",{action:"evaluate",distributionId:selectedCampaignId});
      await refresh();
    }catch(qualityError){setError(qualityError instanceof Error?qualityError.message:"Campaign quality evaluation failed.")}
    finally{setQualityBusy(false)}
  };
  const totals=state?.totals??{referrals:0,claimed:0,activated:0,activationRate:0};
  return <><PageHero eyebrow="ATTRIBUTION NETWORK" title="See which currents create active users." copy="Every referral keeps its source. Every signed activation moves credit through a measurable onchain campaign." mode="branches"/>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to open attribution</h3><p>Referral links and campaign conversion data belong to your Current workspace.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {auth.account&&<><div className="referral-top"><div><small>ATTRIBUTED ACTIVATIONS</small><strong>{totals.activated.toLocaleString()}</strong><em><TrendingUp/>{totals.activationRate.toFixed(1)}% activation rate</em></div><div><small>REFERRALS CLAIMED</small><strong>{totals.claimed.toLocaleString()}</strong><span>{totals.referrals.toLocaleString()} live referral codes</span></div><div className="referral-visual"><FluidCanvas mode="branches"/><span className="ref-root">C</span>{(state?.sources.slice(0,5)??[]).map((source,i)=><span className={`ref-node r-${i}`} key={source.referrerUserId}>{source.name.slice(0,2).toUpperCase()}</span>)}</div></div>
    <div className="integration-create"><div><Eyebrow>CREATE A REFERRAL CURRENT</Eyebrow><h3>Give a campaign its own attributable path.</h3><p>Claims carrying this code remain tied to the referrer through signed project activation events.</p></div><label>Campaign<select value={selectedCampaignId} onChange={event=>setCampaignId(event.target.value)}><option value="">Choose campaign</option>{network.campaigns.map(campaign=><option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select></label><Button tone="blue" disabled={!selectedCampaignId||creating} onClick={()=>void createCode()}>{creating?"Creating…":"Create code"} <Plus/></Button></div>
    <div className="quality-control"><div><ShieldCheck/><span><Eyebrow>QUALITY ENGINE</Eyebrow><h3>Measure retained humans, not empty claims.</h3><p>Explainable signals flag suspicious referral rewards without blocking walletless token delivery.</p></span></div><label>Enforcement<select value={qualityAction} onChange={event=>setQualityAction(event.target.value as typeof qualityAction)}><option value="monitor">Monitor only</option><option value="review">Manual review</option><option value="hold-referral-reward">Hold referral reward</option></select></label><Button tone="cyan" disabled={!selectedCampaignId||qualityBusy} onClick={()=>void evaluateQuality()}>{qualityBusy?"Evaluating…":"Evaluate campaign"} <Radar/></Button></div>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="quality-metrics"><MetricCard label="Day 1 retention" value={`${(quality?.retention.day1??0).toFixed(1)}%`} icon={Activity}/><MetricCard label="Day 7 retention" value={`${(quality?.retention.day7??0).toFixed(1)}%`} icon={TrendingUp}/><MetricCard label="Returning users" value={(quality?.retention.returning??0).toLocaleString()} icon={Users}/><MetricCard label="Needs review" value={((quality?.totals.review??0)+(quality?.totals.held??0)).toLocaleString()} icon={ShieldAlert}/></div>
    <div className="analysis-grid quality-grid"><div className="data-panel"><div className="panel-head"><div><h3>Retention cohorts</h3><p>Day-7 return activity from verified project events</p></div><Status tone="green">Signed events</Status></div><div className="retention-cohorts">{quality?.cohorts.map(cohort=><div key={cohort.week}><span><b>{new Date(`${cohort.week}T00:00:00Z`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</b><small>{cohort.claimed} claimed · {cohort.eligibleDay7} eligible</small></span><i><b style={{width:`${cohort.day7Rate}%`}}/></i><strong>{cohort.day7Rate.toFixed(1)}%</strong></div>)}{!quality?.cohorts.length&&<div className="campaign-empty compact"><Activity/><b>Cohorts begin after settled claims</b><p>Only users old enough for the selected window enter its denominator.</p></div>}</div></div><div className="data-panel"><div className="panel-head"><div><h3>Explainable review queue</h3><p>No opaque score—every decision includes its signals</p></div><Status tone={quality?.reviewQueue.length?"cyan":"green"}>{quality?.reviewQueue.length??0} flagged</Status></div><div className="quality-review-list">{quality?.reviewQueue.map(item=><article key={item.id}><span className={`risk-score ${item.band}`}><b>{item.score}</b><small>RISK</small></span><div><b>{item.campaignName}</b><p>{item.signals.map(signal=>signal.evidence).join(" ")}</p><small>{item.decision.replaceAll("-"," ")} · {new Date(item.evaluatedAt).toLocaleString()}</small></div></article>)}{!quality?.reviewQueue.length&&<div className="campaign-empty compact"><ShieldCheck/><b>No participants need review</b><p>Run an evaluation after referral claims arrive.</p></div>}</div></div></div>
    <div className="analysis-grid"><div className="data-panel"><div className="panel-head"><div><h3>Referral codes</h3><p>Append a code as <code>?ref=code</code> to its campaign claim link.</p></div><Status tone="green">Live data</Status></div>{state?.codes.map(code=><div className="key-row-new referral-code-row" key={code.id}><span className="key-symbol"><Link2/></span><div><b>{code.campaignName}</b><code>{code.code}</code></div><span>{code.referrerName}</span><time>{new Date(code.createdAt).toLocaleDateString()}</time><button aria-label="Copy referral code" onClick={()=>void navigator.clipboard.writeText(code.code)}><Copy/></button></div>)}{!state?.codes.length&&<div className="campaign-empty compact"><Network/><b>No referral paths yet</b><p>Create one for a funded campaign above.</p></div>}</div>
      <div className="data-panel"><div className="panel-head"><div><h3>Top referral sources</h3><p>Ranked by verified activations</p></div></div>{state?.sources.map((source,index)=><div className="leader-row" key={source.referrerUserId}><b>{index+1}</b><i>{source.name[0]?.toUpperCase()??"C"}</i><span><strong>{source.name}</strong><small>{source.code}</small></span><em>{source.activated} active</em><Status tone="green">{source.activationRate.toFixed(1)}%</Status></div>)}{!state?.sources.length&&<div className="campaign-empty compact"><Target/><b>Activation sources will appear here</b></div>}</div></div></>}</>;
}

function Analytics({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const network=useCampaignNetwork(Boolean(auth.account));
  const [discovery,setDiscovery]=useState<DiscoveryNetworkState|null>(null);
    useEffect(()=>{const task=window.setTimeout(()=>{void currentApi.get<DiscoveryNetworkState>("/discovery").then(setDiscovery).catch(()=>undefined)},0);return()=>window.clearTimeout(task)},[]);
    const totals=network.analytics?.totals;
    const acquisition=network.analytics?.discovery;
    const localAcquisitionQa=typeof window!=="undefined"&&(location.hostname==="localhost"||location.hostname==="127.0.0.1")&&new URLSearchParams(location.search).has("qaAcquisition");
    const showAcquisition=Boolean(auth.account)||localAcquisitionQa;
    const attention=auth.account?acquisition?.totals:discovery?.totals;
    const recent=acquisition?.daily.slice(-14)??Array.from({length:14},(_,index)=>({day:`QA-${index+1}`,impressions:0,opens:0}));
    const recentMax=Math.max(1,...recent.map(day=>day.impressions));
    const funnel=[
      ["Impressions",acquisition?.totals.impressions??0,"Daily-deduplicated attention",null],
      ["Opportunity opens",acquisition?.totals.opens??0,"Intent to inspect",acquisition?.rates.openRate??0],
      ["Participation",acquisition?.totals.participation??0,"Reservation, entry, or submission",acquisition?.rates.participationRate??0],
      ["Arc claims",acquisition?.totals.claims??0,"Confirmed settlement",acquisition?.rates.claimRate??0],
      ["Activations",acquisition?.totals.activations??0,"Signed project outcome",acquisition?.rates.activationRate??0],
    ] as const;
    return <><PageHero eyebrow="CAMPAIGN INTELLIGENCE" title="Find where the current accelerates—or breaks." copy="Compare verified targeting, claim settlement, and activation signals without hiding behind vanity metrics."/>
    <div className="metric-grid-new"><MetricCard label="Recipients targeted" value={(totals?.targeted??0).toLocaleString()} icon={Users}/><MetricCard label="Claims settled" value={(totals?.claimed??0).toLocaleString()} icon={Gift}/><MetricCard label="Returned to project" value={(totals?.destinationRecipients??0).toLocaleString()} change={`${(totals?.destinationRate??0).toFixed(1)}% of claimants`} icon={ArrowUpRight}/><MetricCard label="Verified activations" value={(totals?.activations??0).toLocaleString()} icon={Target}/></div>
    {network.error&&<p className="auth-system-note is-error"><X/>{network.error}</p>}
    <div className="discovery-analytics-strip"><div><Compass/><span><small>{auth.account?"PROJECT ACQUISITION":"DISCOVERY NETWORK"}</small><b>From attention to participation</b></span></div><span><small>IMPRESSIONS</small><b>{(attention?.impressions??0).toLocaleString()}</b></span><span><small>OPPORTUNITY OPENS</small><b>{(attention?.opens??0).toLocaleString()}</b></span><span><small>PARTICIPATION ACTIONS</small><b>{(attention?.participation??0).toLocaleString()}</b></span><button onClick={()=>go("discover")}>Open network <ArrowUpRight/></button></div>
    {showAcquisition&&<section className="discovery-acquisition-panel"><header><div><Eyebrow>VERIFIABLE ACQUISITION</Eyebrow><h2>See exactly where attention becomes an active user.</h2><p>{acquisition?.boundary??"Anonymous attention, product participation, confirmed Arc claims, and signed activation events remain separate evidence classes."}</p></div><Status tone="green">Project scoped</Status></header><div className="acquisition-funnel">{funnel.map(([label,value,detail,rate],index)=><article key={label}><small>0{index+1}</small><strong>{value.toLocaleString()}</strong><b>{label}</b><p>{detail}</p>{rate!==null?<em>{rate.toFixed(1)}% from prior step</em>:<em>Anonymous signal</em>}</article>)}</div><div className="acquisition-evidence-grid"><div className="acquisition-current"><div><h3>14-day attention current</h3><p>Unique resource-level signals, grouped by UTC day</p></div><div className="acquisition-bars" aria-label="Fourteen-day discovery impressions and opens">{recent.map(day=><span key={day.day} title={`${day.day}: ${day.impressions} impressions, ${day.opens} opens`}><i style={{height:`${Math.max(4,day.impressions/recentMax*100)}%`}}/><b style={{height:`${Math.max(2,day.opens/recentMax*100)}%`}}/></span>)}</div><footer><span><i/>Impressions</span><span><i/>Opens</span><b>{acquisition?.rates.impressionToActivationRate.toFixed(2)??"0.00"}% impression → activation</b></footer></div><div className="acquisition-opportunities"><div><h3>Opportunity conversion</h3><p>Product outcomes stay distinct from attention</p></div>{acquisition?.opportunities.slice(0,5).map(item=><article key={`${item.kind}-${item.id}`}><span><small>{item.kind}</small><b>{item.title}</b></span><span><small>OPENED</small><b>{item.opens.toLocaleString()}</b></span><span><small>PARTICIPATED</small><b>{item.participation.toLocaleString()}</b></span><span><small>ACTIVATED</small><b>{item.activations.toLocaleString()}</b></span></article>)}{!network.loading&&!acquisition?.opportunities.length&&<div className="campaign-empty compact"><Compass/><b>No project opportunities yet</b><p>Fund a public drop, bounty, or giveaway to begin the acquisition record.</p></div>}</div></div></section>}
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
  const requestedInvite=useMemo(
    ()=>typeof window==="undefined"?null:new URLSearchParams(window.location.search).get("pilotInvite"),
    [],
  );
  const [pilots,setPilots]=useState<PilotRecord[]>([]);
  const [invitations,setInvitations]=useState<PilotInvitation[]>([]);
  const [applications,setApplications]=useState<PilotApplication[]>([]);
  const [publicPilot,setPublicPilot]=useState<PublicPilot|null>(null);
  const [publicInvitation,setPublicInvitation]=useState<PublicPilotInvitation|null>(null);
  const [submittedApplication,setSubmittedApplication]=useState<{application:PilotApplication;statusSecret:string}|null>(null);
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
  const [inviteOpen,setInviteOpen]=useState(false);
  const [inviteName,setInviteName]=useState("Founding partner cohort");
  const [inviteSummary,setInviteSummary]=useState("Deploy a measurable walletless USDC or project-token activation campaign on Arc with direct Current CoFi integration support.");
  const [inviteMax,setInviteMax]=useState("25");
  const [inviteExpires,setInviteExpires]=useState("");
  const [appOrganization,setAppOrganization]=useState("");
  const [appWebsite,setAppWebsite]=useState("");
  const [appName,setAppName]=useState("");
  const [appRole,setAppRole]=useState("");
  const [appContact,setAppContact]=useState("");
  const [appUseCase,setAppUseCase]=useState("");
  const [appAudience,setAppAudience]=useState("");
  const [appRecipients,setAppRecipients]=useState("100");

  const refresh=useCallback(async()=>{
    if(!auth.account){setPilots([]);setLoading(false);return}
    setLoading(true);
    try{
      const result=await currentApi.get<{pilots:PilotRecord[];invitations:PilotInvitation[];applications:PilotApplication[]}>("/pilots");
      setPilots(result.pilots);setInvitations(result.invitations);setApplications(result.applications);setError(null);
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
  const loadInvitation=useCallback(async(slug:string)=>{
    setLoading(true);
    try{setPublicInvitation(await currentApi.get<PublicPilotInvitation>(`/pilots/apply?invite=${encodeURIComponent(slug)}`));setError(null)}
    catch(loadError){setError(loadError instanceof Error?loadError.message:"This pilot application is unavailable.")}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{
    const task=window.setTimeout(()=>requestedInvite?void loadInvitation(requestedInvite):requestedSlug?void loadPublic(requestedSlug):void refresh(),0);
    return()=>window.clearTimeout(task);
  },[loadInvitation,loadPublic,refresh,requestedInvite,requestedSlug]);
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
  const createInvitation=async()=>{
    setBusy(true);setError(null);
    try{
      await currentApi.post("/pilots",{action:"create-invitation",name:inviteName,summary:inviteSummary,maxApplications:Number(inviteMax),targetRecipients:Number(targetRecipients),requestedIntegrations:integrations,expiresAt:inviteExpires?new Date(`${inviteExpires}T23:59:59Z`).toISOString():undefined});
      setInviteOpen(false);await refresh();
    }catch(createError){setError(createError instanceof Error?createError.message:"The invitation could not be created.")}
    finally{setBusy(false)}
  };
  const submitApplication=async()=>{
    if(!requestedInvite)return;
    setBusy(true);setError(null);
    try{
      const result=await currentApi.post<{application:PilotApplication;statusSecret:string}>(`/pilots/apply?invite=${encodeURIComponent(requestedInvite)}`,{organizationName:appOrganization,websiteUrl:appWebsite||undefined,applicantName:appName,applicantRole:appRole,contact:appContact,useCase:appUseCase,audienceDescription:appAudience,expectedRecipients:Number(appRecipients),requestedIntegrations:publicInvitation?.invitation.requestedIntegrations,website:""});
      setSubmittedApplication(result);
    }catch(submitError){setError(submitError instanceof Error?submitError.message:"The application could not be submitted.")}
    finally{setBusy(false)}
  };
  const reviewApplication=async(applicationId:string,status:"accepted"|"declined")=>{
    setBusy(true);setError(null);
    try{await currentApi.post("/pilots",{action:"review-application",applicationId,status});await refresh()}
    catch(reviewError){setError(reviewError instanceof Error?reviewError.message:"The application could not be reviewed.")}
    finally{setBusy(false)}
  };
  const totals=pilots.reduce((current,pilot)=>({
    active:current.active+(pilot.status==="complete"?0:1),
    ready:current.ready+(pilot.readinessScore>=70?1:0),
    attested:current.attested+(pilot.attestation?1:0),
    recipients:current.recipients+(pilot.campaign?.recipientCount??pilot.targets.recipients),
  }),{active:0,ready:0,attested:0,recipients:0});

  if(requestedInvite){
    const invite=publicInvitation?.invitation;
    return <><PageHero eyebrow="FOUNDING PARTNER INTAKE" title={invite?.name??"Apply to launch a measurable Arc pilot."} copy={invite?.summary??"Tell Current CoFi how walletless distribution can activate your audience."} mode="branches"/>
      {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
      {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Opening partner intake</b><small>Checking availability and integration scope.</small></div></div>}
      {submittedApplication?<section className="pilot-application-success"><BadgeCheck/><div><Eyebrow>APPLICATION RECEIVED</Eyebrow><h2>Your pilot is now in review.</h2><p>Save this private status secret. Current CoFi stores only its hash and cannot show it again.</p><code>{submittedApplication.statusSecret}</code><Button tone="ghost" onClick={()=>navigator.clipboard.writeText(`${submittedApplication.application.publicSlug}:${submittedApplication.statusSecret}`)}>Copy private reference <Copy/></Button></div></section>:
      invite&&<section className="pilot-apply-shell"><div className="pilot-apply-brief"><Status tone="cyan">{invite.status}</Status><h2>{invite.name}</h2><p>{invite.summary}</p><div className="pilot-target-strip"><span><small>TARGET USERS</small><b>{invite.targetRecipients.toLocaleString()}+</b></span><span><small>OPEN PLACES</small><b>{Math.max(0,invite.maxApplications-invite.applicationCount)}</b></span><span><small>INTEGRATIONS</small><b>{invite.requestedIntegrations.length}</b></span></div><div className="pilot-integration-picker">{invite.requestedIntegrations.map(item=><span key={item}><Check/>{item.replaceAll("-"," ")}</span>)}</div></div><div className="pilot-apply-form"><Eyebrow>PARTNER APPLICATION</Eyebrow><h3>Define the activation you can prove.</h3><div className="pilot-create-fields"><label>Organization<input value={appOrganization} onChange={event=>setAppOrganization(event.target.value)} placeholder="Project or community"/></label><label>Website<input value={appWebsite} onChange={event=>setAppWebsite(event.target.value)} placeholder="https://"/></label><label>Your name<input value={appName} onChange={event=>setAppName(event.target.value)} placeholder="Project lead"/></label><label>Your role<input value={appRole} onChange={event=>setAppRole(event.target.value)} placeholder="Founder, developer, growth"/></label><label className="wide">Private contact<input value={appContact} onChange={event=>setAppContact(event.target.value)} placeholder="Email or secure contact handle"/></label><label className="wide">Pilot use case<textarea value={appUseCase} onChange={event=>setAppUseCase(event.target.value)} placeholder="Describe the USDC or project-token distribution and the activation event you will measure."/></label><label className="wide">Audience<textarea value={appAudience} onChange={event=>setAppAudience(event.target.value)} placeholder="Who will receive it, where they are today, and why they will claim."/></label><label>Expected recipients<input type="number" min="1" value={appRecipients} onChange={event=>setAppRecipients(event.target.value)}/></label><label className="pilot-honeypot" aria-hidden="true">Website confirmation<input tabIndex={-1} autoComplete="off" name="website"/></label><div className="pilot-create-action wide"><span>Contact details are encrypted at rest and never published.</span><Button tone="blue" disabled={busy||!appOrganization||!appName||!appRole||!appContact||!appUseCase||!appAudience} onClick={()=>void submitApplication()}>{busy?"Submitting…":"Submit pilot application"} <ArrowRight/></Button></div></div></div></section>}
    </>;
  }

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

  return <><PageHero eyebrow="PILOT OPERATIONS" title="Turn partners into proof." copy="Onboard real Arc projects, define measurable success, link production campaigns, and collect partner-signed validation for the Circle grant review." mode="branches"><Button tone="ghost" onClick={()=>setInviteOpen(current=>!current)}>{inviteOpen?"Close intake":"Create intake link"} <Share2/></Button><Button tone="cyan" onClick={()=>setCreating(current=>!current)}>{creating?"Close brief":"Open new pilot"} <Plus/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!auth.account&&!loading&&<div className="pilot-intro">
      <article><Handshake/><span>EXTERNAL VALIDATION</span><h3>Real builders, named pilots.</h3><p>Replace vague letters of interest with structured pilot records linked to actual Arc campaigns.</p></article>
      <article><Target/><span>MEASURABLE OUTCOMES</span><h3>Agree on success first.</h3><p>Set recipient, claim, and activation targets before tokens begin flowing.</p></article>
      <article><BadgeCheck/><span>SIGNED PROOF</span><h3>Founder confirmation by link.</h3><p>Partners inspect the live record and create a digest-verified attestation without an account.</p></article>
      <div className="campaign-empty"><Lock/><h3>Open pilot operations</h3><p>Sign in to begin onboarding external Arc projects.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>
    </div>}
    {auth.account&&inviteOpen&&<section className="pilot-create-panel"><div><Eyebrow>PARTNER INTAKE</Eyebrow><h2>Invite qualified projects.</h2><p>Applicants enter through a scoped public form. Private contact data is encrypted and every acceptance becomes a measurable pilot.</p></div><div className="pilot-create-fields"><label>Intake name<input value={inviteName} onChange={event=>setInviteName(event.target.value)}/></label><label>Maximum applications<input type="number" min="1" max="1000" value={inviteMax} onChange={event=>setInviteMax(event.target.value)}/></label><label className="wide">Public summary<textarea value={inviteSummary} onChange={event=>setInviteSummary(event.target.value)}/></label><label>Target recipients<input type="number" min="1" value={targetRecipients} onChange={event=>setTargetRecipients(event.target.value)}/></label><label>Intake closes<input type="date" value={inviteExpires} onChange={event=>setInviteExpires(event.target.value)}/></label><div className="pilot-create-action wide"><span>{integrations.length} supported integrations</span><Button tone="blue" disabled={busy||!inviteName||!inviteSummary} onClick={()=>void createInvitation()}>{busy?"Creating…":"Create secure intake"} <Share2/></Button></div></div></section>}
    {auth.account&&<>{creating&&<section className="pilot-create-panel"><div><Eyebrow>NEW PARTNER PILOT</Eyebrow><h2>Define the proof before launch.</h2><p>Current CoFi will track every milestone against campaign and partner evidence.</p></div><div className="pilot-create-fields"><label>Partner name<input value={partnerName} onChange={event=>setPartnerName(event.target.value)} placeholder="Tidebreak Games"/></label><label>Partner website<input value={partnerWebsite} onChange={event=>setPartnerWebsite(event.target.value)} placeholder="https://"/></label><label className="wide">Pilot use case<textarea value={useCase} onChange={event=>setUseCase(event.target.value)} placeholder="What audience will this project activate with Current CoFi?"/></label><label>Integration mode<select value={integrationMode} onChange={event=>setIntegrationMode(event.target.value)}><option value="hosted-links">Hosted claim links</option><option value="react-embed">React embed</option><option value="server-sdk">Server SDK</option><option value="agent-api">Agent API</option></select></label><label>Target recipients<input type="number" min="1" value={targetRecipients} onChange={event=>setTargetRecipients(event.target.value)}/></label><label>Claim target %<input type="number" min="0" max="100" value={targetClaimRate} onChange={event=>setTargetClaimRate(event.target.value)}/></label><label>Activation target %<input type="number" min="0" max="100" value={targetActivationRate} onChange={event=>setTargetActivationRate(event.target.value)}/></label><label>Target completion<input type="date" value={dueAt} onChange={event=>setDueAt(event.target.value)}/></label><div className="pilot-integration-picker wide">{pilotIntegrationOptions.map(([value,label])=><button className={integrations.includes(value)?"active":""} onClick={()=>toggleIntegration(value)} key={value}>{integrations.includes(value)?<Check/>:<Plus/>}{label}</button>)}</div><div className="pilot-create-action wide"><span>{integrations.length} integration{integrations.length===1?"":"s"} selected</span><Button tone="blue" disabled={busy||!partnerName||!useCase} onClick={()=>void create()}>{busy?"Creating…":"Create pilot"} <Rocket/></Button></div></div></section>}
      <div className="metric-grid-new pilot-metrics"><MetricCard label="Active pilots" value={totals.active.toString()} icon={Handshake}/><MetricCard label="Launch ready" value={totals.ready.toString()} icon={Rocket}/><MetricCard label="Partner attested" value={totals.attested.toString()} icon={BadgeCheck}/><MetricCard label="Targeted recipients" value={totals.recipients.toLocaleString()} icon={Users}/></div>
      {!!invitations.length&&<section className="data-panel pilot-pipeline"><div className="panel-head"><div><h3>Partner intake links</h3><p>Scoped public applications with encrypted contact details</p></div><Status tone="cyan">{applications.filter(item=>item.status==="submitted").length} awaiting review</Status></div>{invitations.map(invite=><div className="pilot-pipeline-row" key={invite.id}><div><b>{invite.name}</b><small>{invite.applicationCount} / {invite.maxApplications} applications · {invite.status}</small></div><button onClick={()=>navigator.clipboard.writeText(pilotInviteUrl(invite.publicSlug))}><Copy/>Copy intake link</button></div>)}</section>}
      {!!applications.length&&<section className="data-panel pilot-pipeline"><div className="panel-head"><div><h3>Incoming applications</h3><p>Accepting an application automatically creates its measurable pilot record</p></div></div>{applications.map(application=><article className="pilot-application-row" key={application.id}><div className="pilot-mark">{application.organizationName.slice(0,2).toUpperCase()}</div><div><Status tone={application.status==="accepted"?"green":application.status==="declined"?"grey":"cyan"}>{application.status}</Status><h4>{application.organizationName}</h4><p>{application.useCase}</p><small>{application.applicantName} · {application.applicantRole} · {application.contact}</small></div><div className="pilot-application-score"><strong>{application.readiness.score??0}</strong><small>READINESS</small></div>{application.status==="submitted"&&<div className="pilot-review-actions"><Button tone="ghost" disabled={busy} onClick={()=>void reviewApplication(application.id,"declined")}>Decline</Button><Button tone="blue" disabled={busy} onClick={()=>void reviewApplication(application.id,"accepted")}>Accept pilot <Check/></Button></div>}</article>)}</section>}
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
      {snapshot.commerce&&<section className="data-panel evidence-commerce"><div className="panel-head"><div><h3>Commerce settlement proof</h3><p>Direct checkout and subscriber-approved recurring USDC activity</p></div><Status tone={snapshot.commerce.merchant?"green":"grey"}>{snapshot.commerce.merchant?"Merchant active":"Not configured"}</Status></div><div className="evidence-commerce-grid"><article><span><ShoppingBag/></span><div><small>HOSTED CHECKOUT</small><h4>{snapshot.commerce.checkout.volume} USDC</h4><p>{snapshot.commerce.checkout.confirmedPayments} confirmed settlement{snapshot.commerce.checkout.confirmedPayments===1?"":"s"} · {snapshot.commerce.checkout.refunds} refund{snapshot.commerce.checkout.refunds===1?"":"s"}</p></div><strong>{snapshot.commerce.checkout.links}<small> links</small></strong></article><article><span><Repeat2/></span><div><small>RECURRING USDC</small><h4>{snapshot.commerce.subscriptions.volume} USDC</h4><p>{snapshot.commerce.subscriptions.confirmedCycles} approved cycle{snapshot.commerce.subscriptions.confirmedCycles===1?"":"s"} · {snapshot.commerce.subscriptions.active} active</p></div><strong>{snapshot.commerce.subscriptions.plans}<small> plans</small></strong></article></div><div className="evidence-commerce-ledger">{[...snapshot.commerce.checkout.settlements.map(item=>({key:`checkout-${item.receiptNumber}`,icon:<ShoppingBag/>,label:item.title,receipt:item.receiptNumber,amount:item.amount,hash:item.transactionHash})),...snapshot.commerce.subscriptions.settlements.map(item=>({key:`subscription-${item.receiptNumber}`,icon:<Repeat2/>,label:`${item.planTitle} · cycle ${item.periodNumber}`,receipt:item.receiptNumber,amount:item.amount,hash:item.transactionHash}))].slice(0,6).map(item=><div key={item.key}><span>{item.icon}</span><p><b>{item.label}</b><code>{item.receipt}</code></p><strong>{item.amount} USDC</strong>{item.hash?<a href={`${snapshot.network.explorerUrl}/tx/${item.hash}`} target="_blank" rel="noreferrer">Proof <ArrowUpRight/></a>:<em>Awaiting Arc hash</em>}</div>)}{!snapshot.commerce.checkout.settlements.length&&!snapshot.commerce.subscriptions.settlements.length&&<div className="campaign-empty compact"><ReceiptText/><b>No commerce settlements in this snapshot</b><p>The next confirmed checkout or subscription cycle will add an Arc receipt here.</p></div>}</div></section>}
      {snapshot.escrow&&<section className="data-panel evidence-commerce evidence-escrow"><div className="panel-head"><div><h3>Milestone escrow proof</h3><p>Fully funded terms, delivery proofs, disputes, and bounded Arc releases</p></div><Status tone={snapshot.escrow.totals.settled>0?"green":snapshot.escrow.totals.funded>0?"cyan":"grey"}>{snapshot.escrow.totals.settled>0?`${snapshot.escrow.totals.settled} settled`:snapshot.escrow.totals.funded>0?"Funded":"Awaiting activation"}</Status></div><div className="evidence-commerce-grid"><article><span><Lock/></span><div><small>FUNDED AGREEMENTS</small><h4>{snapshot.escrow.totals.funded}</h4><p>{snapshot.escrow.totals.active} active · {snapshot.escrow.totals.completed} completed</p></div><strong>{snapshot.escrow.totals.agreements}<small> total</small></strong></article><article><span><FileCheck2/></span><div><small>PROOF-GATED RELEASES</small><h4>{snapshot.escrow.totals.settled}</h4><p>{snapshot.escrow.totals.submitted} delivery proof{snapshot.escrow.totals.submitted===1?"":"s"} · {snapshot.escrow.totals.disputed} dispute{snapshot.escrow.totals.disputed===1?"":"s"}</p></div><strong>{snapshot.escrow.assets.length}<small> assets</small></strong></article></div><div className="evidence-commerce-ledger">{snapshot.escrow.agreements.slice(0,6).map(agreement=>{const settlement=agreement.milestones.findLast(milestone=>Boolean(milestone.settlementTransactionHash));return <div key={agreement.id}><span><Lock/></span><p><b>{agreement.name}</b><code>{agreement.anchors.termsHash.slice(0,18)}…</code></p><strong>{agreement.releasedAmount} {agreement.asset.symbol}</strong>{settlement?.settlementTransactionHash?<a href={`${snapshot.network.explorerUrl}/tx/${settlement.settlementTransactionHash}`} target="_blank" rel="noreferrer">Settlement <ArrowUpRight/></a>:agreement.anchors.fundingTransactionHash?<a href={`${snapshot.network.explorerUrl}/tx/${agreement.anchors.fundingTransactionHash}`} target="_blank" rel="noreferrer">Funding <ArrowUpRight/></a>:<em>Awaiting Arc funding</em>}</div>})}{!snapshot.escrow.agreements.length&&<div className="campaign-empty compact"><Lock/><b>No escrow agreements in this snapshot</b><p>The first funded testnet agreement will add its terms digest and Arc settlement trail here.</p></div>}</div><p className="evidence-boundary"><ShieldCheck/>{snapshot.escrow.boundary}</p></section>}
      <div className="data-panel evidence-campaigns"><div className="panel-head"><div><h3>Pilot campaign proof</h3><p>Funding, targeting, identity, activation, and Arc transaction anchors</p></div><Status tone="green">{snapshot.campaigns.length} included</Status></div>
        {snapshot.campaigns.map(campaign=><article key={campaign.id}><div className="evidence-campaign-title"><span>{campaign.asset.symbol.slice(0,2)}</span><div><b>{campaign.name}</b><small>{campaign.targeting.claimMode} · {campaign.status}</small></div><Status tone={campaign.anchors.fundingTransactionHash?"green":"cyan"}>{campaign.anchors.fundingTransactionHash?"Funded":"Awaiting funding"}</Status></div><div className="evidence-campaign-stats"><span><small>TARGETED</small><b>{campaign.targeting.targeted}</b></span><span><small>SETTLED</small><b>{campaign.targeting.claimed}</b></span><span><small>CLAIM RATE</small><b>{campaign.targeting.claimRate.toFixed(1)}%</b></span><span><small>ACTIVATIONS</small><b>{campaign.activation.total}</b></span><span><small>ATTESTATIONS</small><b>{campaign.identityVerification.attestations}</b></span></div><div className="evidence-anchor-row"><code>{campaign.anchors.merkleRoot??"Merkle root pending"}</code>{campaign.anchors.fundingTransactionHash&&<a href={`${snapshot.network.explorerUrl}/tx/${campaign.anchors.fundingTransactionHash}`} target="_blank" rel="noreferrer">Funding transaction <ArrowUpRight/></a>}<span>{campaign.anchors.claimTransactions.length} claim transaction{campaign.anchors.claimTransactions.length===1?"":"s"}</span></div></article>)}
        {!snapshot.campaigns.length&&<div className="campaign-empty compact"><FileCheck2/><b>No campaign evidence yet</b><p>Create and fund a pilot campaign before generating the next report.</p></div>}
      </div>
    </>}
    {!publicMode&&reports.length>0&&<div className="data-panel evidence-history"><div className="panel-head"><div><h3>Evidence history</h3><p>Immutable snapshots already shared with reviewers</p></div><Status tone="green">{reports.length} reports</Status></div>{reports.map(report=><div className="evidence-report-row" key={report.id}><span><FileCheck2/></span><div><b>{report.project.name}</b><code>{report.digest.slice(0,20)}…</code></div><strong>{report.readinessScore}<small>/100</small></strong><time>{new Date(report.createdAt).toLocaleDateString()}</time><button aria-label="Open evidence report" onClick={()=>void loadPublic(report.publicSlug)}><Eye/></button><button aria-label="Copy public evidence URL" onClick={()=>void share(report)}><Copy/></button></div>)}</div>}
  </>;
}

function GrantReviewRoom({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [active,setActive]=useState<GrantReviewPackage|null>(null);
  const [history,setHistory]=useState<EvidenceReportSummary[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const publicSlug=useMemo(()=>typeof window==="undefined"?null:new URLSearchParams(window.location.search).get("grant"),[]);
  const publicMode=Boolean(publicSlug);
  const loadPublic=useCallback(async(slug:string)=>{
    setLoading(true);setError(null);
    try{setActive(await currentApi.get<GrantReviewPackage>(`/grant/public?slug=${encodeURIComponent(slug)}`))}
    catch(reason){setError(reason instanceof Error?reason.message:"The grant review package is unavailable.")}
    finally{setLoading(false)}
  },[]);
  const refresh=useCallback(async()=>{
    if(!auth.account){setLoading(false);return}
    setLoading(true);setError(null);
    try{
      const result=await currentApi.get<{packages:EvidenceReportSummary[]}>('/grant');setHistory(result.packages);
      if(result.packages[0])await loadPublic(result.packages[0].publicSlug);else setLoading(false);
    }catch(reason){setError(reason instanceof Error?reason.message:"The grant review workspace is unavailable.");setLoading(false)}
  },[auth.account,loadPublic]);
  useEffect(()=>{const task=window.setTimeout(()=>{if(publicSlug){void loadPublic(publicSlug);return}void refresh()},0);return()=>window.clearTimeout(task)},[publicSlug,loadPublic,refresh]);
  const create=async()=>{
    setBusy(true);setError(null);
    try{
      const result=await currentApi.post<GrantReviewPackage>('/grant',{});setActive(result);
      const list=await currentApi.get<{packages:EvidenceReportSummary[]}>('/grant');setHistory(list.packages);
      window.history.replaceState(null,"",`${location.pathname}#/grant`);
    }catch(reason){setError(reason instanceof Error?reason.message:"The review package could not be created.")}
    finally{setBusy(false)}
  };
  const share=async()=>{if(active)await navigator.clipboard.writeText(grantShareUrl(active.evidence.publicSlug))};
  const download=()=>{if(!active)return;const url=URL.createObjectURL(new Blob([JSON.stringify(active,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='current-cofi-circle-grant-review.json';anchor.click();URL.revokeObjectURL(url)};
  return <><PageHero eyebrow="CIRCLE GRANT REVIEW ROOM" title="One room. Every claim is verifiable." copy="A reviewer-ready application package connecting Current CoFi’s product thesis, Arc and Circle architecture, shipped infrastructure, live proof, security posture, honest gaps, and measurable grant milestones." mode="branches">
    {active&&<><Button tone="cyan" onClick={()=>void share()}>Copy reviewer link <Share2/></Button><Button tone="light" onClick={download}>Export package <Download/></Button></>}
  </PageHero>
  {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
  {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Assembling the review current</b><small>Verifying the evidence digest and reviewer-safe application package.</small></div></div>}
  {!loading&&!auth.account&&!publicMode&&!active&&<section className="grant-locked"><BadgeCheck/><div><Eyebrow>REVIEWER-SAFE BY DESIGN</Eyebrow><h2>Create the canonical Circle review package.</h2><p>Sign in to freeze current product proof into a public package without exposing recipient identities or private project data.</p><Button tone="blue" onClick={()=>go('claim')}>Open account <ArrowRight/></Button></div></section>}
  {auth.account&&!publicMode&&<section className="grant-create"><div><Eyebrow>CANONICAL APPLICATION PACKAGE</Eyebrow><h2>Freeze the complete review room.</h2><p>Each package creates a new immutable evidence snapshot, then maps it to Circle’s published selection criteria and Current CoFi’s proposed milestones.</p></div><Button tone="blue" disabled={busy} onClick={()=>void create()}>{busy?'Building package…':'Create review package'} <BadgeCheck/></Button></section>}
  {active&&<>
    <section className="grant-cover"><div><Status tone={active.evidence.integrity.valid?'green':'red'}>{active.evidence.integrity.valid?'Evidence integrity verified':'Integrity check failed'}</Status><Eyebrow>{active.application.project.toUpperCase()} · {active.proof.network.toUpperCase()}</Eyebrow><h1>{active.application.oneLiner}</h1><p>{active.application.solution}</p><div className="grant-cover-actions"><Button tone="light" onClick={()=>void share()}>Share review room <Share2/></Button><a href={active.application.website} target="_blank" rel="noreferrer">Open product <ArrowUpRight/></a></div></div><aside><small>GRANT READINESS</small><strong>{active.proof.readinessScore}</strong><span>/ 100 verified</span><code>{active.digest.slice(0,24)}…</code></aside></section>
    <div className="grant-proof-grid"><MetricCard label="Campaigns" value={active.proof.campaigns.toLocaleString()} icon={Layers3}/><MetricCard label="Recipients targeted" value={active.proof.targetedRecipients.toLocaleString()} icon={Users}/><MetricCard label="Claims settled" value={active.proof.claims.toLocaleString()} icon={Gift}/><MetricCard label="Wallets created" value={active.proof.walletsCreated.toLocaleString()} icon={Wallet}/><MetricCard label="Activations" value={active.proof.activations.toLocaleString()} icon={Target}/></div>
    <section className="grant-thesis"><article><span>01</span><Eyebrow>THE PROBLEM</Eyebrow><h3>Projects have audiences, not wallets.</h3><p>{active.application.problem}</p></article><article><span>02</span><Eyebrow>WHY ARC</Eyebrow><h3>Settlement is the product.</h3><p>{active.application.whyArc}</p></article><article><span>03</span><Eyebrow>ECOSYSTEM VALUE</Eyebrow><h3>One integration for every builder.</h3><p>{active.application.ecosystemValue}</p></article></section>
    <section className="data-panel grant-criteria"><div className="panel-head"><div><h3>Circle selection criteria</h3><p>Direct mapping to Circle’s published grant review framework</p></div><Status tone="green">4 / 4 addressed</Status></div><div>{active.officialCriteria.map((item,index)=><article key={item.id}><span>{String(index+1).padStart(2,'0')}</span><div><h4>{item.label}</h4><p>{item.summary}</p></div><CheckCircle2/></article>)}</div></section>
    <div className="grant-two-col"><section className="data-panel"><div className="panel-head"><div><h3>Circle architecture</h3><p>Every integration has one necessary role</p></div><Network/></div><div className="grant-architecture">{active.architecture.map(item=><article key={item.product}><span>{item.product.slice(0,2).toUpperCase()}</span><div><b>{item.product}</b><p>{item.role}</p></div></article>)}</div></section><section className="data-panel"><div className="panel-head"><div><h3>What is already shipped</h3><p>Production-style infrastructure available for review</p></div><Rocket/></div><div className="grant-shipped">{active.shipped.map(item=><div key={item}><Check/><span>{item}</span></div>)}</div></section></div>
    <section className="grant-milestones"><div className="grant-section-intro"><Eyebrow>PROPOSED GRANT MILESTONES</Eyebrow><h2>Funding tied to outcomes Circle can verify.</h2><p>Each milestone names its measurement and the external dependency the team cannot self-attest.</p></div><div>{active.proposedMilestones.map((item,index)=><article key={item.id}><span>{String(index+1).padStart(2,'0')}</span><h3>{item.title}</h3><p>{item.measurement}</p><small>{item.dependsOn}</small></article>)}</div></section>
    <section className="grant-gaps"><ShieldAlert/><div><Eyebrow>HONEST GAP REGISTER</Eyebrow><h2>No simulated traction presented as real.</h2><p>Current CoFi separates internally verifiable testnet readiness from proof that requires outside teams, an auditor, or Arc mainnet.</p></div><div>{active.honestGaps.map(item=><article key={item.id}><Clock3/><span><b>{item.label}</b><small>{item.evidence}</small></span></article>)}</div></section>
    <section className="grant-review-links"><div><Eyebrow>TECHNICAL REVIEW</Eyebrow><h2>Inspect the product, not the pitch.</h2><p>{active.privacy}</p><code>SHA-256 · {active.evidence.digest}</code></div><div>{Object.entries(active.reviewerLinks).map(([key,url])=><a href={url} target="_blank" rel="noreferrer" key={key}><span><small>{key.replace(/([A-Z])/g,' $1')}</small><b>{new URL(url).hostname}</b></span><ArrowUpRight/></a>)}</div></section>
  </>}
  {!publicMode&&history.length>1&&<section className="data-panel evidence-history"><div className="panel-head"><div><h3>Review history</h3><p>Prior immutable packages remain independently verifiable</p></div><Status tone="cyan">{history.length} packages</Status></div>{history.map(item=><div className="evidence-report-row" key={item.id}><span><BadgeCheck/></span><div><b>{item.project.name}</b><code>{item.digest.slice(0,20)}…</code></div><strong>{item.readinessScore}<small>/100</small></strong><time>{new Date(item.createdAt).toLocaleDateString()}</time><button aria-label="Open grant review" onClick={()=>void loadPublic(item.publicSlug)}><Eye/></button><button aria-label="Copy grant review URL" onClick={()=>navigator.clipboard.writeText(grantShareUrl(item.publicSlug))}><Copy/></button></div>)}</section>}
  </>;
}

function VenueRegistryDashboard({go}:{go:(v:View)=>void}) {
  const [snapshot,setSnapshot]=useState<VenueRegistryState|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{currentApi.get<VenueRegistryState>("/venues").then(setSnapshot).catch(reason=>setError(reason instanceof Error?reason.message:"Venue qualification could not be read.")).finally(()=>setLoading(false))},[]);
  const open=(address?:string)=>{if(address&&snapshot?.explorerUrl)window.open(`${snapshot.explorerUrl}/address/${address}`,"_blank","noopener,noreferrer")};
  const venue=snapshot?.venue; const governance=snapshot?.governance; const readiness=snapshot?.readiness;
  return <><PageHero eyebrow="MAINNET LIQUIDITY BOUNDARY" title="Every venue enters through a narrow gate." copy="Current CoFi qualifies liquidity adapters by exact deployed bytecode, the $CURRENT and USDC pair, explicit risk ceilings, delayed governance, and independent guardian cancellation." mode="orbit"><Button tone="blue" onClick={()=>go("token")}>View protocol liquidity <ArrowRight/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="token-metrics-new"><div><small>Qualified venues</small><strong>{loading?"—":snapshot?.totals?.approvedVenues??0}</strong><span>Governed registry</span></div><div><small>Bytecode attestation</small><strong>{loading?"—":venue?.codeHashMatches?"Exact":"Mismatch"}</strong><span>Live code checked on Arc</span></div><div><small>Slippage ceiling</small><strong>{loading?"—":`${(venue?.maxSlippageBps??0)/100}%`}</strong><span>Execution policy maximum</span></div><div><small>Allocation ceiling</small><strong>{loading?"—":`${(venue?.maxAllocationBps??0)/100}%`}</strong><span>Protocol reserve maximum</span></div></div>
    <section className="data-panel liquidity-proof-panel venue-registry-panel"><div className="panel-head"><div><h3>Venue qualification current</h3><p>The production adapter boundary is fixed before a mainnet DEX is selected</p></div><Status tone={venue?.approved&&venue?.codeHashMatches&&governance?.governorOwnsRegistry?"green":"grey"}>{venue?.approved?"Qualification active":"Awaiting qualification"}</Status></div>
      <div className="liquidity-current-map venue-current-map"><div><small>VENUE ADAPTER</small><strong>{venue?.codeHashMatches?"Exact bytecode":"Unverified code"}</strong><span>{snapshot?.addresses?.adapter?`${snapshot.addresses.adapter.slice(0,10)}…${snapshot.addresses.adapter.slice(-6)}`:"Awaiting adapter"}</span></div><ArrowRight/><div className="liquidity-governance"><ShieldCheck/><small>{governance?.minimumDelaySeconds??0}s PUBLIC REVIEW</small><strong>Venue governor</strong><span>Guardian can cancel qualification or revocation.</span></div><ArrowRight/><div><small>QUALIFIED POLICY</small><strong>{(venue?.maxSlippageBps??0)/100}% / {(venue?.maxAllocationBps??0)/100}%</strong><span>Slippage / protocol allocation ceilings</span></div></div>
      <div className="liquidity-proof-grid"><span className={venue?.codeHashMatches?"pass":""}><Fingerprint/><b>Exact bytecode bound</b><small>Runtime code hash must match the approval</small></span><span className={readiness?.exactPairBinding?"pass":""}><CircleDollarSign/><b>Exact pair bound</b><small>$CURRENT and native Arc USDC only</small></span><span className={readiness?.riskCaps?"pass":""}><ShieldCheck/><b>Risk ceilings fixed</b><small>Adapter execution cannot exceed policy</small></span><span className={governance?.governorOwnsRegistry?"pass":""}><Clock3/><b>Delayed governance</b><small>Every venue change receives public review</small></span></div>
    </section>
    <div className="partner-proof-grid venue-proof-grid"><section className="data-panel"><div className="panel-head"><div><h3>Mainnet readiness checks</h3><p>What remains stable when the final Arc venue changes</p></div><BadgeCheck/></div><div className="venue-readiness-list">{[["Custody boundary",readiness?.custodyAdapterBoundary,"Liquidity vault never hands control to the application backend"],["Bytecode identity",readiness?.exactBytecodeBinding,"A different deployment requires a new delayed qualification"],["Token pair",readiness?.exactPairBinding,"The registry rejects a substituted settlement asset"],["Risk policy",readiness?.riskCaps,"Slippage and reserve exposure are bounded before execution"]].map(([label,pass,copy])=><div className={pass?"pass":""} key={String(label)}><span><ShieldCheck/></span><b>{String(label)}<small>{String(copy)}</small></b><Status tone={pass?"green":"grey"}>{pass?"Pass":"Pending"}</Status></div>)}</div></section>
      <section className="data-panel economy-contracts"><div className="panel-head"><div><h3>Public venue proof</h3><p>Inspect registry, governance, and adapter</p></div><Network/></div>{[["Venue registry",snapshot?.addresses?.registry],["Venue registry governor",snapshot?.addresses?.governor],["Qualified adapter",snapshot?.addresses?.adapter],["$CURRENT token",snapshot?.addresses?.current],["Arc USDC",snapshot?.addresses?.usdc]].map(([label,address])=><button className="economy-contract-row" key={label} disabled={!address} onClick={()=>open(address)}><span><Network/></span><b>{label}<small>{address?`${address.slice(0,8)}…${address.slice(-6)}`:"Awaiting deployment"}</small></b><ArrowUpRight/></button>)}</section></div>
    <p className="economy-disclaimer"><TestTube2/>{snapshot?.proofMode??"This venue proof is configured for Arc testnet only."}</p></>;
}

function LaunchReadinessDashboard({go}:{go:(v:View)=>void}) {
  const [snapshot,setSnapshot]=useState<LaunchReadinessState|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{currentApi.get<LaunchReadinessState>("/launch-readiness").then(setSnapshot).catch(reason=>setError(reason instanceof Error?reason.message:"Release proof could not be read.")).finally(()=>setLoading(false))},[]);
  const open=(address?:string)=>{if(address&&snapshot?.explorerUrl)window.open(`${snapshot.explorerUrl}/address/${address}`,"_blank","noopener,noreferrer")};
  const checks=snapshot?.checks??{}; const release=snapshot?.release; const governance=snapshot?.governance;
  return <><PageHero eyebrow="MAINNET DEPLOYMENT REHEARSAL" title="Every contract. One verifiable release." copy="Current CoFi binds every critical protocol address to its exact runtime bytecode, then moves the complete release through delayed governance with independent cancellation and a rehearsed rollback path." mode="branches"><Button tone="blue" onClick={()=>go("evidence")}>Open grant evidence <ArrowRight/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="token-metrics-new"><div><small>Launch readiness</small><strong>{loading?"—":`${snapshot?.readinessScore??0}%`}</strong><span>Eight independent checks</span></div><div><small>Release manifest</small><strong>{loading?"—":release?.active?"Active":"Pending"}</strong><span>Exact address and bytecode set</span></div><div><small>Verified components</small><strong>{loading?"—":`${snapshot?.components.filter(item=>item.valid&&item.addressMatches).length??0}/${release?.componentCount??10}`}</strong><span>Runtime code checked on Arc</span></div><div><small>Public review delay</small><strong>{loading?"—":`${governance?.minimumDelaySeconds??0}s`}</strong><span>Guardian cancellation enabled</span></div></div>
    <section className="data-panel release-flow-panel"><div className="panel-head"><div><h3>Release control plane</h3><p>A repeatable path from reviewed artifacts to the live protocol</p></div><Status tone={release?.active&&snapshot?.readinessScore===100?"green":"grey"}>{release?.active?"Release proven":"Awaiting release"}</Status></div><div className="release-current-map"><div><Fingerprint/><small>REVIEWED BUILD</small><strong>{release?.componentCount??0} exact artifacts</strong><span>Addresses + runtime bytecode</span></div><ArrowRight/><div><Clock3/><small>{governance?.minimumDelaySeconds??0}s PUBLIC DELAY</small><strong>Release governor</strong><span>Payload cannot change after queueing</span></div><ArrowRight/><div><Rocket/><small>ACTIVE MANIFEST</small><strong>{release?.active?"Arc release v1":"Not active"}</strong><span>{release?.manifestHash?`${release.manifestHash.slice(0,12)}…${release.manifestHash.slice(-8)}`:"Manifest pending"}</span></div></div></section>
    <div className="release-proof-grid"><section className="data-panel"><div className="panel-head"><div><h3>Critical component matrix</h3><p>Every active address must keep the registered code</p></div><Fingerprint/></div><div className="release-component-list">{snapshot?.components.map(item=><button key={item.id} onClick={()=>open(item.address)}><span className={item.valid&&item.addressMatches?"pass":""}><ShieldCheck/></span><b>{item.label}<small>{item.address.slice(0,10)}…{item.address.slice(-6)}</small></b><code>{item.codeHash.slice(0,10)}…{item.codeHash.slice(-6)}</code><Status tone={item.valid&&item.addressMatches?"green":"grey"}>{item.valid&&item.addressMatches?"Verified":"Mismatch"}</Status></button>)}</div></section>
      <section className="data-panel"><div className="panel-head"><div><h3>Pause and rollback drill</h3><p>Operations remain recoverable under pressure</p></div><ShieldAlert/></div><div className="release-check-list">{[["Exact manifest",checks.exactRelease,"Active release ID and manifest agree"],["Runtime bytecode",checks.allBytecodeValid,"Every component validates onchain"],["Address set",checks.allAddressesMatch,"No deployment substitution"],["Governed owner",checks.governorOwnsRegistry,"No direct deployer overwrite"],["Independent guardian",checks.guardianConfigured,"Queued releases can be cancelled"],["Rollback payload",checks.rollbackPayloadReady,"Prior exact release can be re-queued"],["Emergency pause",checks.emergencyPauseReady,"New execution can be stopped"]].map(([label,pass,copy])=><div className={pass?"pass":""} key={String(label)}><span><Check/></span><b>{String(label)}<small>{String(copy)}</small></b></div>)}</div><div className="release-public-links"><button onClick={()=>open(snapshot?.addresses?.registry)}>Release registry <ArrowUpRight/></button><button onClick={()=>open(snapshot?.addresses?.governor)}>Delayed governor <ArrowUpRight/></button></div></section></div>
    <p className="economy-disclaimer"><TestTube2/>{snapshot?.proofMode??"Arc testnet deployment rehearsal pending."}</p></>;
}

function OperationsDashboard({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [snapshot,setSnapshot]=useState<ServiceStatusState|null>(null);
  const [incidents,setIncidents]=useState<ServiceIncident[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState("");
  const [summary,setSummary]=useState("");
  const [severity,setSeverity]=useState<ServiceIncident["severity"]>("minor");
  const [component,setComponent]=useState("claim-settlement");
  const refresh=useCallback(async()=>{
    setLoading(true);
    try {
      const status=await currentApi.get<ServiceStatusState>("/status");
      setSnapshot(status);
      if(auth.account){const ledger=await currentApi.get<{incidents:ServiceIncident[]}>("/incidents");setIncidents(ledger.incidents)}
      else setIncidents([...status.activeIncidents,...status.incidentHistory]);
      setError(null);
    } catch(reason) { setError(reason instanceof Error?reason.message:"Operational status could not be read.") }
    finally { setLoading(false) }
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const create=async()=>{
    if(!auth.account){go("claim");return}
    setBusy(true);
    try { await currentApi.post("/incidents",{action:"create",title,summary,severity,affectedComponents:[component]});setTitle("");setSummary("");setCreating(false);await refresh() }
    catch(reason){setError(reason instanceof Error?reason.message:"The incident could not be created.")}
    finally{setBusy(false)}
  };
  const advance=async(incident:ServiceIncident,status:ServiceIncident["status"])=>{
    if(!auth.account)return;
    setBusy(true);
    try { await currentApi.post("/incidents",{action:"update",incidentId:incident.id,status,message:status==="resolved"?"Recovery verified across the affected service path.":`Incident moved to ${status}.`});await refresh() }
    catch(reason){setError(reason instanceof Error?reason.message:"The incident could not be updated.")}
    finally{setBusy(false)}
  };
  const tone=snapshot?.status==="operational"?"green":snapshot?.status==="degraded"?"cyan":"red";
  const active=incidents.filter(incident=>incident.status!=="resolved");
  const history=incidents.filter(incident=>incident.status==="resolved").slice(0,8);
  return <><PageHero eyebrow="PRODUCTION OPERATIONS" title="Every critical current stays visible." copy="Current CoFi watches the complete financial delivery path—from wallet creation and persistent data to Arc settlement, protocol bytecode, crosschain funding, and developer events." mode="network"><Button tone="blue" onClick={()=>void refresh()}>{loading?"Checking…":"Run live check"} <RefreshCw/></Button></PageHero>
    {error?<p className="auth-system-note is-error"><X/>{error}</p>:null}
    <div className="token-metrics-new operations-metrics"><div><small>Service state</small><strong>{loading?"—":snapshot?.status.replace("_"," ")??"Unknown"}</strong><span>Complete production path</span></div><div><small>Health score</small><strong>{loading?"—":`${snapshot?.score??0}%`}</strong><span>{snapshot?.components.length??0} monitored components</span></div><div><small>Active incidents</small><strong>{loading?"—":snapshot?.activeIncidents.length??0}</strong><span>Persistent public ledger</span></div><div><small>Live check</small><strong>{loading?"—":`${snapshot?.responseTimeMs??0}ms`}</strong><span>{snapshot?.generatedAt?new Date(snapshot.generatedAt).toLocaleTimeString():"Awaiting signal"}</span></div></div>
    <section className="operations-current"><div className="operations-status-orb"><span className={`operations-orb orb-${tone}`}><Activity/></span><small>CURRENT COFI STATUS</small><h2>{snapshot?.status==="operational"?"All systems operational.":snapshot?.status==="degraded"?"Some currents are degraded.":"Major service interruption."}</h2><p>Live dependency checks are combined with the public incident ledger. No private recipient, authorization, or wallet information is exposed.</p><Status tone={tone}>{snapshot?.status??"checking"}</Status></div><div className="operations-component-grid">{snapshot?.components.map(item=><article key={item.id}><span className={`component-pulse component-${item.status}`}/><div><b>{item.name}</b><small>{item.message}</small></div><em>{item.latencyMs===null?"CONFIG":`${item.latencyMs}ms`}</em></article>)}</div></section>
    <div className="operations-grid"><section className="data-panel"><div className="panel-head"><div><h3>Service objectives</h3><p>Explicit recovery and performance targets</p></div><Target/></div><div className="operations-objectives"><span><small>AVAILABILITY</small><strong>{snapshot?.objectives.availability??"99.9%"}</strong><p>Rolling production target</p></span><span><small>API P95</small><strong>&lt; {snapshot?.objectives.apiLatencyP95Ms??800}ms</strong><p>User-facing endpoint target</p></span><span><small>RECOVERY TIME</small><strong>{snapshot?.objectives.recoveryTimeMinutes??30} min</strong><p>Major incident target</p></span><span><small>ONCHAIN RPO</small><strong>Zero</strong><p>Confirmed transactions lost</p></span></div></section><section className="data-panel"><div className="panel-head"><div><h3>Response controls</h3><p>One disciplined lifecycle for every event</p></div><ShieldAlert/></div><div className="incident-lifecycle">{["Investigating","Identified","Monitoring","Resolved"].map((step,index)=><div key={step}><span>{index+1}</span><b>{step}</b><small>{index===0?"Acknowledge and scope":index===1?"Publish verified cause":index===2?"Validate the recovery":"Freeze the final record"}</small></div>)}</div></section></div>
    <section className="data-panel incident-ledger"><div className="panel-head"><div><h3>Incident response ledger</h3><p>Append-only updates keep operators, builders, and reviewers aligned</p></div><Button tone="dark" onClick={()=>auth.account?setCreating(value=>!value):go("claim")}><Plus/>{creating?"Close":"Declare incident"}</Button></div>
      {creating?<div className="incident-create"><label>Incident title<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="Claim confirmations delayed"/></label><label>Severity<select value={severity} onChange={event=>setSeverity(event.target.value as ServiceIncident["severity"])}><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select></label><label>Affected component<select value={component} onChange={event=>setComponent(event.target.value)}>{snapshot?.components.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="wide">Public update<textarea value={summary} onChange={event=>setSummary(event.target.value)} placeholder="We are investigating delayed confirmations. Funds remain secured in campaign vaults."/></label><div className="wide incident-create-action"><span>This message becomes part of the public incident history.</span><Button tone="blue" disabled={busy||!title.trim()||!summary.trim()} onClick={()=>void create()}>{busy?"Publishing…":"Publish incident"}<Radio/></Button></div></div>:null}
      <div className="incident-list">{active.length?active.map(incident=><article key={incident.id}><header><Status tone={incident.severity==="critical"?"red":incident.severity==="major"?"cyan":"grey"}>{incident.severity}</Status><small>{incident.key} · {new Date(incident.startedAt).toLocaleString()}</small></header><h4>{incident.title}</h4><p>{incident.summary}</p><div className="incident-components">{incident.affectedComponents.map(item=><span key={item}>{item}</span>)}</div><footer><Status tone="blue">{incident.status}</Status>{auth.account&&incident.status!=="resolved"?<div>{incident.status==="investigating"?<button disabled={busy} onClick={()=>void advance(incident,"identified")}>Cause identified</button>:null}{incident.status==="identified"?<button disabled={busy} onClick={()=>void advance(incident,"monitoring")}>Begin monitoring</button>:null}{incident.status==="monitoring"?<button disabled={busy} onClick={()=>void advance(incident,"resolved")}>Resolve incident</button>:null}</div>:null}</footer></article>):<div className="incident-empty"><CheckCircle2/><h4>No active incidents</h4><p>The complete monitored service path is currently clear.</p></div>}</div>
      {history.length?<div className="incident-history"><small>RESOLVED HISTORY</small>{history.map(incident=><div key={incident.id}><Check/><b>{incident.title}</b><span>{new Date(incident.latestUpdateAt).toLocaleDateString()}</span></div>)}</div>:null}
    </section>
    <p className="economy-disclaimer"><Activity/>Request logs, Web Analytics, Core Web Vitals, scheduled checks, and the incident ledger form one operational evidence layer.</p></>;
}

function AssetTrustDashboard({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [state,setState]=useState<AssetTrustWorkspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!auth.account){setState(null);return}
    setLoading(true);
    try{setState(await currentApi.get<AssetTrustWorkspace>("/asset-trust"));setError(null)}
    catch(reason){setError(reason instanceof Error?reason.message:"Asset controls could not be reviewed.")}
    finally{setLoading(false)}
  },[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const act=async(tokenId:string,action:"recheck"|"acknowledge")=>{
    if(action==="acknowledge"&&!window.confirm("Approve the currently observed contract controls and resume campaigns paused by this specific drift?"))return;
    setBusy(`${tokenId}:${action}`);setError(null);
    try{await currentApi.post("/asset-trust",{tokenId,action});await refresh()}
    catch(reason){setError(reason instanceof Error?reason.message:"The token review could not be completed.")}
    finally{setBusy(null)}
  };
  return <><PageHero eyebrow="CONTINUOUS ASSET TRUST" title="Contract controls never stay assumed." copy="Current rechecks every distributed Arc asset before funding and claim authorization. If bytecode, ownership, proxy implementation, or monitored privileges change, affected campaigns stop until the project reviews the new state." mode="branches"><Button tone="blue" disabled={loading||!auth.account} onClick={()=>void refresh()}>{loading?"Reading records…":"Refresh workspace"}<RefreshCw/></Button></PageHero>
    {!auth.account?<div className="portfolio-locked trust-locked"><FluidCanvas mode="orbit"/><span><Fingerprint/></span><Eyebrow light>PROJECT CONTROL PLANE</Eyebrow><h2>Open your workspace to monitor asset controls.</h2><p>Only project members can recheck or acknowledge a token baseline. Recipient-facing disclosures remain visible on each claim.</p><Button tone="light" onClick={()=>go("claim")}>Sign in to continue <ArrowRight/></Button></div>:<>
      {error?<p className="auth-system-note is-error"><ShieldAlert/>{error}</p>:null}
      <div className="trust-monitor-metrics"><MetricCard label="Monitored assets" value={(state?.totals.assets??0).toLocaleString()} icon={Fingerprint}/><MetricCard label="Stable baselines" value={(state?.totals.stable??0).toLocaleString()} icon={ShieldCheck}/><MetricCard label="Control changes" value={(state?.totals.changed??0).toLocaleString()} icon={ShieldAlert}/><MetricCard label="Protected campaigns" value={(state?.totals.protectedCampaigns??0).toLocaleString()} icon={Layers3}/></div>
      <section className="trust-policy-strip"><span><Radio/></span><div><small>ENFORCEMENT POLICY</small><b>Funding · claim authorization · scheduled review</b><p>Reviews remain fresh for {Math.round((state?.policy.freshnessSeconds??900)/60)} minutes. Supply changes are recorded but do not pause campaigns; control-plane changes do.</p></div><Status tone={state?.totals.changed?"red":"green"}>{state?.totals.changed?"Action required":"Controls aligned"}</Status></section>
      <section className="trust-asset-list">{loading&&!state?<div className="portfolio-loading">{[1,2,3].map(item=><i key={item}/>)}</div>:state?.assets.map(asset=><article className={`trust-asset-card is-${asset.status}`} key={asset.tokenId}><header><span className="trust-asset-mark">{asset.symbol.slice(0,2)}</span><div><small>{asset.verified?"CIRCLE VERIFIED ASSET":"ARC PROJECT ASSET"}</small><h3>{asset.name} <em>{asset.symbol}</em></h3><a href={asset.current?.explorerUrl} target="_blank" rel="noreferrer">{compactAddress(asset.address)} <ExternalLink/></a></div><Status tone={asset.status==="stable"?"green":asset.status==="changed"?"red":"cyan"}>{asset.status}</Status></header><div className="trust-asset-body"><div className="trust-digest-pair"><span><small>APPROVED CONTROL BASELINE</small><code>{asset.approved?.controlDigest?.slice(0,20)??"Not established"}</code><em>{asset.approved?.inspectedAt?new Date(asset.approved.inspectedAt).toLocaleString():"Waiting for review"}</em></span><ArrowRight/><span><small>CURRENT ARC OBSERVATION</small><code>{asset.current?.controlDigest?.slice(0,20)??"Review required"}</code><em>{asset.current?.inspectedAt?new Date(asset.current.inspectedAt).toLocaleString():"Not inspected"}</em></span></div>{asset.changedFields.length?<div className="trust-drift-alert"><ShieldAlert/><div><b>Control drift detected</b><p>{asset.changedFields.map(field=>field.replaceAll("-"," ")).join(" · ")}</p></div></div>:null}<div className="trust-signal-grid">{asset.current?.signals.map(signal=><span className={signal.status} key={signal.id}><i>{signal.status==="caution"?<ShieldAlert/>:<Check/>}</i><b>{signal.label}</b><small>{signal.detail}</small></span>)}</div></div><footer><div><small>CAMPAIGN COVERAGE</small><b>{asset.activeCampaigns} protected · {asset.campaigns} total</b></div><div><button disabled={Boolean(busy)} onClick={()=>void act(asset.tokenId,"recheck")}><RefreshCw className={busy===`${asset.tokenId}:recheck`?"spin":""}/>{busy===`${asset.tokenId}:recheck`?"Reviewing":"Recheck now"}</button>{asset.status==="changed"?<button className="acknowledge" disabled={Boolean(busy)} onClick={()=>void act(asset.tokenId,"acknowledge")}><ShieldCheck/>{busy===`${asset.tokenId}:acknowledge`?"Verifying":"Review & acknowledge"}</button>:null}</div></footer>{asset.history.length?<details><summary>Review history <ChevronDown/></summary>{asset.history.map((event,index)=><div className="trust-history-row" key={`${event.currentReviewDigest??event.acknowledgedAt}-${index}`}><span className={event.status}/><b>{event.status??"review"}</b><small>{event.phase??"manual"}{event.changedFields?.length?` · ${event.changedFields.join(", ")}`:""}</small><time>{event.inspectedAt||event.acknowledgedAt?new Date(event.inspectedAt??event.acknowledgedAt??"").toLocaleString():"—"}</time></div>)}</details>:null}</article>)}{!loading&&!state?.assets.length?<div className="campaign-empty"><Fingerprint/><h3>No distributed assets yet</h3><p>Inspect a project token or create a USDC campaign. Its approved baseline and continuous history will appear here.</p><Button tone="blue" onClick={()=>go("new-campaign")}>Create a campaign <ArrowRight/></Button></div>:null}</section>
      <aside className="portfolio-boundary"><ShieldCheck/><div><b>Evidence, not a safety label</b><p>Current compares reproducible onchain controls. It does not audit business logic, guarantee transfer behavior, predict market value, or endorse a token. Acknowledgement records who accepted a changed baseline and when.</p></div></aside>
    </>}
  </>;
}

function SecurityDashboard({go}:{go:(v:View)=>void}) {
  const [snapshot,setSnapshot]=useState<SecurityPostureState>(securityPreview);
  const [audit,setAudit]=useState<AuditReadinessState|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{Promise.all([currentApi.get<SecurityPostureState>("/security").then(setSnapshot),currentApi.get<AuditReadinessState>("/security/audit-readiness").then(setAudit)]).catch(()=>setError("The live security service is reconnecting.")).finally(()=>setLoading(false))},[]);
  const implemented=snapshot.controls.filter(item=>item.status==="implemented");
  const external=snapshot.controls.find(item=>item.status==="pending-external-review");
  return <><PageHero eyebrow="SECURITY REVIEW READINESS" title="Trust boundaries you can inspect." copy="Current CoFi maps every privileged role, protected fund flow, protocol invariant, and review artifact before independent auditors receive the code. Internal readiness is public; external assurance is never implied." mode="network"><Button tone="blue" onClick={()=>go("launch")}>Verify protocol release <ArrowRight/></Button></PageHero>
    {error&&<p className="economy-disclaimer"><RefreshCw/>{error} Showing the verified bundled review snapshot.</p>}
    <div className="token-metrics-new security-metrics"><div><small>Internal controls</small><strong>{loading?"—":`${snapshot?.assurance.internalReadinessScore??0}%`}</strong><span>{implemented.length}/{snapshot?.assurance.totalInternalControls??0} evidenced</span></div><div><small>Independent audit</small><strong>{loading?"—":snapshot?.assurance.externalAuditStatus??"pending"}</strong><span>No external assurance claimed</span></div><div><small>Mainnet approval</small><strong>{loading?"—":snapshot?.assurance.mainnetApproved?"Approved":"Not yet"}</strong><span>Testnet-only security posture</span></div><div><small>Protected flows</small><strong>{loading?"—":snapshot?.fundFlows.length??0}</strong><span>Explicit custody boundaries</span></div></div>
    <section className="security-current"><div className="security-orb"><ShieldCheck/><span>INTERNAL REVIEW</span><strong>{snapshot?.assurance.internalReadinessScore??0}</strong><small>/ 100</small></div><div><Eyebrow>HONEST ASSURANCE</Eyebrow><h2>Review-ready does not mean audited.</h2><p>{snapshot?.assurance.statement??"Loading Current CoFi's security assurance statement."}</p><Status tone="cyan">Independent review pending</Status></div><article><ShieldAlert/><b>{external?.name??"Independent external smart-contract review"}</b><p>{external?.evidence??"The review package is prepared; a final outside report has not been issued."}</p></article></section>
    <div className="security-grid"><section className="data-panel"><div className="panel-head"><div><h3>Implemented controls</h3><p>Publicly documented and continuously checked</p></div><Status tone="green">{implemented.length} active</Status></div><div className="security-control-list">{snapshot?.controls.map(item=><div className={item.status==="implemented"?"pass":"pending"} key={item.id}><span>{item.status==="implemented"?<Check/>:<Clock3/>}</span><div><b>{item.name}</b><small>{item.evidence}</small></div><Status tone={item.status==="implemented"?"green":"cyan"}>{item.status==="implemented"?"Implemented":"External"}</Status></div>)}</div></section>
      <section className="data-panel"><div className="panel-head"><div><h3>Privileged role map</h3><p>Authority is narrow and boundaries are explicit</p></div><KeyRound/></div><div className="security-role-list">{snapshot?.privilegedRoles.map(item=><article key={item.role}><span><Fingerprint/></span><div><b>{item.role}</b><p>{item.authority}</p><small>{item.boundary}</small></div></article>)}</div></section></div>
    <section className="data-panel security-flow-panel"><div className="panel-head"><div><h3>Protected fund flows</h3><p>Where value is held and exactly what can release it</p></div><Network/></div><div className="security-flow-grid">{snapshot?.fundFlows.map((item,index)=><article key={item.flow}><span>{String(index+1).padStart(2,"0")}</span><h4>{item.flow}</h4><small>CUSTODY</small><p>{item.custody}</p><small>RELEASE BOUNDARY</small><p>{item.release}</p></article>)}</div></section>
    <section className="audit-manifest-panel"><div><Eyebrow>AUDIT SCOPE MANIFEST</Eyebrow><h2>Every reviewed byte has a fingerprint.</h2><p>Any scoped source, compiler artifact, lockfile, deployment snapshot, or scope change breaks the security gate until the manifest is regenerated and reviewed.</p><code>{audit?.manifestDigest??"Loading deterministic manifest digest…"}</code></div><div className="audit-manifest-stats"><span><small>CONTRACT SOURCES</small><strong>{audit?.verification.sourceDigests??16}</strong><b>SHA-256 pinned</b></span><span><small>COMPILER ARTIFACTS</small><strong>{audit?.verification.artifactDigests??16}</strong><b>Creation bytecode pinned</b></span><span><small>PRIORITY INVARIANTS</small><strong>{audit?.scope.priorityProperties??7}</strong><b>Explicitly testable</b></span><span><small>DRIFT GATE</small><strong>{audit?.verification.scopeDriftGate?"ON":"—"}</strong><b>Fails closed</b></span></div><aside><ShieldAlert/><b>Internal evidence only</b><p>{audit?.boundary??"Independent review remains pending."}</p><a href="/api/v1/security/audit-readiness" target="_blank" rel="noreferrer">Open machine-readable manifest <ArrowUpRight/></a></aside></section>
    <section className="security-package"><div><Eyebrow light>INDEPENDENT REVIEW HANDOFF</Eyebrow><h2>One package. No hidden assumptions.</h2><p>Auditors receive the exact contract scope, threat model, invariants, reproduction commands, disclosure policy, and pinned deployment evidence.</p></div><div>{snapshot&&Object.entries(snapshot.reviewPackage).filter(([key,value])=>key!=="commit"&&Boolean(value)).slice(0,5).map(([key,value])=><a href={String(value)} target="_blank" rel="noreferrer" key={key}><FileCheck2/><span><small>{key.replace(/([A-Z])/g," $1")}</small><b>{String(value)}</b></span><ArrowUpRight/></a>)}</div></section>
    <p className="economy-disclaimer"><TestTube2/>Current CoFi is on Arc testnet. Independent audit completion and remediation closure are mandatory before mainnet approval.</p></>;
}

function PartnerVaultDashboard({go}:{go:(v:View)=>void}) {
  const [snapshot,setSnapshot]=useState<PartnerVaultState|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{currentApi.get<PartnerVaultState>("/partners").then(setSnapshot).catch(reason=>setError(reason instanceof Error?reason.message:"Partner reserves could not be read.")).finally(()=>setLoading(false))},[]);
  const open=(address?:string)=>{if(address&&snapshot?.explorerUrl)window.open(`${snapshot.explorerUrl}/address/${address}`,"_blank","noopener,noreferrer")};
  const asset=snapshot?.asset; const governance=snapshot?.governance; const proof=snapshot?.proofCampaign;
  return <><PageHero eyebrow="ARC ECOSYSTEM RESERVES" title="Partner tokens become funded campaigns." copy="Arc projects can contribute their own tokens to a transparent Current CoFi reserve. Delayed governance moves those assets only into fully allocated, walletless campaigns." mode="branches"><Button tone="ghost" onClick={()=>go("project-token-proof")}>Public proof <BadgeCheck/></Button><Button tone="blue" onClick={()=>go("new-campaign")}>Create a campaign <ArrowRight/></Button></PageHero>
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    <div className="token-metrics-new"><div><small>Approved partner assets</small><strong>{loading?"—":snapshot?.totals?.approvedAssets??0}</strong><span>Governed allowlist</span></div><div><small>Partner contributions</small><strong>{loading?"—":snapshot?.totals?.deposits??0}</strong><span>Public deposit receipts</span></div><div><small>Total deposited</small><strong>{loading?"—":`${asset?.totalDeposited??"0"} ${asset?.symbol??"tokens"}`}</strong><span>Arc testnet proof asset</span></div><div><small>Campaigns funded</small><strong>{loading?"—":snapshot?.totals?.campaignsFunded??0}</strong><span>{asset?.totalCampaignFunded??"0"} {asset?.symbol??"tokens"} committed</span></div></div>
    <section className="data-panel partner-vault-panel"><div className="panel-head"><div><h3>Partner reserve current</h3><p>One auditable path from project treasury to claimable community rewards</p></div><Status tone={snapshot?.configured&&governance?.governorOwnsVault&&asset?.approved?"green":"grey"}>{snapshot?.configured?"Onchain proof active":"Awaiting deployment"}</Status></div>
      <div className="liquidity-current-map partner-current-map"><div className="liquidity-reserve"><small>PARTNER RESERVE</small><strong>{asset?.reserveBalance??"0"} {asset?.symbol??"TOKEN"}</strong><span>{asset?.totalDeposited??"0"} deposited</span></div><ArrowRight/><div className="liquidity-governance"><ShieldCheck/><small>{governance?.minimumDelaySeconds??0}s PUBLIC DELAY</small><strong>Partner governor</strong><span>Guardian may cancel. It cannot redirect funds.</span></div><ArrowRight/><div className="liquidity-position"><small>FUNDED CAMPAIGN</small><strong>{proof?.totalAmount??asset?.totalCampaignFunded??"0"} {asset?.symbol??"TOKEN"}</strong><span>{proof?.recipientCount??0} walletless recipients</span></div></div>
      <div className="liquidity-proof-grid"><span className={governance?.governorOwnsVault?"pass":""}><ShieldCheck/><b>Governor owns reserve</b><small>No direct operator funding path</small></span><span className={asset?.approved?"pass":""}><BadgeCheck/><b>Partner asset approved</b><small>Metadata and treasury anchored onchain</small></span><span className={proof?.state===1?"pass":""}><Gift/><b>Campaign fully funded</b><small>{proof?.remainingAmount??"0"} {asset?.symbol??"tokens"} claimable</small></span><span><TestTube2/><b>Testnet proof asset</b><small>No monetary value or partner endorsement implied</small></span></div>
    </section>
    <div className="partner-proof-grid"><section className="data-panel"><div className="panel-head"><div><h3>Governance proof</h3><p>Every reserve action is publicly delayed</p></div><ShieldCheck/></div><div className="governance-status-grid"><span><small>QUEUED</small><strong>{governance?.totalQueued??0}</strong></span><span><small>EXECUTED</small><strong>{governance?.totalExecuted??0}</strong></span><span><small>CANCELLED</small><strong>{governance?.totalCancelled??0}</strong></span><span><small>DELAY</small><strong>{governance?.minimumDelaySeconds??0}s</strong></span></div><div className="governance-checks"><span className={governance?.governorOwnsVault?"pass":""}><ShieldCheck/>Delayed governor owns partner reserve</span><span className={governance?.guardian?"pass":""}><ShieldCheck/>Independent cancellation guardian</span><span className={asset?.approved?"pass":""}><ShieldCheck/>Partner token metadata anchored</span></div></section>
      <section className="data-panel economy-contracts"><div className="panel-head"><div><h3>Public proof stack</h3><p>Inspect every contract and asset</p></div><Network/></div>{[["Partner reserve vault",snapshot?.addresses?.vault],["Delayed partner governor",snapshot?.addresses?.governor],["Testnet partner token",snapshot?.addresses?.testnetPartnerToken],["Walletless campaign vault",snapshot?.addresses?.campaignVault]].map(([label,address])=><button className="economy-contract-row" key={label} disabled={!address} onClick={()=>open(address)}><span><Network/></span><b>{label}<small>{address?`${address.slice(0,8)}…${address.slice(-6)}`:"Awaiting deployment"}</small></b><ArrowUpRight/></button>)}</section></div>
    <p className="economy-disclaimer"><TestTube2/>{snapshot?.proofMode??"This module is configured for Arc testnet evidence only."}</p></>;
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
  const [sample,setSample]=useState<"sdk"|"react"|"curl"|"verifier"|"mcp">("sdk");
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
    mcp:`{
  "mcpServers": {
    "current-cofi": {
      "command": "node",
      "args": ["/path/to/CurrentCoFi/packages/mcp/dist/index.js"],
      "env": { "CURRENT_MCP_MODE": "read-only" }
    }
  }
}

// Build: pnpm --filter @currentcofi/mcp build
// Project mode adds scoped credentials.
// Every write still requires an exact approval phrase.`,
  };
  const copy=async()=>{await navigator.clipboard.writeText(snippets[sample]);setCopied(true);window.setTimeout(()=>setCopied(false),1800)};
  return <><PageHero eyebrow="CURRENT COFI API" title="One integration. Every activation current." copy="Create real walletless distributions, embed the claim experience, attribute post-claim actions, and let agents move value inside explicit boundaries."><div className="hero-button-row"><Button tone="cyan" onClick={()=>go("integration-lab")}>Open integration lab <ArrowRight/></Button><Button tone="ghost" onClick={()=>go("api-keys")}>Create API key <KeyRound/></Button></div></PageHero>
    <div className="developer-proof"><span><i/><b>LIVE ON ARC TESTNET</b></span><p>SDK · identity verifiers · React components · HMAC requests · durable webhooks · installable MCP server</p><a href="/api/v1/mcp-manifest" target="_blank" rel="noreferrer">Verify MCP <ArrowUpRight/></a></div>
    <div className="developer-grid"><article><Braces/><span>SERVER SDK</span><h3>Distribution API</h3><p>Create signed USDC and project-token campaigns from a backend or launchpad.</p><code>current.distributions.create()</code></article><article><Fingerprint/><span>IDENTITY NETWORK</span><h3>Verifier adapters</h3><p>Bind X, game, ticket, or community identities to a new Arc wallet without exposing the identity onchain.</p><code>current.identities.attest()</code></article><article><Webhook/><span>EVENT DELIVERY</span><h3>Signed webhooks</h3><p>Receive campaign, identity, claim, activation, referral, refund, and delivery events.</p><code>identity.verified</code></article><article><Bot/><span>MACHINE-READABLE</span><h3>Agent tools</h3><p>Let autonomous software create distributions and report activations within scoped policies.</p><code>create_distribution</code></article><article><Layers3/><span>REACT PACKAGE</span><h3>Embeddable claims</h3><p>Put Current’s walletless reward card and referral links directly inside another app.</p><code>&lt;CurrentClaimEmbed /&gt;</code></article><article><FileCheck2/><span>GRANT EVIDENCE</span><h3>Proof API</h3><p>Freeze campaign outcomes and public Arc anchors into a digest-verified reviewer report.</p><code>current.evidence.create()</code></article></div>
    <div className="quickstart-panel" id="sdk-quickstart"><div><Eyebrow>PRODUCTION QUICKSTART</Eyebrow><h2>Create a verified activation current.</h2><ol><li><span>1</span>Install the Current SDK or MCP server</li><li><span>2</span>Create a scoped project key</li><li><span>3</span>Generate identity-bound claim links</li><li><span>4</span>Attest external identities</li><li><span>5</span>Measure real activation</li></ol><div className="code-tabs">{(["sdk","verifier","react","curl","mcp"] as const).map(tab=><button className={sample===tab?"active":""} key={tab} onClick={()=>setSample(tab)}>{tab==="sdk"?"Distribution":tab==="verifier"?"Verifier adapter":tab==="react"?"React embed":tab==="mcp"?"MCP server":"Raw API"}</button>)}</div></div><pre><button className="code-copy" onClick={()=>void copy()}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy"}</button><code>{snippets[sample]}</code></pre></div>
    <div className="verifier-story"><div><Eyebrow>IDENTITY WITHOUT CUSTODY</Eyebrow><h2>Bring any community identity into an Arc wallet.</h2><p>The project verifies the account it already understands—an X profile, game account, ticket, Discord member, or internal customer—and signs a short-lived attestation to the recipient’s Current wallet. Current checks the campaign allocation, API-key scope, wallet binding, expiry, and replay state before signing the onchain claim.</p></div><div className="verifier-flow"><span><b>01</b>Project OAuth or account proof<small>Identity stays with the project</small></span><i/><span><b>02</b>HMAC-signed attestation<small>Hashed identity + exact wallet</small></span><i/><span><b>03</b>Gasless Arc settlement<small>Single-use claim authorization</small></span></div></div>
    <div className="integration-lab"><div className="integration-lab-copy"><Eyebrow>EMBED LAB</Eyebrow><h2>The claim experience travels with your product.</h2><p>Games, communities, launchpads, and AI agents can embed a branded reward without rebuilding wallet creation, claim resolution, or gasless onboarding.</p><div><span><CheckCircle2/> No wallet required</span><span><CheckCircle2/> Referral attribution preserved</span><span><CheckCircle2/> Hosted fallback included</span></div><Button tone="blue" onClick={()=>go("api-keys")}>Start integrating <ArrowRight/></Button></div><div className="integration-lab-preview"><div className="embed-browser"><header><i/><i/><i/><span>play.example/rewards</span></header><main><CurrentClaimEmbed compact accent="#22e4d5" onOpen={()=>go("claim")} preview={{amount:"250",asset:"TIDE",claimable:true,expiresAt:"2026-08-14T00:00:00.000Z",message:"Complete your first match to activate this reward.",project:{name:"Tidebreak",logoUrl:null},sender:"Tidebreak community",status:"claimable"}}/></main></div></div></div>
  </>;
}

type IntegrationReadinessState={score:number;level:string;completed:number;total:number;checks:Array<{id:string;label:string;detail:string;weight:number;complete:boolean;count:number}>;next:{label:string;detail:string}|null;generatedAt:string};
type IntegrationManifestState={digest:string;circleStack:readonly string[];endpoints:Array<{method:string;path:string;purpose:string;permission:string;signed:boolean}>;webhookEvents:readonly string[]};
type IntegrationCertificateState={token:string;digest:string;publicUrl:string;certificate:{schemaVersion:string;subject:{projectRef:string;projectName:string};issuer:{name:string;network:string};status:"progress"|"integration-verified"|"grant-ready";score:number;completed:number;total:number;manifestDigest:string;issuedAt:string;expiresAt:string;checks:Array<{id:string;label:string;weight:number;count:number;complete:boolean}>}};
type VerifiedCertificateState={certificate:IntegrationCertificateState["certificate"];digest:string;verification:{signatureValid:boolean;expired:boolean;manifestCurrent:boolean;verifiedAt:string}};

function BuilderIntegrationLab({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [useCase,setUseCase]=useState<"token"|"game"|"community"|"agent">("token");
  const [mode,setMode]=useState<"sdk"|"react"|"rest"|"agent">("sdk");
  const [manifest,setManifest]=useState<IntegrationManifestState|null>(null);
  const [readiness,setReadiness]=useState<IntegrationReadinessState|null>(null);
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(true);
  const [certificate,setCertificate]=useState<IntegrationCertificateState|null>(null);
  const [certifying,setCertifying]=useState(false);
  const [certificateError,setCertificateError]=useState<string|null>(null);
  const snippets={
    sdk:`const campaign = await current.distributions.create({\n  name: "Founding current",\n  tokenAddress: process.env.PROJECT_TOKEN,\n  mode: "identity-bound",\n  recipients: audience.map(member => ({\n    identityType: "email",\n    identity: member.email,\n    amount: "25"\n  })),\n  activationEvent: "community.first_action"\n});`,
    react:`<CurrentClaimEmbed\n  claimUrl={reward.claimUrl}\n  referralCode={member.referralCode}\n  accent="#22e4d5"\n  onOpen={() => analytics.track("claim_opened")}\n/>`,
    rest:`POST /api/v1/developer/distributions\nAuthorization: Bearer current_live_••••\nX-Current-Timestamp: 1785600000000\nX-Current-Signature: <HMAC-SHA256>\nIdempotency-Key: launch-current-001\n\n{ "name": "Founding current", "mode": "identity-bound" }`,
    agent:`const action = await current.agentActions.proposeDistribution({\n  idempotencyKey: "daily-community-reward",\n  name: "Daily active member reward",\n  recipients: verifiedMembers,\n  activationEvent: "community.contributed"\n});\n// High-value actions pause for human approval.`,
  };
  useEffect(()=>{let active=true;Promise.all([
    currentApi.get<IntegrationManifestState>("/integration-manifest").then(value=>{if(active)setManifest(value)}),
    auth.account?currentApi.get<IntegrationReadinessState>("/integration-readiness").then(value=>{if(active)setReadiness(value)}).catch(()=>undefined):Promise.resolve(),
  ]).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[auth.account]);
  const copy=async()=>{await navigator.clipboard.writeText(snippets[mode]);setCopied(true);window.setTimeout(()=>setCopied(false),1600)};
  const certify=async()=>{if(!auth.account){go("claim");return}setCertifying(true);setCertificateError(null);try{setCertificate(await currentApi.post<IntegrationCertificateState>("/integration-certification",{}))}catch(error){setCertificateError(error instanceof Error?error.message:"The certificate could not be issued.")}finally{setCertifying(false)}};
  const shareCertificate=async()=>{if(!certificate)return;await navigator.clipboard.writeText(certificate.publicUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1600)};
  const cases={token:["Token project","Launch allocations + retained holders","Project token + USDC"],game:["Game studio","Player rewards + first-match activation","Game identity + wallet"],community:["Community","Contributor payouts + referrals","Social identity + attribution"],agent:["AI agent","Policy-bound machine rewards","Agent key + approval limits"]} as const;
  const score=readiness?.score??0;
  return <div className="builder-lab">
    <PageHero eyebrow="BUILDER INTEGRATION LAB" title="From first API call to an activated Arc user." copy="Choose your use case, wire one secure integration path, and prove the full loop: offchain identity, embedded wallet, gasless claim, activation, attribution, and grant evidence."><div className="hero-button-row"><Button tone="cyan" onClick={()=>go("api-keys")}>{auth.account?"Continue integration":"Create project key"} <ArrowRight/></Button><a className="cofi-button tone-ghost" href="/api/v1/integration-manifest" target="_blank" rel="noreferrer">Machine manifest <Download/></a></div></PageHero>
    <section className="lab-proof-strip"><span><Radio/> LIVE BUILDER SURFACE</span><p>Arc testnet · Circle wallets · HMAC requests · signed webhooks · grant-grade evidence</p><code>{manifest?`${manifest.digest.slice(0,10)}…${manifest.digest.slice(-8)}`:"verifying manifest…"}</code></section>
    <section className="lab-composer">
      <div className="lab-choices"><Eyebrow>01 · CHOOSE THE CURRENT</Eyebrow><h2>What are you activating?</h2><div className="lab-choice-grid">{(Object.keys(cases) as Array<keyof typeof cases>).map(key=><button key={key} className={useCase===key?"active":""} onClick={()=>setUseCase(key)}><span>{cases[key][0]}</span><b>{cases[key][1]}</b><small>{cases[key][2]}</small><ArrowUpRight/></button>)}</div></div>
      <div className="lab-current-map" aria-label="Current CoFi integration architecture"><div className="current-source"><small>SOURCE</small><strong>{cases[useCase][0]}</strong><span>Audience + reward rules</span></div><div className="current-flow"><i/><i/><i/><em>Current API</em></div><div className="current-core"><span className="cofi-glyph"><i/><i/><i/></span><small>CURRENT COFI</small><strong>Identity → wallet → claim</strong><span>Gasless Arc settlement</span></div><div className="current-flow activate"><i/><i/><i/><em>Activation event</em></div><div className="current-destination"><small>OUTCOME</small><strong>Active user</strong><span>Attributed + retained</span></div></div>
    </section>
    <section className="lab-build-grid">
      <div className="lab-code"><header><div><Eyebrow>02 · INTEGRATION PATH</Eyebrow><h2>Ship through your stack.</h2></div><div className="lab-mode-tabs">{(["sdk","react","rest","agent"] as const).map(value=><button className={mode===value?"active":""} onClick={()=>setMode(value)} key={value}>{value==="sdk"?"Server SDK":value==="react"?"React embed":value==="rest"?"REST / HMAC":"Agent tools"}</button>)}</div></header><pre><button onClick={()=>void copy()}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy"}</button><code>{snippets[mode]}</code></pre><footer><span><ShieldCheck/> Server-side credentials only</span><span><RefreshCw/> Idempotent writes</span><span><Webhook/> Durable events</span></footer></div>
      <aside className="lab-readiness"><div className="readiness-head"><div className="readiness-ring" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><span>{loading?"…":score}<small>/100</small></span></div><div><Eyebrow>PROJECT READINESS</Eyebrow><h3>{readiness?.level.replace("-"," ")??(auth.account?"Checking workspace":"Preview mode")}</h3><p>{readiness?.next?.detail??"Sign in and connect a project key to measure your real integration."}</p></div></div><div className="readiness-checks">{(readiness?.checks??[
        {id:"key",label:"Scoped project key",detail:"",weight:10,complete:false,count:0},{id:"webhook",label:"Signed webhook",detail:"",weight:10,complete:false,count:0},{id:"campaign",label:"Walletless distribution",detail:"",weight:15,complete:false,count:0},{id:"activation",label:"Activation event",detail:"",weight:10,complete:false,count:0},{id:"evidence",label:"Grant evidence",detail:"",weight:5,complete:false,count:0},
      ]).map(check=><div key={check.id} className={check.complete?"complete":""}><span>{check.complete?<Check/>:<i/>}</span><b>{check.label}<small>{check.complete?`${check.count} verified`:"Not yet verified"}</small></b><em>+{check.weight}</em></div>)}</div><Button tone="blue" onClick={()=>go(readiness?.next?.label.includes("webhook")?"webhooks":readiness?.next?.label.includes("evidence")?"evidence":"api-keys")}>{auth.account?"Complete next proof":"Sign in to begin"} <ArrowRight/></Button></aside>
    </section>
    <section className="lab-contract"><div><Eyebrow>03 · COMPLETE CONTRACT</Eyebrow><h2>Everything another builder needs—without rebuilding the financial layer.</h2><p>Current owns wallet creation, identity-bound authorization, claim settlement, recovery, attribution, and signed evidence. Your product owns the user action that matters.</p></div><div className="lab-stack">{(manifest?.circleStack??["Arc settlement","USDC","Circle embedded wallets","Gas Station","CCTP V2","Gateway"]).map((item,index)=><span key={item}><b>0{index+1}</b>{item}</span>)}</div></section>
    <section className="lab-endpoints"><div className="panel-head"><div><Eyebrow>VERIFIABLE INTERFACE</Eyebrow><h2>Small surface. Complete loop.</h2></div><a href="/api/v1/openapi" target="_blank" rel="noreferrer">Open API specification <ArrowUpRight/></a></div>{(manifest?.endpoints??[]).map(endpoint=><div className="endpoint-row" key={endpoint.path}><span className={endpoint.method.toLowerCase()}>{endpoint.method}</span><code>{endpoint.path}</code><p>{endpoint.purpose}</p><small>{endpoint.permission}</small><em>{endpoint.signed?"HMAC signed":"Bearer scoped"}</em></div>)}</section>
    <section className="lab-certificate"><div className="certificate-watermark"><BadgeCheck/><span>CURRENT</span></div><div className="certificate-copy"><Eyebrow>04 · PORTABLE PROOF</Eyebrow><h2>Make the integration verifiable anywhere.</h2><p>Issue a 30-day, tamper-evident certificate from the project’s current conformance records. The public verifier checks its signature, expiry, manifest version, score, and every completed requirement.</p><div className="certificate-trust"><span><ShieldCheck/> Server-signed</span><span><Fingerprint/> Manifest-bound</span><span><Clock3/> Explicit expiry</span></div>{certificateError&&<p className="form-error">{certificateError}</p>}<div className="hero-button-row">{certificate?<><Button tone="cyan" onClick={()=>void shareCertificate()}>{copied?"Proof link copied":"Copy proof link"} <Copy/></Button><Button tone="ghost" onClick={()=>{location.href=certificate.publicUrl}}>View public proof <ArrowUpRight/></Button></>:<Button tone="cyan" disabled={certifying} onClick={()=>void certify()}>{certifying?"Signing certificate…":auth.account?"Issue integration proof":"Sign in to issue proof"} <BadgeCheck/></Button>}</div></div><div className="certificate-preview"><small>CURRENT COFI · INTEGRATION CONFORMANCE</small><strong>{certificate?.certificate.subject.projectName??"Your project"}</strong><div><span><em>{certificate?.certificate.score??score}</em>/100<small>CONFORMANCE</small></span><span><em>{certificate?.certificate.completed??readiness?.completed??0}</em>/{certificate?.certificate.total??readiness?.total??10}<small>PROOFS</small></span></div><b className={`certificate-tier ${certificate?.certificate.status??readiness?.level??"progress"}`}>{(certificate?.certificate.status??readiness?.level??"progress").replace("-"," ")}</b><code>{certificate?`${certificate.digest.slice(0,12)}…${certificate.digest.slice(-10)}`:"Issued from verified workspace records"}</code></div></section>
  </div>;
}

function IntegrationCertificateView({go}:{go:(v:View)=>void}) {
  const [token]=useState(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("cert")??"");
  const [result,setResult]=useState<VerifiedCertificateState|null>(null);
  const [error,setError]=useState<string|null>(()=>token?null:"This certificate link is incomplete.");
  useEffect(()=>{if(!token)return;let active=true;currentApi.get<VerifiedCertificateState>(`/integration-certification/public?token=${encodeURIComponent(token)}`).then(value=>{if(active)setResult(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Certificate verification failed.")});return()=>{active=false}},[token]);
  const cert=result?.certificate;
  const valid=Boolean(result?.verification.signatureValid&&!result?.verification.expired&&result?.verification.manifestCurrent);
  return <main className="public-certificate"><header><Brand onClick={()=>go("home")}/><button onClick={()=>go("integration-lab")}>Builder integration lab <ArrowUpRight/></button></header><section className={`certificate-sheet ${valid?"verified":"unverified"}`}><div className="certificate-orbit"><i/><i/><i/><BadgeCheck/></div><Eyebrow>PORTABLE INTEGRATION PROOF</Eyebrow>{error?<div className="certificate-error"><ShieldAlert/><h1>Certificate not verified.</h1><p>{error}</p><Button tone="blue" onClick={()=>go("integration-lab")}>Return to integration lab</Button></div>:!cert?<div className="certificate-loading"><RefreshCw className="spin"/><h1>Verifying Current signature…</h1><p>Checking the certificate payload, expiry, and integration manifest.</p></div>:<><div className="certificate-title"><div><h1>{cert.subject.projectName}</h1><p>Current CoFi integration conformance on {cert.issuer.network}</p></div><span className={valid?"valid":"invalid"}><ShieldCheck/>{valid?"Cryptographically verified":"Needs renewal"}</span></div><div className="certificate-score"><span><strong>{cert.score}</strong>/100<small>CONFORMANCE SCORE</small></span><span><strong>{cert.completed}</strong>/{cert.total}<small>VERIFIED PROOFS</small></span><span><strong>{cert.status.replace("-"," ")}</strong><small>CERTIFICATION TIER</small></span></div><div className="certificate-checks">{cert.checks.map(check=><div className={check.complete?"complete":""} key={check.id}><span>{check.complete?<Check/>:<i/>}</span><b>{check.label}<small>{check.complete?`${check.count} recorded proof${check.count===1?"":"s"}`:"Not completed at issuance"}</small></b><em>{check.weight} pts</em></div>)}</div><div className="certificate-verification"><span><ShieldCheck/><b>Signature<small>{result.verification.signatureValid?"Valid":"Invalid"}</small></b></span><span><Clock3/><b>Expires<small>{new Date(cert.expiresAt).toLocaleDateString()}</small></b></span><span><Fingerprint/><b>Manifest<small>{result.verification.manifestCurrent?"Current":"Superseded"}</small></b></span></div><footer><div><small>CERTIFICATE DIGEST</small><code>{result.digest}</code></div><div><small>MANIFEST DIGEST</small><code>{cert.manifestDigest}</code></div><p>Issued {new Date(cert.issuedAt).toLocaleString()} · Verification contains no email, social identity, API secret, or recipient information.</p></footer></>}</section></main>;
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
    try{const created=await currentApi.post<{secret:string}>("/developer/webhooks",{url,events:["campaign.created","campaign.funded","crosschain.funding.created","crosschain.funding.source-confirmed","crosschain.funding.arc-arrived","crosschain.funding.campaign-funded","gateway.funding.created","gateway.funding.deposited","gateway.funding.attested","gateway.funding.arc-arrived","gateway.funding.campaign-funded","agent.settlement-ready","agent.settlement-approved","agent.settled","identity.verified","claim.completed","activation.completed","referral.attributed","quality.assessed","campaign.cancelled","campaign.refunded","current.locked","fee.routed","integration.test"]});setCreatedSecret(created.secret);setUrl("");await refresh()}
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

function intervalLabel(days:number){return days===7?"week":days===30?"month":days===90?"quarter":"year"}

function HostedSubscription({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  const slug=typeof location==="undefined"?"":decodeURIComponent(location.hash.replace("#/subscribe/",""));
  const [plan,setPlan]=useState<SubscriptionPlan|null>(null);const [subscription,setSubscription]=useState<SubscriptionRecord|null>(null);const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{let active=true;currentApi.get<SubscriptionPlan>(`/subscriptions/public?slug=${encodeURIComponent(slug)}`).then(value=>{if(active)setPlan(value)}).catch(loadError=>{if(active)setError(loadError instanceof Error?loadError.message:"Plan unavailable.")});return()=>{active=false}},[slug]);
  const remember=()=>sessionStorage.setItem("current.auth.return",location.hash);
  const start=async()=>{if(!auth.account)return;setBusy(true);setError(null);try{const prepared=await currentApi.post<{complete:boolean;subscriptionId?:string;paymentId?:string;challengeId?:string;subscription?:SubscriptionRecord}>("/subscriptions/start",{slug});if(prepared.subscription){setSubscription(prepared.subscription);return}if(!prepared.challengeId||!prepared.subscriptionId||!prepared.paymentId)throw new Error("Wallet approval could not be prepared.");await auth.executeChallenge(prepared.challengeId);const confirmed=await confirmWalletAction("/subscriptions/start",{slug,subscriptionId:prepared.subscriptionId,paymentId:prepared.paymentId},prepared.challengeId) as WalletActionResult&{subscription?:SubscriptionRecord};if(confirmed.subscription)setSubscription(confirmed.subscription)}catch(startError){setError(startError instanceof Error?startError.message:"Subscription could not be started.")}finally{setBusy(false)}};
  if(error&&!plan)return <div className="hosted-checkout-page"><div className="checkout-card checkout-unavailable"><X/><h1>Plan unavailable</h1><p>{error}</p><Button tone="dark" onClick={()=>go("home")}>Return to Current</Button></div></div>;
  return <div className="hosted-checkout-page subscription-host"><header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Explicit renewal on Arc testnet</span></header><main className="checkout-card">{!plan?<div className="checkout-loading"><RefreshCw className="spin"/><b>Reading plan…</b></div>:subscription?<div className="checkout-success"><span><Check/></span><Eyebrow>SUBSCRIPTION ACTIVE</Eyebrow><h1>You joined the current.</h1><p>Your first {plan.amount} USDC period reached {plan.merchant.name} directly.</p><div><small>NEXT RENEWAL</small><code>{subscription.currentPeriodEnd?new Date(subscription.currentPeriodEnd).toLocaleDateString():"Pending"}</code><small>PAYMENT MODEL</small><b>Explicit wallet approval each cycle</b></div><Button tone="dark" onClick={()=>go("subscriptions")}>Manage subscription <ArrowRight/></Button></div>:<><div className="checkout-merchant"><span>{plan.merchant.name.slice(0,1)}</span><div><small>MEMBERSHIP BY</small><b>{plan.merchant.name}</b></div><Status tone="cyan">Recurring</Status></div><div className="checkout-product"><Eyebrow>USDC SUBSCRIPTION</Eyebrow><h1>{plan.title}</h1><p>{plan.description||"A recurring membership settled directly on Arc."}</p><strong>{plan.amount}<small> USDC / {intervalLabel(plan.intervalDays)}</small></strong></div><div className="checkout-assurance"><span><ShieldCheck/><b>No silent charges</b><small>Approve each renewal</small></span><span><Wallet/><b>Walletless account</b><small>Circle embedded</small></span><span><ReceiptText/><b>Every cycle proven</b><small>Arc receipt</small></span></div>{!auth.account?<div className="checkout-auth"><h2>Start with an embedded wallet.</h2><p>No extension, seed phrase, or separate gas token required.</p><Button tone="blue" onClick={()=>{remember();void auth.startGoogle()}}>Continue with Google <ArrowRight/></Button><div><i/>or use email<i/></div><label>Email address<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label><Button tone="ghost" disabled={!email} onClick={()=>{remember();void auth.startEmail(email)}}>Continue with email</Button></div>:<div className="checkout-pay"><div><span>{auth.account.displayName.slice(0,1)}</span><p><small>SUBSCRIBING AS</small><b>{auth.account.displayName}</b></p><code>{auth.account.wallets.find(wallet=>wallet.blockchain==="ARC-TESTNET")?.address.slice(0,10)}…</code></div><Button tone="blue" disabled={busy} onClick={()=>void start()}>{busy?"Confirming on Arc…":`Start for ${plan.amount} USDC`} <ArrowRight/></Button><p>Current CoFi never receives the merchant’s funds and cannot renew without your wallet approval.</p></div>}{error&&<p className="auth-system-note is-error"><X/>{error}</p>}<footer><Lock/>Cancel anytime. No standing token allowance is created.</footer></>}</main></div>;
}

function SubscriptionsDashboard({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  const [state,setState]=useState<SubscriptionWorkspace|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [copied,setCopied]=useState<string|null>(null);
  const [title,setTitle]=useState("Current founding circle");const [description,setDescription]=useState("Recurring access, research, and community benefits.");const [amount,setAmount]=useState("15");const [intervalDays,setIntervalDays]=useState("30");
  const refresh=useCallback(async()=>{if(!auth.account)return;try{setState(await currentApi.get<SubscriptionWorkspace>("/subscriptions"));setError(null)}catch(loadError){setError(loadError instanceof Error?loadError.message:"Subscription data is unavailable.")}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const create=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);try{await currentApi.post("/subscriptions",{action:"create-plan",title,description,amount,intervalDays:Number(intervalDays)});await refresh()}catch(createError){setError(createError instanceof Error?createError.message:"Plan creation failed.")}finally{setBusy(false)}};
  const manage=async(subscription:SubscriptionRecord,action:"renew"|"cancel")=>{setBusy(true);setError(null);try{const prepared=await currentApi.post<{complete:boolean;paymentId?:string;challengeId?:string;subscription?:SubscriptionRecord}>("/subscriptions/actions",{action,subscriptionId:subscription.id});if(action==="renew"&&!prepared.complete&&prepared.challengeId&&prepared.paymentId){await auth.executeChallenge(prepared.challengeId);await confirmWalletAction("/subscriptions/actions",{action,subscriptionId:subscription.id,paymentId:prepared.paymentId},prepared.challengeId)}await refresh()}catch(actionError){setError(actionError instanceof Error?actionError.message:"Subscription action failed.")}finally{setBusy(false)}};
  const copy=async(plan:SubscriptionPlan)=>{if(!plan.subscribeUrl)return;await navigator.clipboard.writeText(plan.subscribeUrl);setCopied(plan.id);window.setTimeout(()=>setCopied(null),1800)};
  if(!auth.account)return <><PageHero eyebrow="RECURRING COMMERCE" title="Turn one claim into a lasting relationship." copy="Publish recurring USDC plans, onboard without wallets, and prove every explicitly approved renewal on Arc."/><div className="campaign-empty"><Repeat2/><h3>Connect your Current account</h3><p>Subscribers and merchants manage every recurring relationship from the same embedded wallet.</p><Button tone="blue" onClick={()=>go("claim")}>Sign in to continue <ArrowRight/></Button></div></>;
  return <><PageHero eyebrow="USDC SUBSCRIPTIONS" title="Recurring value, without hidden pulls." copy="Current schedules every period, reminds the subscriber, and settles each explicitly approved renewal directly to the merchant wallet."/><div className="commerce-metrics subscription-metrics"><MetricCard label="Plans" value={String(state?.totals.plans??0)} icon={Repeat2}/><MetricCard label="Active subscribers" value={String(state?.totals.activeSubscriptions??0)} icon={Users}/><MetricCard label="Confirmed cycles" value={String(state?.totals.payments??0)} icon={CheckCircle2}/><MetricCard label="Collected" value={`${state?.totals.collected??"0"} USDC`} icon={CircleDollarSign}/></div>{state&&<div className="subscription-lifecycle"><span className={state.totals.openRenewals?"attention":""}><Bell/><b>{state.totals.openRenewals}</b><small>renewals opening</small></span><span className={state.totals.pastDue?"overdue":""}><Clock3/><b>{state.totals.pastDue}</b><small>past due</small></span><p><ShieldCheck/><b>Daily lifecycle reconciliation</b><small>Each reminder is deduplicated, webhook-ready, and resolved after renewal or cancellation.</small></p></div>}{!state?.merchant?<div className="campaign-empty"><ShoppingBag/><h3>Open a merchant profile first</h3><p>Your Arc settlement wallet anchors checkout and subscription payments.</p><Button tone="blue" onClick={()=>go("commerce")}>Set up merchant profile <ArrowRight/></Button></div>:<><div className="subscription-grid"><form className="data-panel subscription-builder" onSubmit={event=>void create(event)}><div className="panel-head"><div><h3>Publish a plan</h3><p>Fixed-price USDC with explicit renewal approval.</p></div><Repeat2/></div><label>Plan name<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100}/></label><label>Description<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={500}/></label><div className="subscription-fields"><label>Price in USDC<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)}/></label><label>Billing interval<select value={intervalDays} onChange={event=>setIntervalDays(event.target.value)}><option value="7">Weekly</option><option value="30">Monthly</option><option value="90">Quarterly</option><option value="365">Yearly</option></select></label></div><div className="subscription-safety"><ShieldCheck/><span><b>Mandate-free recurring payments</b><small>The subscriber approves the exact transfer each cycle. Current never receives custody or creates a standing allowance.</small></span></div><Button tone="blue" type="submit" disabled={busy||!title||!amount}>Publish subscription <ArrowRight/></Button></form><div className="data-panel subscription-plan-list"><div className="panel-head"><div><h3>Live plans</h3><p>Shareable walletless membership links.</p></div><Status tone="green">{state.plans.filter(plan=>plan.status==="active").length} active</Status></div>{state.plans.map(plan=><article key={plan.id}><span><Repeat2/></span><div><b>{plan.title}</b><small>{plan.amount} USDC / {intervalLabel(plan.intervalDays)}</small></div><Status tone={plan.status==="active"?"green":"grey"}>{plan.status}</Status><button onClick={()=>void copy(plan)}>{copied===plan.id?<Check/>:<Copy/>}{copied===plan.id?"Copied":"Copy"}</button><a href={`#/subscribe/${plan.slug}`} target="_blank" rel="noreferrer"><ExternalLink/></a></article>)}{!state.plans.length&&<div className="campaign-empty compact"><Repeat2/><b>No subscription plans yet</b><p>Publish the first recurring current.</p></div>}</div></div><div className="data-panel subscriber-ledger"><div className="panel-head"><div><h3>Subscriber ledger</h3><p>Active periods, renewal readiness, and confirmed cycles.</p></div><Users/></div><div className="subscription-table"><div><span>Plan</span><span>Subscriber</span><span>Cycles</span><span>Period ends</span><span>Status</span></div>{state.merchantSubscriptions.map(subscription=><div key={subscription.id}><b>{subscription.plan.title}</b><code>{subscription.subscriberAddress.slice(0,8)}…{subscription.subscriberAddress.slice(-5)}</code><span>{subscription.cycleCount}</span><span>{subscription.currentPeriodEnd?new Date(subscription.currentPeriodEnd).toLocaleDateString():"Awaiting payment"}</span><Status tone={subscription.pastDue?"red":subscription.renewalDue?"cyan":subscription.status==="active"?"green":"grey"}>{subscription.pastDue?"past due":subscription.renewalDue?"renewal open":subscription.status}</Status></div>)}{!state.merchantSubscriptions.length&&<div className="campaign-empty compact"><Users/><b>No subscribers yet</b><p>Confirmed memberships will appear here.</p></div>}</div></div><div className="data-panel my-subscriptions"><div className="panel-head"><div><h3>My subscriptions</h3><p>Renew or cancel from the wallet that enrolled.</p></div><Wallet/></div>{state.subscriberSubscriptions.map(subscription=><article key={subscription.id}><span><b>{subscription.plan.title}</b><small>{subscription.plan.merchant.name} · {subscription.plan.amount} USDC / {intervalLabel(subscription.plan.intervalDays)}</small>{subscription.notices.some(notice=>notice.status==="open")&&<em className={subscription.pastDue?"overdue":""}><Bell/>{subscription.pastDue?"Renewal past due":"Renewal window open"}</em>}</span><span><small>CURRENT PERIOD</small><b>{subscription.currentPeriodEnd?new Date(subscription.currentPeriodEnd).toLocaleDateString():"Awaiting confirmation"}</b></span><Status tone={subscription.pastDue?"red":subscription.status==="active"?"green":"grey"}>{subscription.pastDue?"past due":subscription.status}</Status><div>{subscription.renewalDue&&<Button tone="blue" disabled={busy} onClick={()=>void manage(subscription,"renew")}>Renew now</Button>}{subscription.status==="active"&&<button disabled={busy} onClick={()=>void manage(subscription,"cancel")}>Cancel</button>}</div></article>)}{!state.subscriberSubscriptions.length&&<div className="campaign-empty compact"><Wallet/><b>No personal subscriptions</b><p>Plans you join will remain manageable here.</p></div>}</div></>}{error&&<p className="auth-system-note is-error"><X/>{error}</p>}</>;
}

/* eslint-disable react-hooks/purity, @next/next/no-img-element */
function HostedCheckout({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  const slug=typeof location==="undefined"?"":decodeURIComponent(location.hash.replace("#/checkout/",""));
  const [checkout,setCheckout]=useState<CheckoutRecord|null>(null);const [payment,setPayment]=useState<CheckoutPayment|null>(null);
  const [selectedToken,setSelectedToken]=useState("");const [quote,setQuote]=useState<CheckoutQuote|null>(null);const [quoteBusy,setQuoteBusy]=useState(false);const [stage,setStage]=useState<"idle"|"approval"|"settlement">("idle");
  const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{let active=true;currentApi.get<CheckoutRecord>(`/checkout/public?slug=${encodeURIComponent(slug)}`).then(value=>{if(active){setCheckout(value);setSelectedToken(value.paymentAssets[0]?.address??"")}}).catch(loadError=>{if(active)setError(loadError instanceof Error?loadError.message:"Checkout unavailable.")});return()=>{active=false}},[slug]);
  useEffect(()=>{if(!selectedToken||!checkout)return;let active=true;const task=window.setTimeout(()=>{setQuoteBusy(true);setQuote(null);currentApi.get<CheckoutQuote>(`/checkout/quote?slug=${encodeURIComponent(slug)}&tokenAddress=${encodeURIComponent(selectedToken)}`).then(value=>{if(active){setQuote(value);setError(null)}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"This settlement route is unavailable.")}).finally(()=>{if(active)setQuoteBusy(false)})},0);return()=>{active=false;window.clearTimeout(task)}},[checkout,selectedToken,slug]);
  const remember=()=>sessionStorage.setItem("current.auth.return",location.hash);
  const pay=async()=>{if(!auth.account||!quote)return;setBusy(true);setError(null);try{let result=await currentApi.post<{complete:boolean;phase?:"approval"|"settlement";paymentId?:string;challengeId?:string;payment?:CheckoutPayment}>("/checkout/pay",{slug,tokenAddress:selectedToken});for(let attempts=0;!result.complete&&attempts<3;attempts++){if(!result.challengeId||!result.paymentId)throw new Error("Wallet approval could not be prepared.");setStage(result.phase??"settlement");await auth.executeChallenge(result.challengeId);result=await confirmWalletAction("/checkout/pay",{slug,paymentId:result.paymentId},result.challengeId) as typeof result}if(result.payment)setPayment(result.payment);else if(!result.complete)throw new Error("The checkout did not reach final settlement.")}catch(payError){setError(payError instanceof Error?payError.message:"Payment could not be completed.")}finally{setBusy(false);setStage("idle")}};
  if(error&&!checkout)return <div className="hosted-checkout-page"><div className="checkout-card checkout-unavailable"><X/><h1>Checkout unavailable</h1><p>{error}</p><Button tone="dark" onClick={()=>go("home")}>Return to Current</Button></div></div>;
  return <div className="hosted-checkout-page"><header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Secured on Arc testnet</span></header><main className="checkout-card">{!checkout?<div className="checkout-loading"><RefreshCw className="spin"/><b>Reading checkout…</b></div>:payment?<div className="checkout-success"><span><Check/></span><Eyebrow>PAYMENT CONFIRMED</Eyebrow><h1>Your payment is flowing.</h1><p>You paid {payment.paymentAsset.amount} {payment.paymentAsset.symbol}. {payment.amount} USDC reached {checkout.merchant.name} on Arc testnet.</p><div><small>RECEIPT</small><code>{payment.receiptNumber}</code><small>ARC TRANSACTION</small>{payment.paymentTransactionHash?<a href={`https://testnet.arcscan.app/tx/${payment.paymentTransactionHash}`} target="_blank" rel="noreferrer">View settlement proof <ExternalLink/></a>:<b>Confirmed by Circle</b>}</div><Button tone="dark" onClick={()=>go("overview")}>Open your Current account <ArrowRight/></Button></div>:<><div className="checkout-merchant"><span>{checkout.merchant.logoUrl?<img src={checkout.merchant.logoUrl} alt=""/>:checkout.merchant.name.slice(0,1)}</span><div><small>PAYING</small><b>{checkout.merchant.name}</b></div><Status tone="green">Exact USDC settlement</Status></div><div className="checkout-product"><Eyebrow>MULTI-ASSET CHECKOUT</Eyebrow><h1>{checkout.title}</h1><p>{checkout.description||"A direct, verifiable payment settled through Current CoFi."}</p><strong>{checkout.amount}<small> USDC to merchant</small></strong></div>{checkout.paymentAssets.length>1&&<div className="checkout-asset-picker"><small>CHOOSE PAYMENT ASSET</small><div>{checkout.paymentAssets.map(asset=><button className={selectedToken.toLowerCase()===asset.address.toLowerCase()?"active":""} disabled={!asset.available||busy} onClick={()=>setSelectedToken(asset.address)} key={asset.address}><span>{asset.symbol==="USDC"?"$":"C"}</span><b>{asset.symbol}<small>{asset.settlement==="direct"?"Direct":"Converts to USDC"}</small></b>{selectedToken.toLowerCase()===asset.address.toLowerCase()&&<Check/>}</button>)}</div>{quoteBusy?<p><RefreshCw className="spin"/>Reading the Arc route…</p>:quote?<p><Waves/>You pay <b>{quote.amount} {quote.symbol}</b> · merchant receives <b>{quote.merchantReceives} USDC</b></p>:null}</div>}<div className="checkout-assurance"><span><ShieldCheck/><b>Exact approval</b><small>No unlimited allowance</small></span><span><Wallet/><b>User controlled</b><small>Circle embedded wallet</small></span><span><ReceiptText/><b>USDC settlement</b><small>Public Arc proof</small></span></div>{!auth.account?<div className="checkout-auth"><h2>Create your payment account.</h2><p>No extension, seed phrase, or separate gas token required.</p><Button tone="blue" onClick={()=>{remember();void auth.startGoogle()}}>Continue with Google <ArrowRight/></Button><div><i/>or use email<i/></div><label>Email address<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label><Button tone="ghost" disabled={!email} onClick={()=>{remember();void auth.startEmail(email)}}>Continue with email</Button></div>:<div className="checkout-pay"><div><span>{auth.account.displayName.slice(0,1)}</span><p><small>PAYING FROM</small><b>{auth.account.displayName}</b></p><code>{auth.account.wallets.find(wallet=>wallet.blockchain==="ARC-TESTNET")?.address.slice(0,10)}…</code></div><Button tone="blue" disabled={busy||quoteBusy||!quote} onClick={()=>void pay()}>{busy?(stage==="approval"?`Approving ${quote?.symbol??"asset"}…`:"Settling USDC on Arc…"):`Pay ${quote?.amount??"—"} ${quote?.symbol??""}`} <ArrowRight/></Button><p>{quote?.route==="direct"?"Your wallet sends USDC directly to the merchant.":"Two wallet confirmations: an exact token approval, then atomic USDC settlement. Refunds return USDC."}</p></div>}{error&&<p className="auth-system-note is-error"><X/>{error}</p>}<footer><Lock/>{checkout.settlementBoundary}</footer></>}</main></div>;
}

function MerchantCommerce({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  return <><section className="checkout-route-banner"><div><Waves/><span><small>MULTI-ASSET SETTLEMENT</small><b>Customers choose USDC or a qualified project token. Merchants still receive exact USDC.</b></span></div><p>Every token route is allowlisted onchain, uses an exact approval ceiling, and disappears automatically when the route is unavailable. The current fixed-rate route is Arc testnet proof only.</p><Status tone="cyan">Fail closed</Status></section><MerchantCommerceBase auth={auth} go={go}/></>;
}

function MerchantCommerceBase({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  const [state,setState]=useState<CommerceState|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [copied,setCopied]=useState<string|null>(null);
  const [merchantName,setMerchantName]=useState("Tidebreak Studio");const [description,setDescription]=useState("Community-native products settled in USDC.");
  const [title,setTitle]=useState("Founding membership");const [checkoutDescription,setCheckoutDescription]=useState("One-time access to the founding Current community.");const [amount,setAmount]=useState("25");
  const refresh=useCallback(async()=>{if(!auth.account)return;try{setState(await currentApi.get<CommerceState>("/merchant"));setError(null)}catch(loadError){setError(loadError instanceof Error?loadError.message:"Merchant data is unavailable.")}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const setup=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);try{await currentApi.post("/merchant",{action:"setup",displayName:merchantName,description});await refresh()}catch(setupError){setError(setupError instanceof Error?setupError.message:"Merchant setup failed.")}finally{setBusy(false)}};
  const create=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);try{await currentApi.post("/merchant",{action:"create-checkout",title,description:checkoutDescription,amount});await refresh()}catch(createError){setError(createError instanceof Error?createError.message:"Checkout creation failed.")}finally{setBusy(false)}};
  const refund=async(paymentId:string)=>{setBusy(true);try{const started=await currentApi.post<{complete:boolean;challengeId?:string}>("/checkout/refund",{paymentId});if(!started.complete&&started.challengeId){await auth.executeChallenge(started.challengeId);await confirmWalletAction("/checkout/refund",{paymentId},started.challengeId)}await refresh()}catch(refundError){setError(refundError instanceof Error?refundError.message:"Refund failed.")}finally{setBusy(false)}};
  const copy=async(checkout:CheckoutRecord)=>{if(!checkout.checkoutUrl)return;await navigator.clipboard.writeText(checkout.checkoutUrl);setCopied(checkout.id);window.setTimeout(()=>setCopied(null),1800)};
  if(!auth.account)return <><PageHero eyebrow="STABLECOIN COMMERCE" title="Turn every audience into a checkout." copy="Publish a walletless USDC checkout, settle directly to your Arc wallet, and keep a verifiable receipt for every payment."/><div className="campaign-empty"><Wallet/><h3>Connect your Current account</h3><p>Your embedded Arc wallet becomes the settlement and refund authority.</p><Button tone="blue" onClick={()=>go("claim")}>Sign in to continue <ArrowRight/></Button></div></>;
  return <><PageHero eyebrow="MERCHANT CHECKOUT" title="Sell through one Current." copy="Hosted links onboard the customer, approve an exact USDC payment, settle directly to your wallet, and expose the Arc proof." action={<Button tone="blue" onClick={()=>document.getElementById("new-checkout")?.scrollIntoView({behavior:"smooth"})}>New checkout <Plus/></Button>}/><div className="commerce-metrics"><MetricCard label="Checkout links" value={String(state?.totals.checkouts??0)} icon={Link2}/><MetricCard label="Confirmed payments" value={String(state?.totals.payments??0)} icon={CheckCircle2}/><MetricCard label="Testnet volume" value={`${state?.totals.volume??"0"} USDC`} icon={CircleDollarSign}/><MetricCard label="Refunded" value={String(state?.totals.refunds??0)} icon={ArrowLeft}/></div>{!state?.merchant?<form className="data-panel merchant-setup" onSubmit={event=>void setup(event)}><div><Eyebrow>MERCHANT PROFILE</Eyebrow><h2>Open your Current storefront.</h2><p>Your active Arc wallet becomes the exact settlement destination. It is also the only wallet permitted to issue refunds.</p></div><div className="field-grid"><label>Merchant name<input value={merchantName} onChange={event=>setMerchantName(event.target.value)}/></label><label className="full">Description<textarea value={description} onChange={event=>setDescription(event.target.value)}/></label><Button tone="blue" type="submit" disabled={busy}>Create merchant profile <ArrowRight/></Button></div></form>:<><div className="commerce-grid"><form id="new-checkout" className="data-panel checkout-builder" onSubmit={event=>void create(event)}><div className="panel-head"><div><h3>Publish a checkout</h3><p>Fixed-price USDC settlement on Arc testnet.</p></div><ShoppingBag/></div><label>Product or payment title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={100}/></label><label>Description<textarea value={checkoutDescription} onChange={event=>setCheckoutDescription(event.target.value)} maxLength={500}/></label><label>Price in USDC<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)}/></label><div className="checkout-total"><span><small>CUSTOMER PAYS</small><b>{amount||"0"} USDC</b></span><span><small>YOU RECEIVE</small><b>{amount||"0"} USDC</b></span></div><Button tone="blue" type="submit" disabled={busy||!title||!amount}>Publish checkout <ArrowRight/></Button></form><div className="data-panel checkout-list"><div className="panel-head"><div><h3>Live checkouts</h3><p>Walletless links ready to share.</p></div><Status tone="green">{state.checkouts.length} active</Status></div>{state.checkouts.map(checkout=><article key={checkout.id}><span><ShoppingBag/></span><div><b>{checkout.title}</b><small>{checkout.amount} USDC · {checkout.slug}</small></div><button onClick={()=>void copy(checkout)}>{copied===checkout.id?<Check/>:<Copy/>}{copied===checkout.id?"Copied":"Copy link"}</button><a href={`#/checkout/${checkout.slug}`} target="_blank" rel="noreferrer"><ExternalLink/></a></article>)}{!state.checkouts.length&&<div className="campaign-empty compact"><Link2/><b>No checkout links yet</b><p>Publish the first one from the builder.</p></div>}</div></div><div className="data-panel payment-ledger"><div className="panel-head"><div><h3>Settlement ledger</h3><p>Confirmed payments and merchant-authorized refunds.</p></div><ReceiptText/></div><div className="payment-table"><div><span>Receipt</span><span>Checkout</span><span>Customer</span><span>Amount</span><span>Status</span><span/></div>{state.payments.map(payment=><div key={payment.id}><code>{payment.receiptNumber}</code><span>{payment.checkout.title}</span><code>{payment.customerAddress.slice(0,8)}…{payment.customerAddress.slice(-5)}</code><b>{payment.amount} USDC</b><Status tone={payment.status==="confirmed"?"green":"grey"}>{payment.status}</Status><button disabled={busy||payment.status!=="confirmed"} onClick={()=>void refund(payment.id)}>{payment.status==="confirmed"?"Refund":"Closed"}</button></div>)}{!state.payments.length&&<div className="campaign-empty compact"><ReceiptText/><b>No settlements yet</b><p>Confirmed Arc payments will appear here with receipt numbers.</p></div>}</div></div></>}{error&&<p className="auth-system-note is-error"><X/>{error}</p>}</>;
}

function MilestoneEscrow({auth,go}:{auth:CircleAuth;go:(view:View)=>void}) {
  const futureDate=futureEscrowDate;
  const [state,setState]=useState<EscrowState|null>(null);
  const [creating,setCreating]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [name,setName]=useState("Creator launch package");
  const [tokenAddress,setTokenAddress]=useState("");
  const [providerAddress,setProviderAddress]=useState("");
  const [arbitratorAddress,setArbitratorAddress]=useState("");
  const [milestones,setMilestones]=useState([{title:"Creative direction",amount:"250",dueAt:futureEscrowDate(7)},{title:"Final delivery",amount:"750",dueAt:futureEscrowDate(14)}]);
  const [proofs,setProofs]=useState<Record<string,string>>({});
  const [awards,setAwards]=useState<Record<string,string>>({});
  const walletAddress=auth.account?.wallets.find(wallet=>wallet.blockchain==="ARC-TESTNET")?.address.toLowerCase()??"";
  const refresh=useCallback(async()=>{
    if(!auth.account)return;
    try{setState(await currentApi.get<EscrowState>("/escrow"));setError(null)}catch(loadError){setError(loadError instanceof Error?loadError.message:"Escrow agreements are unavailable.")}
  },[auth.account,setState]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  const challenge=async(agreementId:string,action:string,extra:Record<string,unknown>={})=>{
    const first=await currentApi.post<WalletActionResult>("/escrow/actions",{agreementId,action,...extra});
    if(!first.complete){if(!first.challengeId)throw new Error("Circle did not return the escrow approval.");await auth.executeChallenge(first.challengeId);await confirmWalletAction("/escrow/actions",{agreementId,action,...extra},first.challengeId)}
  };
  const create=async(event:React.FormEvent)=>{
    event.preventDefault();if(!auth.account){go("claim");return}setBusy(true);setError(null);
    try{
      const agreement=await currentApi.post<EscrowAgreement>("/escrow",{name,tokenAddress:tokenAddress||undefined,providerAddress,arbitratorAddress,milestones:milestones.map(item=>({...item,dueAt:new Date(item.dueAt).toISOString()}))});
      await challenge(agreement.id,"approve-token");await challenge(agreement.id,"fund");setCreating(false);await refresh();
    }catch(createError){setError(createError instanceof Error?createError.message:"The agreement could not be funded.")}finally{setBusy(false)}
  };
  const act=async(agreement:EscrowAgreement,action:string,position?:number)=>{
    setBusy(true);setError(null);
    try{const key=`${agreement.id}:${position??"deal"}`;await challenge(agreement.id,action,{...(position===undefined?{}:{position}),...(action==="submit"?{proof:proofs[key]??""}:{}),...(action==="resolve"?{providerAward:awards[key]??"0"}:{})});await refresh()}
    catch(actionError){setError(actionError instanceof Error?actionError.message:"The escrow action could not be completed.")}finally{setBusy(false)}
  };
  const updateMilestone=(index:number,key:"title"|"amount"|"dueAt",value:string)=>setMilestones(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  const totals=state?.agreements.reduce((current,agreement)=>({locked:current.locked+(agreement.status==="active"||agreement.status==="disputed"?Number(agreement.totalAmount)-Number(agreement.releasedAmount)-Number(agreement.refundedAmount):0),released:current.released+Number(agreement.releasedAmount),active:current.active+(agreement.status==="active"||agreement.status==="disputed"?1:0)}),{locked:0,released:0,active:0})??{locked:0,released:0,active:0};
  return <><PageHero eyebrow="PROGRAMMABLE ESCROW" title="Fund the promise. Release the proof." copy="Clients lock the complete USDC or project-token budget on Arc. Providers submit verifiable milestone proofs, clients release each payment, and a named arbitrator can resolve only the disputed milestone." mode="branches"><Button tone="cyan" onClick={()=>auth.account?setCreating(value=>!value):go("claim")}>{creating?"Close builder":"New agreement"} <Plus/></Button></PageHero>
    <div className="escrow-metrics"><MetricCard label="Active agreements" value={totals.active.toLocaleString()} icon={Lock}/><MetricCard label="Value secured" value={`${totals.locked.toLocaleString(undefined,{maximumFractionDigits:2})} USDC`} icon={ShieldCheck}/><MetricCard label="Released by proof" value={`${totals.released.toLocaleString(undefined,{maximumFractionDigits:2})} USDC`} icon={CheckCircle2}/><MetricCard label="Dispute boundary" value="One milestone" icon={SlidersHorizontal}/></div>
    {!auth.account&&<div className="campaign-empty"><Lock/><h3>Sign in to create or manage escrow</h3><p>Your embedded Arc wallet remains the client, provider, or arbitrator authority.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>}
    {creating&&auth.account&&<form className="escrow-builder data-panel" onSubmit={event=>void create(event)}><div className="panel-head"><div><Eyebrow>FULLY FUNDED AGREEMENT</Eyebrow><h3>Define the parties and release schedule.</h3><p>The terms digest and every milestone are committed before funds move.</p></div><Status tone="cyan">Arc testnet</Status></div><div className="field-grid"><label>Agreement name<input value={name} maxLength={100} onChange={event=>setName(event.target.value)}/></label><label>Asset contract<input value={tokenAddress} onChange={event=>setTokenAddress(event.target.value)} placeholder="Leave blank for USDC"/></label><label>Provider Arc address<input value={providerAddress} onChange={event=>setProviderAddress(event.target.value)} placeholder="0x…"/></label><label>Independent arbitrator<input value={arbitratorAddress} onChange={event=>setArbitratorAddress(event.target.value)} placeholder="0x…"/></label></div><div className="escrow-milestone-builder"><div className="panel-head"><div><h3>Milestones</h3><p>Deadlines must stay in chronological order.</p></div><button type="button" onClick={()=>setMilestones(current=>[...current,{title:"Next milestone",amount:"100",dueAt:futureDate(7+current.length*7)}])}><Plus/>Add milestone</button></div>{milestones.map((milestone,index)=><div className="escrow-milestone-input" key={index}><i>{index+1}</i><label>Deliverable<input value={milestone.title} onChange={event=>updateMilestone(index,"title",event.target.value)}/></label><label>Amount<input inputMode="decimal" value={milestone.amount} onChange={event=>updateMilestone(index,"amount",event.target.value)}/></label><label>Due date<input type="datetime-local" value={milestone.dueAt} onChange={event=>updateMilestone(index,"dueAt",event.target.value)}/></label>{milestones.length>1&&<button type="button" aria-label={`Remove milestone ${index+1}`} onClick={()=>setMilestones(current=>current.filter((_,itemIndex)=>itemIndex!==index))}><X/></button>}</div>)}</div><div className="escrow-funding-summary"><span><small>TOTAL SECURED</small><b>{milestones.reduce((sum,item)=>sum+(Number(item.amount)||0),0).toLocaleString()} {tokenAddress?"TOKEN":"USDC"}</b></span><span><small>RELEASE POLICY</small><b>Sequential proof + approval</b></span><span><small>RECOVERY</small><b>7-day overdue grace</b></span><Button tone="blue" type="submit" disabled={busy||!providerAddress||!arbitratorAddress}>{busy?"Opening wallet…":"Approve and fund agreement"} <Lock/></Button></div></form>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {auth.account&&<div className="escrow-agreement-list">{state?.agreements.map(agreement=>{const isClient=walletAddress===agreement.clientAddress;const isProvider=walletAddress===agreement.providerAddress;const isArbitrator=walletAddress===agreement.arbitratorAddress;const current=agreement.milestones.find(milestone=>milestone.position===agreement.nextMilestone);const key=`${agreement.id}:${current?.position??"deal"}`;return <article className="escrow-agreement data-panel" key={agreement.id}><div className="escrow-agreement-head"><div><Status tone={agreement.status==="completed"?"green":agreement.status==="disputed"?"red":"cyan"}>{agreement.status.replaceAll("_"," ")}</Status><h3>{agreement.name}</h3><p>{agreement.totalAmount} {agreement.asset.symbol} · {agreement.milestones.length} milestone{agreement.milestones.length===1?"":"s"}</p></div><div><small>YOUR ROLE</small><b>{isClient?"Client":isProvider?"Provider":isArbitrator?"Arbitrator":"Observer"}</b><code>{agreement.termsHash.slice(0,12)}…</code></div></div><div className="escrow-progress">{agreement.milestones.map(milestone=><div className={milestone.status} key={milestone.position}><i>{["released","refunded"].includes(milestone.status)?<Check/>:milestone.position+1}</i><span><b>{milestone.title}</b><small>{milestone.amount} {agreement.asset.symbol} · due {new Date(milestone.dueAt).toLocaleDateString()}</small></span><Status tone={milestone.status==="released"?"green":milestone.status==="disputed"?"red":"grey"}>{milestone.status}</Status></div>)}</div>{current&&agreement.status!=="completed"&&agreement.status!=="cancelled"&&<div className="escrow-action-dock"><div><small>CURRENT MILESTONE</small><b>{current.title}</b><span>{current.amount} {agreement.asset.symbol}</span></div>{isProvider&&current.status==="pending"&&<label>Delivery proof<input value={proofs[key]??""} onChange={event=>setProofs(values=>({...values,[key]:event.target.value}))} placeholder="IPFS CID, commit, file digest, or delivery reference"/></label>}{isArbitrator&&current.status==="disputed"&&<label>Provider award<input inputMode="decimal" value={awards[key]??current.amount} onChange={event=>setAwards(values=>({...values,[key]:event.target.value}))}/></label>}<div className="escrow-actions">{isProvider&&current.status==="pending"&&<Button tone="blue" disabled={busy||!proofs[key]} onClick={()=>void act(agreement,"submit",current.position)}>Submit proof <Upload/></Button>}{isClient&&current.status==="submitted"&&<><button disabled={busy} onClick={()=>void act(agreement,"dispute",current.position)}>Raise dispute</button><Button tone="blue" disabled={busy} onClick={()=>void act(agreement,"approve",current.position)}>Release milestone <Check/></Button></>}{isProvider&&current.status==="submitted"&&<button disabled={busy} onClick={()=>void act(agreement,"dispute",current.position)}>Raise dispute</button>}{isArbitrator&&current.status==="disputed"&&<Button tone="cyan" disabled={busy} onClick={()=>void act(agreement,"resolve",current.position)}>Resolve split <SlidersHorizontal/></Button>}{isClient&&current.status==="pending"&&<><button disabled={busy} onClick={()=>void act(agreement,"request-cancellation")}>Request cancellation</button><button disabled={busy||Date.now()<=new Date(current.dueAt).getTime()+7*86_400_000} onClick={()=>void act(agreement,"refund-expired",current.position)}>Recover overdue funds</button></>}{isProvider&&<button disabled={busy} onClick={()=>void act(agreement,"accept-cancellation")}>Accept cancellation</button>}</div></div>}<div className="escrow-proof"><span><small>CONTRACT DEAL</small><code>{agreement.contractDealId.slice(0,14)}…</code></span><span><small>RELEASED</small><b>{agreement.releasedAmount} {agreement.asset.symbol}</b></span><span><small>REFUNDED</small><b>{agreement.refundedAmount} {agreement.asset.symbol}</b></span>{agreement.fundingTransactionHash&&<a href={`https://testnet.arcscan.app/tx/${agreement.fundingTransactionHash}`} target="_blank" rel="noreferrer">Funding proof <ExternalLink/></a>}</div></article>})}{!state?.agreements.length&&!creating&&<div className="campaign-empty"><ShieldCheck/><h3>No escrow agreements yet</h3><p>Create a fully funded milestone agreement to establish the first verifiable release record.</p><Button tone="blue" onClick={()=>setCreating(true)}>Create agreement <Plus/></Button></div>}</div>}
  </>;
}
/* eslint-enable react-hooks/purity */

function DiscoveryNetwork() {
  const [state,setState]=useState<DiscoveryNetworkState|null>(null);
  const [filter,setFilter]=useState<"all"|DiscoveryOpportunity["kind"]>("all");
  const [query,setQuery]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [opening,setOpening]=useState<string|null>(null);
  const load=useCallback(()=>currentApi.get<DiscoveryNetworkState>("/discovery").then(setState).catch(value=>{
    if(location.hostname==="localhost"||location.hostname==="127.0.0.1")setState({schemaVersion:"current-discovery-v1",generatedAt:new Date().toISOString(),items:[],totals:{opportunities:0,drops:0,bounties:0,giveaways:0,fundedProjects:0,impressions:0,opens:0,participation:0},ranking:{order:"$CURRENT access tier, then recency",safetyGate:"Only open opportunities backed by an active, fully funded Arc campaign are eligible.",disclosure:"$CURRENT access can affect placement, never eligibility proof or endorsement. Every opportunity must pass the same funding and availability checks."},boundary:"Discovery is an index of verifiable Current opportunities, not an endorsement, investment recommendation, or guarantee of project quality."});
    else setError(value instanceof Error?value.message:"The discovery current is temporarily unavailable.");
  }),[]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(!state?.items.length)return;let visitor=localStorage.getItem("current.discovery.visitor");if(!visitor){visitor=crypto.randomUUID().replaceAll("-","");localStorage.setItem("current.discovery.visitor",visitor)}for(const item of state.items)void currentApi.post("/discovery",{resourceType:item.kind,resourceId:item.id,visitorId:visitor,eventType:"impression"}).catch(()=>undefined)},[state]);
  const items=useMemo(()=>state?.items.filter(item=>(filter==="all"||item.kind===filter)&&`${item.title} ${item.description} ${item.project.name} ${item.category} ${item.reward.symbol}`.toLowerCase().includes(query.trim().toLowerCase()))??[],[state,filter,query]);
  const icon=(kind:DiscoveryOpportunity["kind"])=>kind==="drop"?<Radio/>:kind==="bounty"?<Target/>:<Gift/>;
  const remaining=(item:DiscoveryOpportunity)=>item.progress.maximum===null?item.progress.label:`${Math.max(0,item.progress.maximum-item.progress.current).toLocaleString()} left`;
  const open=async(item:DiscoveryOpportunity)=>{setOpening(item.id);let visitor=localStorage.getItem("current.discovery.visitor");if(!visitor){visitor=crypto.randomUUID().replaceAll("-","");localStorage.setItem("current.discovery.visitor",visitor)}try{await currentApi.post("/discovery",{resourceType:item.kind,resourceId:item.id,visitorId:visitor,eventType:"open"})}catch{}location.assign(item.publicUrl)};
  return <div className="discovery-network">
    <section className="discovery-hero">
      <div className="discovery-current" aria-hidden="true"><i/><i/><i/><span><Compass/></span></div>
      <div><span className="eyebrow">CURRENT DISCOVERY NETWORK</span><h1>Find the next<br/><em>current.</em></h1><p>Explore funded USDC and project-token drops, bounties, and giveaways. Every listing is open, backed by a live Arc campaign, and ready for walletless participation.</p><div className="discovery-proof-row"><span><ShieldCheck/>Funding checked</span><span><Wallet/>No wallet required</span><span><Zap/>Gas sponsored</span></div></div>
      <aside><small>LIVE NETWORK</small><strong>{state?.totals.opportunities??"—"}</strong><span>open opportunities</span><dl><div><dt>{state?.totals.fundedProjects??"—"}</dt><dd>funded projects</dd></div><div><dt>{state?.totals.drops??"—"}</dt><dd>live drops</dd></div><div><dt>{state?.totals.bounties??"—"}</dt><dd>bounties</dd></div></dl></aside>
    </section>
    <section className="discovery-toolbar">
      <div className="discovery-tabs">{(["all","drop","bounty","giveaway"] as const).map(kind=><button className={filter===kind?"active":""} onClick={()=>setFilter(kind)} key={kind}>{kind==="all"?"All currents":kind==="drop"?"Drops":kind==="bounty"?"Bounties":"Giveaways"}<span>{kind==="all"?state?.totals.opportunities:kind==="drop"?state?.totals.drops:kind==="bounty"?state?.totals.bounties:state?.totals.giveaways}</span></button>)}</div>
      <label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects or opportunities"/></label>
    </section>
    {!state&&!error&&<div className="discovery-loading">{[0,1,2].map(item=><article key={item}><i/><i/><i/><i/></article>)}</div>}
    {error&&<div className="discovery-empty"><ShieldAlert/><h3>The current was interrupted.</h3><p>{error}</p><Button tone="blue" onClick={()=>{setError(null);void load()}}>Try again <RefreshCw/></Button></div>}
    {state&&items.length>0&&<section className="discovery-grid">{items.map((item,index)=><article className={`discovery-card kind-${item.kind}`} key={item.id}>
      <div className="discovery-card-top"><span className="discovery-kind">{icon(item.kind)}{item.kind}</span><span className={`discovery-tier tier-${item.placement.tier}`} title={item.placement.reason}>{item.placement.tier!=="standard"&&<Sparkles/>}{item.placement.label}</span></div>
      <div className="discovery-project"><span>{item.project.logoUrl?<img src={item.project.logoUrl} alt=""/>:item.project.name.slice(0,1).toUpperCase()}</span><div><small>BY</small><b>{item.project.name}</b></div><em>#{String(index+1).padStart(2,"0")}</em></div>
      <h2>{item.title}</h2><p>{item.description}</p>
      <div className="discovery-reward"><small>{item.kind==="drop"?"PER CLAIM":"REWARD"}</small><strong>{item.reward.amount} <em>{item.reward.symbol}</em></strong><span><BadgeCheck/> Fully funded</span></div>
      <div className="discovery-conversion" title={item.metrics.boundary}><span><small>DISCOVERY OPENS</small><b>{item.metrics.opens.toLocaleString()}</b></span><span><small>OPEN RATE</small><b>{item.metrics.openRate}%</b></span><span><small>{item.metrics.participationLabel.toUpperCase()}</small><b>{item.metrics.participation.toLocaleString()}</b></span></div>
      <div className="discovery-meta"><span><Clock3/>{item.closesAt?`Closes ${new Date(item.closesAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}`:"Open now"}</span><span><Users/>{remaining(item)}</span></div>
      <button className="discovery-open" disabled={opening===item.id} onClick={()=>void open(item)}>{opening===item.id?"Opening current…":"Open opportunity"} <ArrowUpRight/></button>
    </article>)}</section>}
    {state&&items.length===0&&<div className="discovery-empty"><Compass/><h3>No currents match that search.</h3><p>Clear the filters, or return when another fully funded opportunity opens.</p><button onClick={()=>{setFilter("all");setQuery("")}}>Clear filters</button></div>}
    {state&&<section className="discovery-policy"><ShieldCheck/><div><span>TRANSPARENT PLACEMENT + MEASUREMENT</span><h3>Access can improve placement. It cannot buy trust.</h3><p>{state.ranking.disclosure} Anonymous daily interactions are measured separately from reservations, entries, submissions, claims, and retained users. {state.boundary}</p></div><aside><small>NETWORK SIGNAL</small><b>{state.totals.impressions} impressions</b><b>{state.totals.opens} opportunity opens</b><b>{state.totals.participation} participation actions</b></aside></section>}
  </div>;
}

function BrandStudio({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const fallback:BrandWorkspace={name:"Tidebreak Labs",description:"A community economy flowing on Arc.",logoUrl:null,websiteUrl:"https://tidebreak.xyz/",brand:{primaryColor:"#0868B7",accentColor:"#22E4D5",successColor:"#00A94F",surface:"midnight",headline:"A funded current is waiting for you.",claimCta:"Claim your tokens",poweredByCurrent:true}};
  const [draft,setDraft]=useState<BrandWorkspace>(fallback);const [loading,setLoading]=useState(Boolean(auth.account));const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);const [error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setDraft(await currentApi.get<BrandWorkspace>("/brand"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Brand settings are unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(task)},[load]);
  const updateBrand=<K extends keyof ProjectBrand>(key:K,value:ProjectBrand[K])=>setDraft(current=>({...current,brand:{...current.brand,[key]:value}}));
  const save=async()=>{setSaving(true);setSaved(false);setError(null);try{setDraft(await currentApi.post<BrandWorkspace>("/brand",draft));setSaved(true)}catch(reason){setError(reason instanceof Error?reason.message:"The brand could not be saved.")}finally{setSaving(false)}};
  return <>
    <PageHero eyebrow="PROJECT BRAND STUDIO" title="Make every claim feel like your product." copy="Create one safe, reusable identity for hosted claims, drops, bounties, giveaways, and embedded activation experiences." mode="branches"><Status tone="cyan">Powered by Current</Status></PageHero>
    {!auth.account?<div className="campaign-empty brand-auth"><Lock/><h3>Open your workspace to publish a brand</h3><p>Preview the full studio now. Sign in when you are ready to save it to your project.</p><Button tone="blue" onClick={()=>go("claim")}>Open Current account <ArrowRight/></Button></div>:null}
    {loading?<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reading project identity</b><small>Loading the public theme shared by every hosted flow.</small></div></div>:<div className="brand-studio" style={brandStyle(draft.brand)}>
      <section className="brand-controls data-panel">
        <div className="panel-head"><div><h3>Brand system</h3><p>Only bounded colors, copy, and HTTPS assets are accepted. Custom scripts and CSS are never injected.</p></div>{saved&&<Status tone="green">Published</Status>}</div>
        <div className="brand-fields">
          <label>Project name<input value={draft.name} maxLength={80} onChange={event=>setDraft(current=>({...current,name:event.target.value}))}/></label>
          <label>Project website<input type="url" value={draft.websiteUrl??""} placeholder="https://…" onChange={event=>setDraft(current=>({...current,websiteUrl:event.target.value||null}))}/></label>
          <label className="wide">Short description<textarea value={draft.description??""} maxLength={500} onChange={event=>setDraft(current=>({...current,description:event.target.value||null}))}/></label>
          <label className="wide">HTTPS logo URL<input type="url" value={draft.logoUrl??""} placeholder="https://cdn.example/logo.svg" onChange={event=>setDraft(current=>({...current,logoUrl:event.target.value||null}))}/></label>
          <label className="wide">Claim headline<input value={draft.brand.headline} maxLength={120} onChange={event=>updateBrand("headline",event.target.value)}/></label>
          <label>Claim button<input value={draft.brand.claimCta} maxLength={40} onChange={event=>updateBrand("claimCta",event.target.value)}/></label>
          <label>Hosted surface<select value={draft.brand.surface} onChange={event=>updateBrand("surface",event.target.value as ProjectBrand["surface"])}><option value="midnight">Midnight current</option><option value="tide">Blue tide</option><option value="light">Clear water</option></select></label>
        </div>
        <div className="brand-palette">
          {([['primaryColor','Primary current'],['accentColor','Flow accent'],['successColor','Activation']] as const).map(([key,label])=><label key={key}><input type="color" value={draft.brand[key]} onChange={event=>updateBrand(key,event.target.value.toUpperCase())}/><span><b>{label}</b><code>{draft.brand[key]}</code></span></label>)}
        </div>
        <div className="brand-boundary"><ShieldCheck/><div><b>Trust stays visible</b><p>Every hosted surface keeps Arc testnet, funding, identity, and “Powered by Current” disclosures. A project can own its experience without obscuring settlement boundaries.</p></div></div>
        {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
        <div className="form-actions"><Button tone="ghost" onClick={()=>setDraft(fallback)}>Reset preview</Button><Button tone="blue" disabled={!auth.account||saving||draft.name.trim().length<2} onClick={()=>void save()}>{saving?"Publishing…":"Publish brand"} <ArrowRight/></Button></div>
      </section>
      <aside className={`brand-preview surface-${draft.brand.surface}`}>
        <header><span>LIVE HOSTED PREVIEW</span><i><b/>Arc testnet</i></header>
        <div className="brand-preview-current"><i/><i/><i/></div>
        <article>
          <div className="brand-preview-mark">{draft.logoUrl?<img src={draft.logoUrl} alt=""/>:draft.name.slice(0,1).toUpperCase()}</div>
          <small>{draft.name.toUpperCase()} SENT YOU</small><h2>2,500 <em>TIDE</em></h2><p>{draft.brand.headline}</p>
          <div><span><Clock3/>6 days remaining</span><span><Zap/>Gas sponsored</span></div>
          <button>{draft.brand.claimCta}<ArrowRight/></button><footer><ShieldCheck/>Powered by Current CoFi · Secured on Arc testnet</footer>
        </article>
        <div className="brand-preview-surfaces"><span>Claim links</span><span>Mass drops</span><span>Bounties</span><span>Giveaways</span><span>Embeds</span></div>
      </aside>
    </div>}
  </>;
}

const activityCategories=[{id:"all",label:"All activity"},{id:"access",label:"Access"},{id:"distribution",label:"Distribution"},{id:"settlement",label:"Settlement"},{id:"commerce",label:"Commerce"},{id:"developer",label:"Developer"},{id:"evidence",label:"Evidence"},{id:"protocol",label:"Protocol"},{id:"operations",label:"Operations"}];

function ActivityCenter({auth,go}:{auth:CircleAuth;go:(v:View)=>void}) {
  const [state,setState]=useState<ProjectActivityState|null>(null);const [loading,setLoading]=useState(Boolean(auth.account));const [error,setError]=useState<string|null>(null);const [category,setCategory]=useState("all");const [days,setDays]=useState("30");const [query,setQuery]=useState("");
  const queryString=useMemo(()=>{const params=new URLSearchParams({days});if(category!=="all")params.set("category",category);if(query.trim())params.set("query",query.trim());return params.toString()},[category,days,query]);
  const load=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<ProjectActivityState>(`/activity?${queryString}`));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Project activity is unavailable.")}finally{setLoading(false)}},[auth.account,queryString]);
  useEffect(()=>{const task=window.setTimeout(()=>void load(),query?260:0);return()=>window.clearTimeout(task)},[load,query]);
  const exportCsv=()=>{const anchor=document.createElement("a");anchor.href=`/api/v1/activity?${queryString}&format=csv`;anchor.download="current-project-activity.csv";anchor.click()};
  const relative=(value:string)=>new Date(value).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  return <><PageHero eyebrow="PROJECT OPERATIONS" title="Every important action. One accountable current." copy="Review who changed access, prepared distributions, moved value, called integrations, and published grant evidence—without exposing recipient identities or secrets." mode="branches"><Button tone="cyan" disabled={!auth.account||!state?.events.length} onClick={exportCsv}>Export audit CSV <Download/></Button></PageHero>
    {!auth.account?<div className="campaign-empty activity-auth"><Lock/><h3>Project membership required</h3><p>The activity ledger contains private operational history. Open your Current account to enter the active workspace.</p><Button tone="blue" onClick={()=>go("claim")}>Open account <ArrowRight/></Button></div>:<>
      <section className="activity-toolbar data-panel"><div className="activity-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search actions, actors, or resources" aria-label="Search project activity"/></div><select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Activity category">{activityCategories.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select><select value={days} onChange={event=>setDays(event.target.value)} aria-label="Activity range"><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button onClick={()=>void load()} aria-label="Refresh activity"><RefreshCw className={loading?"spin":""}/></button></section>
      {error&&<div className="discovery-empty"><ShieldAlert/><h3>The activity current was interrupted.</h3><p>{error}</p><Button tone="blue" onClick={()=>void load()}>Try again <RefreshCw/></Button></div>}
      {state&&<div className="activity-metrics"><MetricCard label="Recorded events" value={state.totals.events.toLocaleString()} icon={Activity}/><MetricCard label="Distinct actors" value={state.totals.actors.toLocaleString()} icon={Users}/><MetricCard label="Value-flow actions" value={state.totals.financial.toLocaleString()} icon={CircleDollarSign}/><MetricCard label="Needs attention" value={state.totals.attention.toLocaleString()} icon={ShieldAlert}/></div>}
      <section className="activity-ledger data-panel"><div className="panel-head"><div><h3>Workspace activity ledger</h3><p>{state?`${state.totals.filtered} matching event${state.totals.filtered===1?"":"s"} · ${state.viewerRole} access`:"Reading the project ledger…"}</p></div><Status tone="green">Privacy filtered</Status></div>
        {loading&&!state?<div className="activity-loading">{[1,2,3,4,5].map(item=><i key={item}/>)}</div>:null}
        {!loading&&state?.events.map(event=><article className={`activity-event tone-${event.tone}`} key={event.id}><span className={`activity-category category-${event.category}`}>{event.category.slice(0,2).toUpperCase()}</span><div className="activity-event-main"><header><b>{event.label}</b><Status tone={event.tone==="success"?"green":event.tone==="attention"?"red":"grey"}>{event.category}</Status></header><p><strong>{event.actor.name}</strong>{event.actor.detail?` · ${event.actor.detail}`:""} · {event.resource.type}{event.resource.id?` · ${event.resource.id}`:""}</p>{Object.keys(event.metadata).length?<div className="activity-metadata">{Object.entries(event.metadata).slice(0,5).map(([key,value])=><span key={key}><small>{key.replace(/([A-Z])/g," $1")}</small><code>{String(value)}</code></span>)}</div>:null}</div><time title={new Date(event.createdAt).toLocaleString()}>{relative(event.createdAt)}</time></article>)}
        {!loading&&state&&!state.events.length?<div className="campaign-empty compact"><Activity/><b>No matching project activity</b><p>Try a wider date range or clear the current filters.</p><button onClick={()=>{setCategory("all");setQuery("");setDays("30")}}>Clear filters</button></div>:null}
      </section>
      {state&&<section className="activity-privacy"><ShieldCheck/><div><b>Useful accountability without identity leakage</b><p>{state.privacy}</p></div><span>{state.range.days} day window · capped at {state.range.cappedAt.toLocaleString()} source events</span></section>}
    </>}
  </>;
}

function MembersSettings({auth}:{auth:CircleAuth}) {
  const invitationToken=typeof location!=="undefined"?new URLSearchParams(location.search).get("workspaceInvite"):null;
  const [state,setState]=useState<WorkspaceState|null>(null);const [preview,setPreview]=useState<PublicWorkspaceInvitation|null>(null);const [loading,setLoading]=useState(Boolean(auth.account));const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);const [inviteEmail,setInviteEmail]=useState("");const [inviteRole,setInviteRole]=useState<WorkspaceRole>("operator");const [createdLink,setCreatedLink]=useState<string|null>(null);
  const refresh=useCallback(async()=>{if(!auth.account){setLoading(false);return}setLoading(true);try{setState(await currentApi.get<WorkspaceState>("/workspaces"));setError(null)}catch(reason){setError(reason instanceof Error?reason.message:"Workspace access is unavailable.")}finally{setLoading(false)}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(task)},[refresh]);
  useEffect(()=>{if(!invitationToken)return;currentApi.get<PublicWorkspaceInvitation>(`/workspaces/invitation?token=${encodeURIComponent(invitationToken)}`).then(setPreview).catch(reason=>setError(reason instanceof Error?reason.message:"This workspace invitation is unavailable."))},[invitationToken]);
  const action=async(body:Record<string,unknown>,key:string)=>{setBusy(key);setError(null);try{await currentApi.post("/workspaces",body);await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The workspace change could not be completed.")}finally{setBusy(null)}};
  const invite=async()=>{setBusy("invite");setError(null);setCreatedLink(null);try{const result=await currentApi.post<{inviteUrl:string}>("/workspaces",{action:"invite",email:inviteEmail,role:inviteRole});setCreatedLink(result.inviteUrl);setInviteEmail("");await refresh()}catch(reason){setError(reason instanceof Error?reason.message:"The invitation could not be created.")}finally{setBusy(null)}};
  const accept=async()=>{if(!invitationToken)return;setBusy("accept");setError(null);try{await currentApi.post("/workspaces/invitation",{token:invitationToken});history.replaceState(null,"",`${location.pathname}#/members`);location.reload()}catch(reason){setError(reason instanceof Error?reason.message:"The invitation could not be accepted.");setBusy(null)}};
  if(!auth.account)return <section className="settings-panel members-panel"><div className="workspace-empty"><Lock/><h3>Open your Current account</h3><p>Sign in with the email address that received the invitation. Wallet access never transfers to the project.</p></div></section>;
  return <section className="settings-panel members-panel"><div className="panel-head"><div><h3>Members & workspaces</h3><p>Invite collaborators with the smallest role they need, then switch every Current surface into the right project.</p></div><Status tone="green">Server-enforced RBAC</Status></div>
    {preview&&<div className="workspace-invite-preview"><span>{preview.project.logoUrl?<img src={preview.project.logoUrl} alt=""/>:preview.project.name.slice(0,2).toUpperCase()}</span><div><Eyebrow>WORKSPACE INVITATION</Eyebrow><h3>Join {preview.project.name}</h3><p>{preview.invitation.maskedEmail} · {preview.invitation.role} access · expires {new Date(preview.invitation.expiresAt).toLocaleDateString()}</p></div><Button tone="blue" disabled={busy==="accept"} onClick={()=>void accept()}>{busy==="accept"?"Joining…":"Accept invitation"} <ArrowRight/></Button></div>}
    {loading&&<div className="evidence-loading"><RefreshCw className="spin"/><div><b>Reconciling workspace access</b><small>Reading active membership, invitations, and role boundaries.</small></div></div>}
    {error&&<p className="auth-system-note is-error"><X/>{error}</p>}
    {!loading&&state&&<><div className="workspace-summary"><div><small>ACTIVE WORKSPACE</small><strong>{state.workspaces.find(item=>item.active)?.name}</strong><p>Your role: {state.currentRole}</p></div><div><small>TEAM</small><strong>{state.members.length}</strong><p>Verified Current accounts</p></div><div><small>PENDING</small><strong>{state.invitations.filter(item=>item.status==="pending").length}</strong><p>Seven-day secure links</p></div></div>
      {state.canManage&&<div className="member-invite-form"><div><h4>Invite a collaborator</h4><p>The link is shown once. Current stores only a hash and masked email.</p></div><input type="email" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="builder@project.xyz"/><select value={inviteRole} onChange={event=>setInviteRole(event.target.value as WorkspaceRole)}><option value="admin">Admin</option><option value="operator">Operator</option><option value="analyst">Analyst</option><option value="developer">Developer</option></select><Button tone="blue" disabled={!inviteEmail||busy!==null} onClick={()=>void invite()}>{busy==="invite"?"Securing…":"Create invite"} <Plus/></Button></div>}
      {createdLink&&<div className="workspace-secret"><ShieldCheck/><div><b>Invitation link created</b><code>{createdLink}</code><small>Copy it now. The secret cannot be recovered later.</small></div><button onClick={()=>void navigator.clipboard.writeText(createdLink)} aria-label="Copy invitation"><Copy/></button></div>}
      <div className="workspace-member-list"><div className="workspace-list-head"><b>Project members</b><span>{state.members.length} accounts</span></div>{state.members.map(member=><article key={member.userId}><i>{member.avatarUrl?<img src={member.avatarUrl} alt=""/>:member.displayName.slice(0,2).toUpperCase()}</i><div><b>{member.displayName}{member.isCurrentUser&&<em>You</em>}</b><small>@{member.username} · joined {new Date(member.joinedAt).toLocaleDateString()}</small></div>{member.role==="owner"||!state.canManage||member.isCurrentUser?<Status tone={member.role==="owner"?"green":"cyan"}>{member.role}</Status>:<><select value={member.role} disabled={busy!==null} onChange={event=>void action({action:"update-role",userId:member.userId,role:event.target.value},`role:${member.userId}`)}><option value="admin">Admin</option><option value="operator">Operator</option><option value="analyst">Analyst</option><option value="developer">Developer</option></select><button disabled={busy!==null} onClick={()=>void action({action:"remove-member",userId:member.userId},`remove:${member.userId}`)} aria-label={`Remove ${member.displayName}`}><X/></button></>}</article>)}</div>
      {!!state.invitations.length&&<div className="workspace-invitation-list"><div className="workspace-list-head"><b>Invitation history</b><span>Emails stay masked</span></div>{state.invitations.map(inviteRow=><article key={inviteRow.id}><MailIcon/><div><b>{inviteRow.maskedEmail}</b><small>{inviteRow.role} · expires {new Date(inviteRow.expiresAt).toLocaleDateString()}</small></div><Status tone={inviteRow.status==="pending"?"blue":inviteRow.status==="accepted"?"green":"grey"}>{inviteRow.status}</Status>{inviteRow.status==="pending"&&state.canManage&&<button disabled={busy!==null} onClick={()=>void action({action:"revoke-invitation",invitationId:inviteRow.id},`revoke:${inviteRow.id}`)}>Revoke</button>}</article>)}</div>}
      <div className="workspace-role-guide">{[{role:"Admin",copy:"Members, campaigns, and operations."},{role:"Operator",copy:"Campaign and settlement operations."},{role:"Analyst",copy:"Workspace review; fund operations blocked."},{role:"Developer",copy:"Workspace context; credentials remain separately scoped."}].map(item=><span key={item.role}><b>{item.role}</b><small>{item.copy}</small></span>)}</div></>}
  </section>;
}

function WorkspaceSwitch({auth}:{auth:CircleAuth}) {
  const [state,setState]=useState<WorkspaceState|null>(null);const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!auth.account)return;currentApi.get<WorkspaceState>("/workspaces").then(setState).catch(()=>undefined)},[auth.account]);
  const active=state?.workspaces.find(item=>item.active);
  const switchTo=async(projectId:string)=>{if(projectId===state?.activeProjectId){setOpen(false);return}setBusy(true);try{await currentApi.post("/workspaces",{action:"switch",projectId});location.reload()}finally{setBusy(false)}};
  return <div className={`project-switch workspace-switch ${open?"is-open":""}`}><button onClick={()=>setOpen(current=>!current)} disabled={!auth.account||busy}><span>{active?.logoUrl?<img src={active.logoUrl} alt=""/>:(active?.name??"Current").slice(0,1)}</span><div><b>{active?.name??"Preview workspace"}</b><small>{active?`${active.role} · Arc testnet`:"Arc testnet"}</small></div><ChevronDown/></button>{open&&<div className="workspace-switch-menu">{state?.workspaces.map(item=><button key={item.id} onClick={()=>void switchTo(item.id)}><i>{item.logoUrl?<img src={item.logoUrl} alt=""/>:item.name.slice(0,1)}</i><span><b>{item.name}</b><small>{item.role}</small></span>{item.active&&<Check/>}</button>)}<button className="workspace-manage" onClick={()=>{location.hash="/members";setOpen(false)}}><Settings/>Manage access</button></div>}</div>;
}

function MailIcon(){return <span className="workspace-mail">@</span>}

function WorkspaceMembersPage({auth}:{auth:CircleAuth}) {
  return <><PageHero eyebrow="PROJECT COLLABORATION" title="One project. Precisely scoped access." copy="Invite the team through private, email-bound links and keep every campaign, API key, and Arc approval inside the active workspace."/><div className="workspace-page-switch"><WorkspaceSwitch auth={auth}/><div><b>Active workspace boundary</b><small>Switching changes the project scope used by every Current API and dashboard.</small></div></div><MembersSettings auth={auth}/></>;
}

function SettingsView({auth}:{auth:CircleAuth}) {
  const identityReturn=typeof location!=="undefined"?new URLSearchParams(location.search):new URLSearchParams();
  const [saved,setSaved]=useState(false);const [tab,setTab]=useState<"general"|"identity">(()=>identityReturn.has("identityLinked")||identityReturn.has("identityError")?"identity":"general");const [identityState,setIdentityState]=useState<IdentityWorkspace|null>(null);const [identityError,setIdentityError]=useState<string|null>(()=>identityReturn.has("identityError")?"The social identity could not be linked. Please try again.":null);const [linking,setLinking]=useState<string|null>(null);
  const refreshIdentities=useCallback(async()=>{if(!auth.account)return;try{setIdentityState(await currentApi.get<IdentityWorkspace>("/auth/identities"));setIdentityError(null)}catch(error){setIdentityError(error instanceof Error?error.message:"Connected identities are unavailable.")}},[auth.account]);
  useEffect(()=>{const task=window.setTimeout(()=>{if(auth.account)void refreshIdentities()},0);return()=>window.clearTimeout(task)},[auth.account,refreshIdentities]);
  useEffect(()=>{if(identityReturn.has("identityLinked")||identityReturn.has("identityError"))history.replaceState(null,"",`${location.pathname}${location.hash}`)},[]); // eslint-disable-line react-hooks/exhaustive-deps
  const connect=async(provider:"x"|"discord")=>{setLinking(provider);setIdentityError(null);try{const result=await currentApi.post<{authorizeUrl:string}>("/auth/identities",{provider});location.assign(result.authorizeUrl)}catch(error){setIdentityError(error instanceof Error?error.message:"The identity provider is unavailable.");setLinking(null)}};
  const identityProviders=[{id:"x" as const,name:"X",detail:"Bind campaign claims and community attribution to a verified X account."},{id:"discord" as const,name:"Discord",detail:"Connect community membership and role-based activation events."},{id:"telegram" as const,name:"Telegram",detail:"Verify recipients through Current's signed bot-login adapter."}];
  return <><PageHero eyebrow="ORGANIZATION CONTROL" title="A calm center for the whole network." copy="Manage identity, project branding, members, security, notifications, billing, and network preferences."/><div className="settings-shell"><div className="settings-tabs"><button className={tab==="general"?"active":""} onClick={()=>setTab("general")}>General</button><button className={tab==="identity"?"active":""} onClick={()=>setTab("identity")}>Identity & access</button><button>Members</button><button>Billing</button><button>Notifications</button></div>{tab==="general"?<form className="settings-panel" onSubmit={e=>{e.preventDefault();setSaved(true)}}><div className="panel-head"><div><h3>Organization profile</h3><p>Public details used across claims and campaigns.</p></div>{saved&&<Status tone="green">Changes saved</Status>}</div><div className="profile-uploader"><span>T</span><div><b>Project mark</b><small>SVG, PNG, or WebP · 2MB maximum</small></div><Button tone="ghost">Replace image</Button></div><div className="field-grid"><label>Organization name<input defaultValue="Tidebreak Labs"/></label><label>Current username<div className="input-prefix"><span>current.co/</span><input defaultValue="tidebreak"/></div></label><label>Website<input defaultValue="https://tidebreak.xyz"/></label><label>Default network<select><option>Arc testnet</option></select></label><label className="full">Description<textarea defaultValue="The team building Tidebreak and its community economy."/></label></div><div className="form-actions"><Button tone="ghost">Discard</Button><Button tone="blue" type="submit">Save changes</Button></div><div className="danger-zone"><div><b>Delete organization</b><p>Removes offchain data after all campaigns and balances are settled.</p></div><button>Delete</button></div></form>:<section className="settings-panel identity-access-panel"><div className="panel-head"><div><h3>Identity & access</h3><p>Circle secures wallet login. Current links community identities without letting them authorize wallet transactions.</p></div><Status tone={auth.account?"green":"grey"}>{auth.account?"Wallet secured":"Sign in required"}</Status></div><div className="wallet-auth-methods">{[{id:"google",name:"Google",mark:"G",detail:"Circle wallet login"},{id:"email",name:"Email",mark:"@",detail:"One-time code · no password"},{id:"apple",name:"Apple",mark:"●",detail:"Circle wallet login"},{id:"facebook",name:"Facebook",mark:"f",detail:"Circle wallet login"}].map(provider=>{const live=auth.config?.methods[provider.id as keyof typeof auth.config.methods];return <article key={provider.id}><span>{provider.mark}</span><div><b>{provider.name}</b><small>{provider.detail}</small></div><Status tone={live?"green":"grey"}>{live?"Live":provider.id==="google"||provider.id==="email"?"Pending":"Credentials needed"}</Status></article>})}</div><div className="identity-boundary"><ShieldCheck/><div><b>Two-layer identity boundary</b><p>Google, email, Apple, or Facebook create the user-controlled Circle wallet. X, Discord, and Telegram prove campaign eligibility and attribution, but never approve asset movement.</p></div></div><div className="linked-identity-list">{identityProviders.map(provider=>{const linked=identityState?.identities.find(identity=>identity.provider===provider.id);const available=identityState?.available[provider.id]??auth.config?.linkedIdentities[provider.id]??false;return <article key={provider.id}><span>{provider.id==="x"?"𝕏":provider.id==="discord"?"D":"T"}</span><div><b>{provider.name}</b><p>{linked?`Connected${linked.profile.username?` as @${linked.profile.username}`:""}`:provider.detail}</p></div>{linked?<Status tone="green">Verified</Status>:provider.id==="telegram"?<button disabled>{available?"Open Telegram":"Bot credentials needed"}</button>:<button disabled={!auth.account||!available||linking!==null} onClick={()=>void connect(provider.id)}>{linking===provider.id?"Opening…":available?`Connect ${provider.name}`:"Credentials needed"}</button>}</article>})}</div>{!auth.account&&<p className="auth-system-note"><Lock/>Open a Current wallet before linking a community identity.</p>}{identityError&&<p className="auth-system-note is-error"><X/>{identityError}</p>}</section>}</div></>;
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
    case "account":page=<AccountPortfolio go={go} auth={auth}/>;break;
    case "create":page=<CreateLink auth={auth} go={go}/>;break;
    case "payments":page=<SocialPayments auth={auth} go={go}/>;break;
    case "onboarding":page=<ProjectOnboarding go={go} auth={auth}/>;break;
    case "members":page=<WorkspaceMembersPage auth={auth}/>;break;
    case "activity":page=<ActivityCenter auth={auth} go={go}/>;break;
    case "campaigns":page=<Campaigns go={go} auth={auth}/>;break;
    case "discover":page=<DiscoveryNetwork/>;break;
    case "drops":page=<PublicMassDrops go={go} auth={auth}/>;break;
    case "bounties":page=<CommunityBounties go={go} auth={auth}/>;break;
    case "giveaways":page=<CommunityGiveaways go={go} auth={auth}/>;break;
    case "vesting":page=<LaunchVesting go={go} auth={auth}/>;break;
    case "payroll":page=<CommunityPayroll go={go} auth={auth}/>;break;
    case "treasury":page=<CommunityTreasury go={go} auth={auth}/>;break;
    case "new-campaign":page=<CampaignBuilder go={go} auth={auth}/>;break;
    case "funding":page=<CrosschainFunding go={go} auth={auth}/>;break;
    case "recipients":page=<Recipients auth={auth} go={go}/>;break;
    case "deliveries":page=<CampaignDeliveryCenter auth={auth} go={go}/>;break;
    case "referrals":page=<Referrals auth={auth} go={go}/>;break;
    case "analytics":page=<Analytics auth={auth} go={go}/>;break;
    case "pilots":page=<PilotOperations auth={auth} go={go}/>;break;
    case "evidence":page=<Evidence auth={auth} go={go}/>;break;
    case "grant":page=<GrantReviewRoom auth={auth} go={go}/>;break;
    case "token":page=<TokenDashboard auth={auth} go={go}/>;break;
    case "partners":page=<PartnerVaultDashboard go={go}/>;break;
    case "venues":page=<VenueRegistryDashboard go={go}/>;break;
    case "launch":page=<LaunchReadinessDashboard go={go}/>;break;
    case "operations":page=<OperationsDashboard auth={auth} go={go}/>;break;
    case "asset-trust":page=<AssetTrustDashboard auth={auth} go={go}/>;break;
    case "security":page=<SecurityDashboard go={go}/>;break;
    case "escrow":page=<MilestoneEscrow auth={auth} go={go}/>;break;
    case "commerce":page=<MerchantCommerce auth={auth} go={go}/>;break;
    case "subscriptions":page=<SubscriptionsDashboard auth={auth} go={go}/>;break;
    case "developers":page=<Developers go={go}/>;break;
    case "integration-lab":page=<BuilderIntegrationLab auth={auth} go={go}/>;break;
    case "api-keys":page=<ApiKeys auth={auth} go={go}/>;break;
    case "webhooks":page=<WebhooksView auth={auth} go={go}/>;break;
    case "agents":page=<Agents auth={auth} go={go}/>;break;
    case "brand":page=<BrandStudio auth={auth} go={go}/>;break;
    case "settings":page=<SettingsView auth={auth}/>;break;
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
    const returnHash=sessionStorage.getItem("current.auth.return");
    if(auth.state==="authenticated"&&(returnHash?.startsWith("#/checkout/")||returnHash?.startsWith("#/subscribe/")||returnHash?.startsWith("#/pay/"))){sessionStorage.removeItem("current.auth.return");history.replaceState(null,"",`${location.pathname}${location.search}${returnHash}`);const task=window.setTimeout(()=>setView(returnHash.startsWith("#/subscribe/")?"subscribe":returnHash.startsWith("#/pay/")?"pay":"checkout"),0);return()=>window.clearTimeout(task)}
    history.replaceState(null, "", `${location.pathname}${location.search}#/claim`);
  },[auth.state]);
  const go=(next:View)=>{
    if(next===view)return;
    setTransition(true);
    setTimeout(()=>{setView(next); location.hash=`/${next}`; scrollTo({top:0,behavior:"instant" as ScrollBehavior}); setTimeout(()=>setTransition(false),120)},260);
  };
  return <><div className={`route-current ${transition?"active":""}`} aria-hidden="true"><i/></div>{view==="home"?<Marketing go={go}/>:view==="claim"?<ClaimView go={go} auth={auth}/>:view==="pay"?<HostedSocialPayment go={go} auth={auth}/>:view==="bounty"?<HostedBounty go={go}/>:view==="drop"?<HostedPublicDrop go={go}/>:view==="giveaway"?<HostedGiveaway go={go}/>:view==="vesting-claim"?<HostedVesting go={go}/>:view==="public-treasury"?<PublicTreasury go={go}/>:view==="checkout"?<HostedCheckout go={go} auth={auth}/>:view==="subscribe"?<HostedSubscription go={go} auth={auth}/>:view==="certification"?<IntegrationCertificateView go={go}/>:view==="network-proof"?<NetworkProofView go={go}/>:view==="grant-dossier"?<GrantDossierView go={go}/>:view==="grant-application"?<GrantApplicationView go={go}/>:view==="proof-explorer"?<CampaignProofExplorerView go={go}/>:view==="reviewer-demo"?<ReviewerDemoView go={go}/>:view==="project-token-proof"?<ProjectTokenProofView go={go}/>:view==="proof-health"?<GrantProofHealthView go={go}/>:<AppShell view={view} go={go} auth={auth}/>}</>;
}
