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
    asset: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
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
    totals: {
        campaigns: number;
        recipients: number;
        claims: number;
        activations: number;
    };
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
    addresses: null | {
        vault: string;
        governor: string;
        testnetPartnerToken: string;
        campaignVault: string;
    };
    asset: null | {
        approved: boolean;
        treasury: string;
        metadataHash: string;
        symbol: string;
        decimals: number;
        reserveBalance: string;
        totalDeposited: string;
        totalCampaignFunded: string;
    };
    governance: null | {
        governorOwnsVault: boolean;
        guardian: string;
        minimumDelaySeconds: number;
        totalQueued: number;
        totalExecuted: number;
        totalCancelled: number;
    };
    totals?: {
        approvedAssets: number;
        deposits: number;
        campaignsFunded: number;
    };
    proofCampaign: null | {
        id: string;
        sender: string;
        token: string;
        totalAmount: string;
        remainingAmount: string;
        expiresAt: number;
        recipientCount: number;
        merkleRoot: string;
        state: number;
    };
    proofMode?: string;
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
    project: {
        name: string;
        slug: string;
    };
    totals: {
        campaigns: number;
        recipients: number;
        claims: number;
        activations: number;
    };
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
    targets: {
        recipients: number;
        claimRate: number;
        activationRate: number;
    };
    readinessScore: number;
    targetMet: boolean;
    milestones: Array<{
        id: string;
        label: string;
        passed: boolean;
        evidence: string;
    }>;
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
    policyDecision: {
        outcome?: string;
        reasons?: string[];
    };
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
        stages: Array<{
            id: string;
            label: string;
            complete: boolean;
        }>;
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
    stages: Array<{
        id: string;
        label: string;
        complete: boolean;
    }>;
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
    stages: Array<{
        id: string;
        label: string;
        complete: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
};
export declare class CurrentError extends Error {
    readonly code: string;
    readonly status: number;
    readonly requestId?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, status: number, requestId?: string | undefined, details?: unknown | undefined);
}
export type CurrentOptions = {
    apiKey: string;
    signingSecret: string;
    baseUrl?: string;
    fetch?: typeof globalThis.fetch;
};
export declare class Current {
    private readonly apiKey;
    private readonly signingSecret;
    private readonly baseUrl;
    private readonly request;
    readonly distributions: {
        create: (input: CreateDistributionInput) => Promise<CreatedDistribution>;
    };
    readonly activations: {
        submit: (input: ActivationInput) => Promise<ActivationResult>;
    };
    readonly identities: {
        attest: (input: IdentityAttestationInput) => Promise<IdentityAttestationResult>;
    };
    readonly analytics: {
        get: () => Promise<DeveloperAnalytics>;
    };
    readonly funding: {
        list: () => Promise<{
            catalog: {
                sourceChains: Array<{
                    code: string;
                    label: string;
                    domain: number;
                    usdcAddress: string;
                }>;
                destination: {
                    code: string;
                    domain: number;
                    usdcAddress: string;
                };
                transport: string;
            };
            intents: CrosschainFundingIntent[];
        }>;
    };
    readonly gateway: {
        list: () => Promise<{
            catalog: {
                sourceChains: Array<{
                    code: string;
                    label: string;
                    domain: number;
                    usdcAddress: string;
                }>;
                destination: {
                    code: string;
                    domain: number;
                    usdcAddress: string;
                };
                transport: string;
                signerRequirement: string;
                maxFeeAtomic: string;
            };
            intents: GatewayFundingIntent[];
        }>;
    };
    readonly liquidity: {
        get: () => Promise<ProtocolLiquidity>;
    };
    readonly partners: {
        get: () => Promise<PartnerVaultSnapshot>;
    };
    readonly evidence: {
        list: () => Promise<{
            reports: EvidenceReportSummary[];
        }>;
        create: (input?: {
            distributionId?: string;
        }) => Promise<EvidenceReport>;
    };
    readonly pilots: {
        list: () => Promise<{
            pilots: PilotRecord[];
        }>;
        create: (input: CreatePilotInput) => Promise<PilotRecord>;
        update: (pilotId: string, input: {
            distributionId?: string | null;
            notes?: string;
            dueAt?: string | null;
            requestedIntegrations?: string[];
        }) => Promise<PilotRecord>;
    };
    readonly agentActions: {
        list: () => Promise<{
            totals: {
                actions: number;
                approvalRequired: number;
                awaitingSettlement: number;
                completed: number;
                blocked: number;
            };
            actions: AgentAction[];
        }>;
        proposeDistribution: (input: ProposeAgentDistributionInput) => Promise<AgentAction>;
    };
    constructor(options: CurrentOptions);
    private get;
    private signedPost;
}
export declare function verifyCurrentWebhook(input: {
    secret: string;
    timestamp: string;
    signature: string;
    rawBody: string;
    toleranceMs?: number;
}): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map