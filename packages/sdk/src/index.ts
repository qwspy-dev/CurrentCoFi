export type CurrentRecipient = {
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  amount: string;
};

export type CreateDistributionInput = {
  name: string;
  tokenAddress?: string;
  recipients: CurrentRecipient[];
  expiresInHours?: number;
  activationEvent?: string;
  referralReward?: string;
  mode?: "allowlist" | "identity-bound";
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
  expiresAt: string;
  links: Array<{
    identity: string;
    identityType: string;
    amount: string;
    claimUrl: string;
  }>;
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
  reviewPackage: { scope: string; threatModel: string; invariants: string; auditorGuide: string; disclosure: string; repository: string; commit: string | null };
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

  readonly distributions = {
    create: (input: CreateDistributionInput) => this.signedPost<CreatedDistribution>(
      "/api/v1/developer/distributions",
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

  readonly subscriptions = {
    list: () => this.get<SubscriptionWorkspace>("/api/v1/developer/subscriptions"),
    createPlan: (input: CreateSubscriptionPlanInput) => this.signedPost<SubscriptionWorkspace["plans"][number]>(
      "/api/v1/developer/subscriptions",
      input,
    ),
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

  readonly analytics = {
    get: () => this.get<DeveloperAnalytics>("/api/v1/developer/analytics"),
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
  };

  readonly evidence = {
    list: () => this.get<{ reports: EvidenceReportSummary[] }>("/api/v1/developer/evidence"),
    create: (input: { distributionId?: string } = {}) => this.signedPost<EvidenceReport>(
      "/api/v1/developer/evidence",
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
