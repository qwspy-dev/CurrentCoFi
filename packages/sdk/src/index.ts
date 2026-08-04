export type CurrentRecipient = {
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  amount: string;
};

export type ProjectBrand = {
  name: string; description: string | null; logoUrl: string | null; websiteUrl: string | null;
  brand: { primaryColor: string; accentColor: string; successColor: string; surface: "midnight" | "tide" | "light"; headline: string; claimCta: string; poweredByCurrent: true };
};

export type IntegrationManifest = {
  schemaVersion: string; product: string; network: string; message: string; publishedAt: string; digest: string;
  paths: Array<{ id: string; label: string; bestFor: string; package?: string; spec?: string; manifest?: string }>;
  circleStack: readonly string[];
  endpoints: Array<{ method: string; path: string; purpose: string; permission: string; signed: boolean }>;
  webhookEvents: readonly string[]; security: readonly string[];
};

export type IntegrationReadiness = {
  schemaVersion: string; projectId: string; score: number; level: "foundation" | "integrating" | "pilot-ready" | "grant-ready";
  completed: number; total: number; generatedAt: string;
  checks: Array<{ id: string; label: string; detail: string; weight: number; complete: boolean; count: number }>;
  next: { id: string; label: string; detail: string; weight: number; complete: boolean; count: number } | null;
};

export type IntegrationCertificate = {
  token: string; digest: string; publicUrl: string;
  certificate: {
    schemaVersion: string; subject: { projectRef: string; projectName: string };
    issuer: { name: string; network: string }; status: "progress" | "integration-verified" | "grant-ready";
    score: number; completed: number; total: number; manifestDigest: string; issuedAt: string; expiresAt: string;
    checks: Array<{ id: string; label: string; weight: number; count: number; complete: boolean }>;
  };
};

export type NetworkProof = {
  schemaVersion: string; product: string; network: string; configured: boolean;
  valueStatus: string; dataMode: string; asOf: string; digest: string;
  totals: { projects: number; campaigns: number; recipientsTargeted: number; confirmedClaims: number; fundedWallets: number; activatedUsers: number; activationEvents: number; usdcClaimedAtomic: string; projectTokenCampaigns: number };
  rates: { claimRate: number; activationRate: number };
  activity: Array<{ date: string; campaigns: number; claims: number; activations: number }>;
  sources: Array<{ metric: string; record: string; rule: string }>;
  privacy: string;
};

export type CampaignProofExplorer = {
  schemaVersion: string; product: string; network: string; explorerUrl: string; configured: boolean;
  valueStatus: string; generatedAt: string; digest: string; privacy: string;
  totals: { campaigns: number; recipients: number; confirmedClaims: number; settlementTransactions: number; activationEvents: number; identityAttestations: number; fundedCampaigns: number };
  campaigns: Array<{
    proofRef: string; label: string; status: string; kind: string; digest: string;
    asset: { symbol: string; name: string; decimals: number; contractAddress: string; verified: boolean; amountAtomic: string; claimedAmountAtomic: string };
    targeting: { claimMode: string; claimCondition: Record<string, unknown> | null; recipients: number; allocationStates: Record<string, number> };
    settlement: { confirmedClaims: number; remainingAtomic: string; claimTransactions: Array<{ hash: string; confirmedAt: string|null }> };
    activation: { events: number; distinctUsers: number; eventTypes: Record<string, number> };
    identity: { attestations: number; consumed: number; types: Record<string, number> };
    referrals: { total: number; states: Record<string, number> };
    anchors: { merkleRoot: string|null; vaultAddress: string|null; fundingTransactionHash: string|null; refundTransactionHash: string|null; crosschainFunding: Array<Record<string, unknown>>; gatewayFunding: Array<Record<string, unknown>> };
    recovery: { expiresAt: string|null; refundable: boolean; refunded: boolean };
    timeline: { createdAt: string; startsAt: string|null; expiresAt: string|null };
  }>;
};

export type ReviewerDemo = {
  schemaVersion:string; product:string; environment:string; generatedAt:string; replayId:string;
  mode:"non-mutating-verified-replay"; boundary:string; digest:string; privacy:string;
  story:{headline:string;recipient:string;project:string;asset:string;amountAtomic:string;decimals:number;proofRef:string|null};
  readiness:{stages:number;verifiedStages:number;complete:boolean};
  stages:Array<{id:string;index:number;label:string;actor:string;status:string;explanation:string;evidence:Record<string,unknown>}>;
  liveContext:{campaigns:number;confirmedClaims:number;fundedWallets:number;activatedUsers:number;networkDigest:string;integrationDigest:string};
  reviewerActions:Array<{id:string;label:string;url:string|null}>;
  developerRecipe:{package:string;sequence:string[];integrationPaths:Array<{id:string;label:string}>};
};

export type ProjectTokenProof = {
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

export type GrantProofHealth = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;status:"healthy"|"degraded"|"unavailable";score:number;verifiedChecks:number;totalChecks:number;boundary:string;digest:string;privacy:string;
  checks:Array<{id:string;label:string;status:"verified"|"degraded"|"unavailable";statement:string;evidence:string|null;digest:string|null;externalGate:string|null}>;
  reviewerLinks:Record<string,string>;
};

