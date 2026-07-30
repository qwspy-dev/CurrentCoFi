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
    readonly analytics: {
        get: () => Promise<DeveloperAnalytics>;
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