export type PublicGrantDossier = {
  schemaVersion: string; product: string; environment: string; generatedAt: string; boundary: string; digest: string;
  application: { oneLiner: string; problem: string; solution: string; ecosystemValue: string };
  criteria: Array<{ id: string; label: string; statement: string; proof: readonly string[] }>;
  architecture: Array<{ product: string; role: string }>;
  shipped: Array<{ id: string; label: string; detail: string }>;
  liveProof: { network: NetworkProof; release: Record<string, unknown>; security: Record<string, unknown>; integration: Record<string, unknown> };
  externalGates: Array<{ id: string; label: string; status: string; target: string }>;
  proposedGrantMilestones: Array<{ id: string; title: string; measurement: string }>;
  reviewerLinks: Record<string, string>; privacy: string;
};

export type GrantApplicationPacket = {
  schemaVersion:string;product:string;environment:string;generatedAt:string;status:string;boundary:string;digest:string;executiveSummary:string;privacy:string;
  officialGrantSource:{name:string;url:string;applicationUrl:string;researchedAt:string;applicationWindowObserved:string;criteria:readonly string[]};
  applicationAnswers:Array<{id:string;prompt:string;response:string;wordCount:number;evidence:string[]}>;
  architecture:Array<{product:string;role:string}>;
  shipped:Array<{id:string;label:string;detail:string}>;
  evidenceSnapshot:Record<string,string|number|boolean|null>;
  proposedMilestones:Array<{id:string;title:string;measurement:string;sequence:number;acceptanceEvidence:string[]}>;
  externalGates:Array<{id:string;label:string;status:string;target:string}>;
  applicantInputs:Array<{id:string;label:string;reason:string}>;
  submissionChecklist:{internallyComplete:string[];awaitingApplicant:string[];awaitingExternal:string[]};
  reviewerLinks:Record<string,string>;
};

export type CreateDistributionInput = {
  name: string;
  tokenAddress?: string;
  recipients: CurrentRecipient[];
  expiresInHours?: number;
  activationEvent?: string;
  activationDestination?: { url: string; label: string };
  referralReward?: string;
  mode?: "allowlist" | "identity-bound";
  claimCondition?: {
    eventType: string;
    label: string;
    description?: string;
    proofWindowMinutes?: number;
  };
};

export type CreatedDistribution = {
  id: string;
  status: string;
  name: string;
  asset: { address: string; symbol: string; name: string; decimals: number };
  recipientCount: number;
  totalAmount: string;
  totalAmountAtomic: string;
  merkleRoot: string;
  claimMode: "allowlist" | "identity-bound";
  claimCondition: null | { eventType: string; label: string; description: string; proofWindowMinutes: number };
  expiresAt: string;
  links: Array<{
    allocationId: string;
    identity: string;
    identityType: string;
    amount: string;
    claimUrl: string;
  }>;
};

export type CampaignDeliveryCenter = {
  items: Array<{ id: string; distributionId: string; allocationId: string; campaignName: string; maskedIdentity: string; identityType: string; channel: string; status: "ready" | "handed_off" | "claimed"; amount: string; asset: string; claimUrl: string; sentAt: string | null; expiresAt: string | null }>;
  totals: { ready: number; handedOff: number; claimed: number; campaigns: number };
  privacy: string;
};

export type InspectedArcToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  verified: boolean;
  network: string;
  warning: string | null;
};

export type CreateAssetLinkInput = {
  amount: string;
  tokenAddress?: string;
  message?: string;
  expiresInHours?: number;
};

export type CreatedAssetLink = {
  id: string;
  status: string;
  amount: string;
  asset: string;
  assetDetails: InspectedArcToken;
  expiresAt: string;
  claimUrl: string;
  funding: { required: boolean; network: string; amountAtomic: string; assetAddress: string; state: string };
};

export type ActivationInput = {
  externalEventId: string;
  eventType: string;
  distributionId: string;
  walletAddress: `0x${string}`;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

export type CreateEscrowInput = {
  name: string;
  clientAddress: `0x${string}`;
  providerAddress: `0x${string}`;
  arbitratorAddress: `0x${string}`;
  tokenAddress?: `0x${string}`;
  milestones: Array<{ title: string; amount: string; dueAt: string }>;
};

export type EscrowAgreement = {
  id: string; name: string; status: string; clientAddress: string; providerAddress: string;
  arbitratorAddress: string; contractDealId: string; contractAddress: string;
  termsHash: string; fundingTransactionHash: string | null; cancellationRequested: boolean;
  asset: { address: string; symbol: string; decimals: number };
  totalAmount: string; releasedAmount: string; refundedAmount: string; nextMilestone: number;
  milestones: Array<{ position: number; title: string; amount: string; dueAt: string; status: string; proofHash: string | null }>;
};

export type EscrowState = { configured: boolean; network: string; agreements: EscrowAgreement[] };

export type CreateCheckoutInput = {
  title: string;
  description?: string;
  amount: string;
  expiresAt?: string;
  successUrl?: string;
  settlementAddress?: `0x${string}`;
  merchantName?: string;
};

export type MerchantCommerce = {
  merchant: null | { id: string; displayName: string; slug: string; settlementAddress: string; status: string };
  checkouts: Array<{
    id: string; slug: string; title: string; description: string | null; status: string;
    amount: string; amountAtomic: string; currency: string; checkoutUrl: string;
    expiresAt: string | null; successUrl: string | null; createdAt: string;
  }>;
  payments: Array<{
    id: string; receiptNumber: string; status: string; amount: string; currency: string;
    customerAddress: string; merchantAddress: string; paymentTransactionHash: string | null;
    refundTransactionHash: string | null; paidAt: string | null; refundedAt: string | null;
  }>;
  totals: { checkouts: number; payments: number; volume: string; refunds: number };
};

export type CreateSocialPaymentInput = {
  kind: "request" | "tip" | "split";
  title: string;
  note?: string;
  amount?: string;
  tokenAddress?: string;
  shares?: Array<{ label?: string; amount: string }>;
  expiresAt?: string;
};

export type CreatedSocialPayment = {
  id: string; slug: string; kind: CreateSocialPaymentInput["kind"]; title: string; note: string | null;
  status: string; amount: string; paidAmount: string; currency: string; expiresAt: string | null;
  asset: { address: string; symbol: string; name: string; decimals: number; verified: boolean };
  shares: Array<{ id: string; label: string | null; amount: string; payUrl: string }>;
};

export type CreateSubscriptionPlanInput = {
  title: string;
  description?: string;
  amount: string;
  intervalDays: 7 | 30 | 90 | 365;
  successUrl?: string;
};

export type SubscriptionWorkspace = {
  merchant: MerchantCommerce["merchant"];
  plans: Array<{ id: string; slug: string; title: string; description: string | null; status: string; amount: string; amountAtomic: string; currency: string; intervalDays: number; subscribeUrl: string; createdAt: string }>;
  merchantSubscriptions: Array<{ id: string; status: string; cycleCount: number; subscriberAddress: string; currentPeriodStart: string | null; currentPeriodEnd: string | null; renewalDue: boolean; pastDue: boolean; notices: Array<{ id: string; kind: string; status: string; periodNumber: number; dueAt: string; acknowledgedAt: string | null }> }>;
  subscriberSubscriptions: Array<{ id: string; status: string; cycleCount: number; currentPeriodEnd: string | null; renewalDue: boolean; pastDue: boolean; notices: Array<{ id: string; kind: string; status: string; periodNumber: number; dueAt: string; acknowledgedAt: string | null }> }>;
  totals: { plans: number; activeSubscriptions: number; payments: number; collected: string; openRenewals: number; pastDue: number };
};

export type CreateBountyInput = {
  title: string;
  summary: string;
  category: string;
  amount: string;
  tokenAddress?: string;
  submissionDeadline: string;
};

export type BountyWorkspace = {
  bounties: Array<{
    id: string; slug: string; title: string; summary: string; category: string; status: string;
    submissionDeadline: string; distributionId: string; submissionCount: number; publicUrl: string;
    prize: { amount: string; amountAtomic: string; symbol: string; name: string; address: string };
    funding: { status: string; transactionHash: string | null; merkleRoot: string | null; fullyFunded: boolean };
    submissions?: Array<{ id: string; displayName: string; maskedContact: string; workUrl: string; workSummary: string; proofDigest: string; status: string }>;
  }>;
  totals: { bounties: number; open: number; submissions: number; awarded: number };
  privacy: string;
};

export type TreasuryWorkspace = {
  treasury: null | { id: string; name: string; description: string | null; address: string; status: string; publicSlug: string; publicUrl: string };
  balances: Array<{ symbol: string; address: string; amountAtomic: string | null; amount: string | null; decimals: number }>;
  budgets: Array<{ id: string; category: string; status: string; limit: string; committed: string; spent: string; remaining: string; asset: string; periodStart: string; periodEnd: string }>;
  proposals: Array<{ id: string; title: string; description: string; category: string; amount: string; status: string; recipientAddress: string; transactionHash: string | null; explorerUrl: string | null }>;
  totals: { proposals: number; pending: number; executed: number; categories: number };
};

export type CreateTreasuryProposalInput = { treasuryId: string; budgetId?: string; title: string; description: string; category: string; recipientAddress: string; amount: string; tokenAddress?: string; proofUrl?: string };

export type CreateGiveawayInput = { title: string; description: string; amount: string; tokenAddress?: string; entryDeadline: string; maxEntries?: number };
export type CreatePublicDropInput = { title: string; description: string; claimAmount: string; maxClaims: number; expiresInHours?: number; tokenAddress?: string; claimCondition?: { eventType: string; label: string; description?: string; proofWindowMinutes?: number } };
export type PublicDropWorkspace = {
  drops: Array<{ id: string; slug: string; title: string; description: string; status: string; distributionId: string; publicUrl: string; reward: { amount: string; symbol: string; address: string }; capacity: { maximum: number; reserved: number; claimed: number; remaining: number; percentReserved: number }; funding: { status: string; fullyFunded: boolean; transactionHash: string | null; merkleRoot: string | null; totalAmount: string }; referrals: number }>;
  totals: { drops: number; open: number; reserved: number; claimed: number; referrals: number }; privacy: string;
};
export type GiveawayWorkspace = {
  giveaways: Array<{ id: string; slug: string; title: string; description: string; status: string; entryDeadline: string; maxEntries: number; entryCount: number; distributionId: string; publicUrl: string; referrals: number; prize: { amount: string; symbol: string; address: string }; funding: { status: string; fullyFunded: boolean; transactionHash: string | null; merkleRoot: string | null }; proof: { randomnessCommitment: string; entrySetDigest: string | null; drawDigest: string | null; revealedRandomness: string | null; deterministic: boolean }; winner: { displayName: string; maskedIdentity: string; entryDigest: string } | null }>;
  totals: { giveaways: number; open: number; entries: number; referrals: number; drawn: number };
  privacy: string;
};

export type CreateVestingInput = { name: string; description: string; tokenAddress?: string; cliffAt: string; releaseCount: number; intervalDays: number; recipients: Array<{ displayName: string; identityType: "email" | "wallet" | "x" | "game" | "custom"; identity: string; totalAmount: string }> };
export type VestingWorkspace = {
  batches: Array<{ id: string; name: string; description: string; status: string; distributionId: string; cliffAt: string; releaseCount: number; intervalDays: number; lastUnlockAt: string; publicProofUrl: string; asset: { symbol: string; name: string; address: string }; funding: { status: string; fullyFunded: boolean; merkleRoot: string | null; transactionHash: string | null }; totals: { recipients: number; tranches: number; unlocked: number; claimed: number; amount: string }; schedules: Array<{ id: string; displayName: string; identityType: string; maskedIdentity: string; totalAmount: string; claimed: number; recipientUrl?: string }> }>;
  totals: { batches: number; recipients: number; tranches: number; claimed: number };
  privacy: string;
};

export type ActivationResult = {
  id?: string;
  duplicate: boolean;
  status: "accepted";
  attributedReferrals?: number;
  createdAt?: string;
};

export type IdentityAttestationInput = {
  externalEventId: string;
  distributionId: string;
  identityType: "x" | "game" | "custom";
  identity: string;
  walletAddress: `0x${string}`;
  provider?: string;
  expiresInMinutes?: number;
  evidence?: {
    method?: string;
    provider?: string;
    verifiedAt?: string;
    scope?: string;
  };
};

export type IdentityAttestationResult = {
  id: string;
  duplicate: boolean;
  status: "verified" | "consumed" | "expired";
  identityType: string;
  walletAddress: string;
  expiresAt: string;
  createdAt?: string;
};

export type ClaimConditionProofInput = {
  externalEventId: string;
  distributionId: string;
  eventType: string;
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  walletAddress: `0x${string}`;
  expiresInMinutes?: number;
  evidence?: { method?: string; provider?: string; verifiedAt?: string; scope?: string; reference?: string };
};

export type ClaimConditionProofResult = {
  id: string;
  duplicate: boolean;
  status: "verified" | "consumed" | "expired";
  distributionId: string;
  allocationId: string;
  eventType: string;
  walletAddress: string;
  expiresAt: string;
  createdAt?: string;
};

export type DeveloperAnalytics = {
  totals: { campaigns: number; recipients: number; claims: number; activations: number };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    recipientCount: number;
    claims: number;
    activations: number;
  }>;
  discovery: DiscoveryAcquisition;
};

export type ProtocolLiquidity = {
  network: string;
  explorerUrl?: string;
  addresses: null | {
    current: string;
    feeRouter: string;
    liquidityVault?: string;
    liquidityGovernor?: string;
    liquidityAdapter?: string;
  };
  allocationBps: number;
  liquidity: {
    configured: boolean;
    governorOwnsVault: boolean;
    adapterAllowed: boolean;
    minimumDelaySeconds: number;
    idleCurrent: string;
    idleUsdc: string;
    currentDeployed: string;
    usdcDeployed: string;
    liquidityShares: string;
    positionsCreated: number;
    positionsRemoved: number;
    proofMode: string;
  };
};

export type PartnerVaultSnapshot = {
  configured: boolean;
  network: string;
  explorerUrl?: string;
  addresses: null | { vault: string; governor: string; testnetPartnerToken: string; campaignVault: string };
  asset: null | { approved: boolean; treasury: string; metadataHash: string; symbol: string; decimals: number; reserveBalance: string; totalDeposited: string; totalCampaignFunded: string };
  governance: null | { governorOwnsVault: boolean; guardian: string; minimumDelaySeconds: number; totalQueued: number; totalExecuted: number; totalCancelled: number };
  totals?: { approvedAssets: number; deposits: number; campaignsFunded: number };
  proofCampaign: null | { id: string; sender: string; token: string; totalAmount: string; remainingAmount: string; expiresAt: number; recipientCount: number; merkleRoot: string; state: number };
  proofMode?: string;
};

export type VenueRegistrySnapshot = {
  configured: boolean;
  network: string;
  explorerUrl?: string;
  addresses: null | { registry: string; governor: string; adapter: string; current: string; usdc: string };
  venue: null | { approved: boolean; venueId: string; venueNameHash: string; registeredCodeHash: string; liveCodeHash: string | null; codeHashMatches: boolean; maxSlippageBps: number; maxAllocationBps: number; activatedAt: number; updatedAt: number };
  governance: null | { governorOwnsRegistry: boolean; guardian: string; minimumDelaySeconds: number; totalQueued: number; totalExecuted: number; totalCancelled: number };
  totals?: { approvedVenues: number; approvals: number; revocations: number };
  readiness?: { custodyAdapterBoundary: boolean; exactBytecodeBinding: boolean; exactPairBinding: boolean; riskCaps: boolean; testnetQualificationOnly: boolean };
  proofMode?: string;
};

export type LaunchReadinessSnapshot = {
  configured: boolean;
  network: string;
  explorerUrl?: string;
  readinessScore: number;
  addresses?: { registry: string; governor: string };
  release: null | { id: string; expectedId: string; manifestHash: string; totalReleases: number; appliedAt: number; componentCount: number; active: boolean };
  governance: null | { guardian: string; minimumDelaySeconds: number; paused: boolean; totalQueued: number; totalExecuted: number; totalCancelled: number };
  components: Array<{ id: string; key: string; label: string; address: string; expectedAddress: string | null; codeHash: string; versionHash: string; verifiedAt: number; active: boolean; valid: boolean; addressMatches: boolean }>;
  checks?: Record<string, boolean>;
  proofMode?: string;
};

export type ServiceStatusSnapshot = {
  projectId?: string;
  service: string;
  environment: string;
  network: string;
  status: "operational" | "degraded" | "major_outage";
  score: number;
  generatedAt: string;
  responseTimeMs: number;
  components: Array<{ id: string; name: string; status: "operational" | "degraded" | "outage"; latencyMs: number | null; message: string }>;
  activeIncidents: Array<{ id: string; key: string; title: string; summary: string; severity: string; status: string; affectedComponents: string[]; startedAt: string; latestUpdateAt: string }>;
  incidentHistory: Array<{ id: string; key: string; title: string; summary: string; severity: string; status: string; affectedComponents: string[]; startedAt: string; latestUpdateAt: string }>;
  objectives: { availability: string; apiLatencyP95Ms: number; rpcLatencyP95Ms: number; recoveryTimeMinutes: number; onchainRecoveryPoint: string };
};

export type SecurityPostureSnapshot = {
  projectId?: string;
  product: string;
  network: string;
  assurance: {
    internalReadinessScore: number;
    implementedControls: number;
    totalInternalControls: number;
    externalAuditStatus: "pending" | "in-review" | "complete";
    mainnetApproved: boolean;
    statement: string;
  };
  controls: Array<{ id: string; name: string; status: "implemented" | "pending-external-review"; evidence: string }>;
  privilegedRoles: Array<{ role: string; authority: string; boundary: string }>;
  fundFlows: Array<{ flow: string; custody: string; release: string }>;
  reviewPackage: { auditManifest?: string; scope: string; threatModel: string; invariants: string; auditorGuide: string; disclosure: string; repository: string; commit: string | null };
  generatedAt: string;
};

export type EvidenceReport = {
  id: string;
  publicSlug: string;
  schemaVersion: string;
  digest: string;
  distributionId: string | null;
  readinessScore: number;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type EvidenceReportSummary = Omit<EvidenceReport, "snapshot"> & {
  project: { name: string; slug: string };
  totals: { campaigns: number; recipients: number; claims: number; activations: number };
};

export type DiscoveryOpportunity = {
  id: string;
  kind: "drop" | "bounty" | "giveaway";
  title: string;
  description: string;
  category: string;
  project: { id: string; name: string; logoUrl: string | null; websiteUrl: string | null };
  reward: { amount: string; symbol: string; name: string };
  progress: { label: string; current: number; maximum: number | null };
  closesAt: string | null;
  publicUrl: string;
  funding: { fullyFunded: true; transactionHash: string | null; merkleRoot: string | null; network: "ARC-TESTNET" };
  placement: { tier: "current" | "surge" | "stream" | "standard"; label: string; rank: number; reason: string };
  metrics: { impressions: number; opens: number; openRate: number; participation: number; participationLabel: string; boundary: string };
  createdAt: string;
};

export type DiscoveryNetwork = {
  schemaVersion: "current-discovery-v1";
  generatedAt: string;
  items: DiscoveryOpportunity[];
  totals: { opportunities: number; drops: number; bounties: number; giveaways: number; fundedProjects: number; impressions: number; opens: number; participation: number };
  ranking: { order: string; safetyGate: string; disclosure: string };
  boundary: string;
};

export type DiscoveryAcquisition = {
  schemaVersion: "current-discovery-acquisition-v1";
  period: { days: number; startsAt: string; generatedAt: string };
  totals: { impressions: number; opens: number; participation: number; claims: number; activations: number };
  rates: { openRate: number; participationRate: number; claimRate: number; activationRate: number; impressionToActivationRate: number };
  daily: Array<{ day: string; impressions: number; opens: number }>;
  opportunities: Array<{
    id: string; distributionId: string; kind: "drop" | "bounty" | "giveaway"; title: string;
    impressions: number; opens: number; participation: number; claims: number; activations: number;
    rates: { openRate: number; participationRate: number; claimRate: number; activationRate: number; impressionToActivationRate: number };
    createdAt: string;
  }>;
  boundary: string;
};

export type GrantReviewPackage = {
  schemaVersion: string;
  digest: string;
  evidence: { id: string; publicSlug: string; schemaVersion: string; digest: string; integrity: { valid: boolean; recalculatedDigest: string }; generatedAt: string };
  application: { project: string; website: string; oneLiner: string; problem: string; solution: string; whyArc: string; ecosystemValue: string };
  officialCriteria: Array<{ id: string; label: string; summary: string }>;
  architecture: Array<{ product: string; role: string }>;
  proof: Record<string, string | number | boolean | null>;
  shipped: string[];
  proposedMilestones: Array<{ id: string; title: string; measurement: string; dependsOn: string }>;
  honestGaps: Array<{ id: string; label: string; evidence: string }>;
  reviewerLinks: Record<string, string>;
  privacy: string;
};

export type CreatePilotInput = {
  partnerName: string;
  partnerWebsite?: string;
  useCase: string;
  integrationMode?: "hosted-links" | "react-embed" | "server-sdk" | "agent-api";
  targetRecipients?: number;
  targetClaimRate?: number;
  targetActivationRate?: number;
  requestedIntegrations?: string[];
  dueAt?: string;
  notes?: string;
};

export type PilotRecord = {
  id: string;
  publicSlug: string;
  partnerName: string;
  partnerWebsite: string | null;
  useCase: string;
  status: "onboarding" | "ready" | "live" | "measuring" | "complete";
  integrationMode: string;
  requestedIntegrations: string[];
  targets: { recipients: number; claimRate: number; activationRate: number };
  readinessScore: number;
  targetMet: boolean;
  milestones: Array<{ id: string; label: string; passed: boolean; evidence: string }>;
  campaign: {
    id: string;
    name: string;
    status: string;
    recipientCount: number;
    fundingTxHash: string | null;
    claims: number;
    activations: number;
    claimRate: number;
    activationRate: number;
  } | null;
  attestation: {
    signerName: string;
    signerRole: string;
    statement: string;
    digest: string;
    attestedAt: string;
  } | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PilotInvitation = {
  id: string; publicSlug: string; name: string; summary: string; status: string;
  integrationMode: string; requestedIntegrations: string[]; targetRecipients: number;
  maxApplications: number; applicationCount: number; expiresAt: string | null; createdAt: string;
};

export type PilotApplication = {
  id: string; publicSlug: string; organizationName: string; websiteUrl: string | null;
  applicantName: string; applicantRole: string; contact?: string; useCase: string;
  audienceDescription: string; expectedRecipients: number; integrationMode: string;
  requestedIntegrations: string[]; readiness: { completed?: number; total?: number; score?: number };
  status: "submitted" | "accepted" | "declined"; reviewNotes: string | null;
  pilotId: string | null; createdAt: string; updatedAt: string;
};

export type CampaignQualitySnapshot = {
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

export type AgentAction = {
  id: string;
  agentName: string;
  kind: string;
  status: "auto_approved" | "approval_required" | "blocked" | "approved" | "rejected" | "executing" | "awaiting_settlement" | "completed" | "failed";
  riskLevel: "low" | "medium" | "high";
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

export type ProposeAgentDistributionInput = CreateDistributionInput & {
  idempotencyKey: string;
};

export type CrosschainFundingIntent = {
  id: string;
  distributionId: string;
  sourceChain: string;
  destinationChain: string;
  amountAtomic: string;
  status: string;
  sourceTransactionHash: string | null;
  destinationTransactionHash: string | null;
  campaignFundingTransactionHash: string | null;
  stages: Array<{ id: string; label: string; complete: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type GatewayFundingIntent = {
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
  stages: Array<{ id: string; label: string; complete: boolean }>;
  createdAt: string;
  updatedAt: string;
};

type CurrentEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { requestId: string; timestamp: string; version: string };
};

export class CurrentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CurrentError";
  }
}

export type CurrentOptions = {
  apiKey: string;
  signingSecret: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function base64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signature(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  ));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as CurrentEnvelope<T>;
  if (!response.ok || !payload.ok || payload.data === undefined) {
    throw new CurrentError(
      payload.error?.code ?? "CURRENT_REQUEST_FAILED",
      payload.error?.message ?? `Current CoFi returned HTTP ${response.status}.`,
      response.status,
      payload.meta?.requestId,
      payload.error?.details,
    );
  }
  return payload.data;
}

export class Current {
  private readonly apiKey: string;
  private readonly signingSecret: string;
  private readonly baseUrl: string;
  private readonly request: typeof globalThis.fetch;

  readonly discovery = {
    list: () => this.publicGet<DiscoveryNetwork>("/api/v1/discovery"),
    record: (input: { resourceType: "drop" | "bounty" | "giveaway"; resourceId: string; visitorId: string; eventType: "impression" | "open" }) => this.publicPost<{ accepted: true; deduplicatedBy: string; privacy: string }>("/api/v1/discovery", input),
  };

  readonly distributions = {
    create: (input: CreateDistributionInput) => this.signedPost<CreatedDistribution>(
      "/api/v1/developer/distributions",
      input,
    ),
  };

  readonly deliveries = {
    list: (distributionId?: string) => this.get<CampaignDeliveryCenter>(`/api/v1/developer/deliveries${distributionId ? `?distributionId=${encodeURIComponent(distributionId)}` : ""}`),
    recordHandoff: (deliveryId: string, channel: string) => this.signedPost<{ id: string; status: string; channel: string; sentAt: string | null }>("/api/v1/developer/deliveries", { deliveryId, channel }),
  };

  readonly links = {
    inspectToken: (address: string) => this.signedPost<InspectedArcToken>(
      "/api/v1/developer/tokens/inspect",
      { address },
    ),
    create: (input: CreateAssetLinkInput) => this.signedPost<CreatedAssetLink>(
      "/api/v1/developer/links",
      input,
    ),
  };

  readonly escrow = {
    list: () => this.get<EscrowState>("/api/v1/developer/escrow"),
    create: (input: CreateEscrowInput) => this.signedPost<EscrowAgreement>("/api/v1/developer/escrow", input),
  };

  readonly checkout = {
    list: () => this.get<MerchantCommerce>("/api/v1/developer/checkout"),
    setup: (input: { displayName: string; settlementAddress: `0x${string}`; description?: string }) => this.signedPost<MerchantCommerce["merchant"]>(
      "/api/v1/developer/checkout",
      { action: "setup", ...input },
    ),
    create: (input: CreateCheckoutInput) => this.signedPost<MerchantCommerce["checkouts"][number]>(
      "/api/v1/developer/checkout",
      input,
    ),
  };

  readonly socialPayments = {
    create: (input: CreateSocialPaymentInput) => this.signedPost<CreatedSocialPayment>(
      "/api/v1/developer/social-payments",
      input,
    ),
  };

  readonly subscriptions = {
    list: () => this.get<SubscriptionWorkspace>("/api/v1/developer/subscriptions"),
    createPlan: (input: CreateSubscriptionPlanInput) => this.signedPost<SubscriptionWorkspace["plans"][number]>(
      "/api/v1/developer/subscriptions",
      input,
    ),
  };

  readonly bounties = {
    list: () => this.get<BountyWorkspace>("/api/v1/developer/bounties"),
    create: (input: CreateBountyInput) => this.signedPost<BountyWorkspace["bounties"][number] & { campaign: CreatedDistribution }>("/api/v1/developer/bounties", input),
    shortlist: (bountyId: string, submissionId: string) => this.signedPost<{ bountyId: string; submissionId: string; status: string }>("/api/v1/developer/bounties", { action: "shortlist", bountyId, submissionId }),
    reject: (bountyId: string, submissionId: string) => this.signedPost<{ bountyId: string; submissionId: string; status: string }>("/api/v1/developer/bounties", { action: "reject", bountyId, submissionId }),
    award: (bountyId: string, submissionId: string) => this.signedPost<{ bountyId: string; submissionId: string; status: string; claimUrl: string }>("/api/v1/developer/bounties", { action: "award", bountyId, submissionId }),
  };

  readonly treasury = {
    get: () => this.get<TreasuryWorkspace>("/api/v1/developer/treasury"),
    setup: (input: { name: string; description?: string }) => this.signedPost<TreasuryWorkspace["treasury"]>("/api/v1/developer/treasury", { action: "setup", ...input }),
    createBudget: (input: { treasuryId: string; category: string; limit: string; tokenAddress?: string; periodStart: string; periodEnd: string }) => this.signedPost<{ id: string }>("/api/v1/developer/treasury", { action: "budget", ...input }),
    createProposal: (input: CreateTreasuryProposalInput) => this.signedPost<{ id: string }>("/api/v1/developer/treasury", { action: "proposal", ...input }),
  };

  readonly brand = {
    get: () => this.get<ProjectBrand>("/api/v1/developer/brand"),
    publish: (input: Partial<Omit<ProjectBrand, "brand">> & { brand?: Partial<ProjectBrand["brand"]> }) => this.signedPost<ProjectBrand>("/api/v1/developer/brand", input),
  };

  readonly giveaways = {
    list: () => this.get<GiveawayWorkspace>("/api/v1/developer/giveaways"),
    create: (input: CreateGiveawayInput) => this.signedPost<GiveawayWorkspace["giveaways"][number] & { campaign: CreatedDistribution }>("/api/v1/developer/giveaways", input),
    draw: (giveawayId: string) => this.signedPost<{ giveawayId: string; status: "drawn"; claimUrl: string }>("/api/v1/developer/giveaways", { action: "draw", giveawayId }),
  };

  readonly drops = {
    list: () => this.get<PublicDropWorkspace>("/api/v1/developer/drops"),
    create: (input: CreatePublicDropInput) => this.signedPost<PublicDropWorkspace["drops"][number] & { campaign: CreatedDistribution }>("/api/v1/developer/drops", input),
  };

  readonly vesting = {
    list: () => this.get<VestingWorkspace>("/api/v1/developer/vesting"),
    create: (input: CreateVestingInput) => this.signedPost<{ id: string; campaign: CreatedDistribution; publicProofUrl: string; recipientLinks: Array<{ displayName: string; maskedIdentity: string; url: string }> }>("/api/v1/developer/vesting", input),
  };

  readonly activations = {
    submit: (input: ActivationInput) => this.signedPost<ActivationResult>(
      "/api/v1/developer/activations",
      {
        ...input,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        payload: input.payload ?? {},
      },
    ),
  };

  readonly identities = {
    attest: (input: IdentityAttestationInput) => this.signedPost<IdentityAttestationResult>(
      "/api/v1/developer/identity-attestations",
      input,
    ),
  };

  readonly conditions = {
    verify: (input: ClaimConditionProofInput) => this.signedPost<ClaimConditionProofResult>(
      "/api/v1/developer/claim-conditions",
      input,
    ),
  };

  readonly analytics = {
    get: () => this.get<DeveloperAnalytics>("/api/v1/developer/analytics"),
  };

  readonly integrations = {
    manifest: () => this.publicGet<IntegrationManifest>("/api/v1/integration-manifest"),
    readiness: () => this.get<IntegrationReadiness>("/api/v1/developer/integration-readiness"),
    certify: () => this.signedPost<IntegrationCertificate>("/api/v1/developer/integration-certification", {}),
  };

  readonly network = {
    proof: () => this.publicGet<NetworkProof>("/api/v1/network-proof"),
  };

  readonly dossier = {
    get: () => this.publicGet<PublicGrantDossier>("/api/v1/grant-dossier"),
    application: () => this.publicGet<GrantApplicationPacket>("/api/v1/grant-application"),
  };

  readonly proofs = {
    campaigns: () => this.publicGet<CampaignProofExplorer>("/api/v1/campaign-proofs"),
    reviewerDemo: () => this.publicGet<ReviewerDemo>("/api/v1/reviewer-demo"),
    projectToken: () => this.publicGet<ProjectTokenProof>("/api/v1/project-token-proof"),
    health: () => this.publicGet<GrantProofHealth>("/api/v1/proof-health"),
  };

  readonly quality = {
    get: () => this.get<CampaignQualitySnapshot>("/api/v1/developer/quality"),
    evaluate: (distributionId: string) => this.signedPost<{ evaluated: number; allowed: number; review: number; held: number }>(
      "/api/v1/developer/quality",
      { action: "evaluate", distributionId },
    ),
    updatePolicy: (distributionId: string, input: {
      reviewThreshold?: number; holdThreshold?: number; burstWindowMinutes?: number;
      burstReferralCount?: number; minimumAccountAgeMinutes?: number;
      minimumActivationDelaySeconds?: number;
      enforcementAction?: "monitor" | "review" | "hold-referral-reward";
    }) => this.signedPost<CampaignQualitySnapshot["policies"][number]>(
      "/api/v1/developer/quality",
      { action: "update-policy", distributionId, ...input },
    ),
  };

  readonly funding = {
    list: () => this.get<{
      catalog: {
        sourceChains: Array<{ code: string; label: string; domain: number; usdcAddress: string }>;
        destination: { code: string; domain: number; usdcAddress: string };
        transport: string;
      };
      intents: CrosschainFundingIntent[];
    }>("/api/v1/developer/funding"),
  };

  readonly gateway = {
    list: () => this.get<{
      catalog: {
        sourceChains: Array<{ code: string; label: string; domain: number; usdcAddress: string }>;
        destination: { code: string; domain: number; usdcAddress: string };
        transport: string;
        signerRequirement: string;
        maxFeeAtomic: string;
      };
      intents: GatewayFundingIntent[];
    }>("/api/v1/developer/gateway"),
  };

  readonly liquidity = {
    get: () => this.get<ProtocolLiquidity>("/api/v1/developer/liquidity"),
  };

  readonly partners = {
    get: () => this.get<PartnerVaultSnapshot>("/api/v1/developer/partners"),
  };

  readonly venues = {
    get: () => this.get<VenueRegistrySnapshot>("/api/v1/developer/venues"),
  };

  readonly releases = {
    get: () => this.get<LaunchReadinessSnapshot>("/api/v1/developer/launch-readiness"),
  };

  readonly observability = {
    get: () => this.get<ServiceStatusSnapshot>("/api/v1/developer/observability"),
  };

  readonly security = {
    get: () => this.get<SecurityPostureSnapshot>("/api/v1/developer/security"),
    auditReadiness: () => this.get<{
      schemaVersion: string;
      assurance: "internal-review-only";
      mainnetApproved: false;
      manifestDigest: string;
      deploymentCommit: string | null;
      verification: { scopeDriftGate: boolean; sourceDigests: number; artifactDigests: number; externalAuditStatus: "pending" };
      boundary: string;
    }>("/api/v1/security/audit-readiness"),
  };

  readonly evidence = {
    list: () => this.get<{ reports: EvidenceReportSummary[] }>("/api/v1/developer/evidence"),
    create: (input: { distributionId?: string } = {}) => this.signedPost<EvidenceReport>(
      "/api/v1/developer/evidence",
      input,
    ),
  };

  readonly grant = {
    list: () => this.get<{ packages: EvidenceReportSummary[] }>("/api/v1/developer/grant"),
    create: (input: { distributionId?: string } = {}) => this.signedPost<GrantReviewPackage>(
      "/api/v1/developer/grant",
      input,
    ),
  };

  readonly pilots = {
    list: () => this.get<{ pilots: PilotRecord[]; invitations: PilotInvitation[]; applications: PilotApplication[] }>("/api/v1/developer/pilots"),
    create: (input: CreatePilotInput) => this.signedPost<PilotRecord>(
      "/api/v1/developer/pilots",
      input,
    ),
    update: (pilotId: string, input: {
      distributionId?: string | null;
      notes?: string;
      dueAt?: string | null;
      requestedIntegrations?: string[];
    }) => this.signedPost<PilotRecord>(
      "/api/v1/developer/pilots",
      { action: "update", pilotId, ...input },
    ),
    createInvitation: (input: {
      name: string; summary: string; targetRecipients?: number; maxApplications?: number;
      expiresAt?: string; integrationMode?: "hosted-links" | "react-embed" | "server-sdk" | "agent-api";
      requestedIntegrations?: string[];
    }) => this.signedPost<PilotInvitation>(
      "/api/v1/developer/pilots",
      { action: "create-invitation", ...input },
    ),
    reviewApplication: (applicationId: string, status: "accepted" | "declined", reviewNotes?: string) => this.signedPost<PilotApplication>(
      "/api/v1/developer/pilots",
      { action: "review-application", applicationId, status, reviewNotes },
    ),
  };

  readonly agentActions = {
    list: () => this.get<{
      totals: { actions: number; approvalRequired: number; awaitingSettlement: number; completed: number; blocked: number };
      actions: AgentAction[];
    }>("/api/v1/developer/agent-actions"),
    proposeDistribution: (input: ProposeAgentDistributionInput) => this.signedPost<AgentAction>(
      "/api/v1/developer/agent-actions",
      input,
    ),
  };

  constructor(options: CurrentOptions) {
    if (!options.apiKey || !options.signingSecret) {
      throw new Error("Current requires apiKey and signingSecret.");
    }
    this.apiKey = options.apiKey;
    this.signingSecret = options.signingSecret;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://www.currentco.finance");
    this.request = options.fetch ?? globalThis.fetch;
  }

  private async get<T>(path: string) {
    const response = await this.request(`${this.baseUrl}${path}`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
    });
    return parseResponse<T>(response);
  }

  private async publicGet<T>(path: string) {
    const response = await this.request(`${this.baseUrl}${path}`, { headers: { accept: "application/json" } });
    return parseResponse<T>(response);
  }

  private async publicPost<T>(path: string, value: unknown) {
    const response = await this.request(`${this.baseUrl}${path}`, { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(value) });
    return parseResponse<T>(response);
  }

  private async signedPost<T>(path: string, value: unknown) {
    const body = JSON.stringify(value);
    const timestamp = Date.now().toString();
    const signed = await signature(this.signingSecret, timestamp, body);
    const response = await this.request(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "x-current-signature": signed,
        "x-current-timestamp": timestamp,
      },
      body,
    });
    return parseResponse<T>(response);
  }
}

export async function verifyCurrentWebhook(input: {
  secret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  toleranceMs?: number;
}) {
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > (input.toleranceMs ?? 300_000)) {
    return false;
  }
  const expected = await signature(input.secret, input.timestamp, input.rawBody);
  if (expected.length !== input.signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ input.signature.charCodeAt(index);
  }
  return difference === 0;
}
