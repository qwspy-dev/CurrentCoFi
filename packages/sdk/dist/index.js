export class CurrentError extends Error {
    code;
    status;
    requestId;
    details;
    constructor(code, message, status, requestId, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.requestId = requestId;
        this.details = details;
        this.name = "CurrentError";
    }
}
function normalizeBaseUrl(value) {
    return value.replace(/\/+$/, "");
}
function base64Url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes))
        binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
async function signature(secret, timestamp, body) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)));
}
async function parseResponse(response) {
    const payload = await response.json();
    if (!response.ok || !payload.ok || payload.data === undefined) {
        throw new CurrentError(payload.error?.code ?? "CURRENT_REQUEST_FAILED", payload.error?.message ?? `Current CoFi returned HTTP ${response.status}.`, response.status, payload.meta?.requestId, payload.error?.details);
    }
    return payload.data;
}
export class Current {
    apiKey;
    signingSecret;
    baseUrl;
    request;
    distributions = {
        create: (input) => this.signedPost("/api/v1/developer/distributions", input),
    };
    links = {
        inspectToken: (address) => this.signedPost("/api/v1/developer/tokens/inspect", { address }),
        create: (input) => this.signedPost("/api/v1/developer/links", input),
    };
    escrow = {
        list: () => this.get("/api/v1/developer/escrow"),
        create: (input) => this.signedPost("/api/v1/developer/escrow", input),
    };
    checkout = {
        list: () => this.get("/api/v1/developer/checkout"),
        setup: (input) => this.signedPost("/api/v1/developer/checkout", { action: "setup", ...input }),
        create: (input) => this.signedPost("/api/v1/developer/checkout", input),
    };
    socialPayments = {
        create: (input) => this.signedPost("/api/v1/developer/social-payments", input),
    };
    subscriptions = {
        list: () => this.get("/api/v1/developer/subscriptions"),
        createPlan: (input) => this.signedPost("/api/v1/developer/subscriptions", input),
    };
    bounties = {
        list: () => this.get("/api/v1/developer/bounties"),
        create: (input) => this.signedPost("/api/v1/developer/bounties", input),
        shortlist: (bountyId, submissionId) => this.signedPost("/api/v1/developer/bounties", { action: "shortlist", bountyId, submissionId }),
        reject: (bountyId, submissionId) => this.signedPost("/api/v1/developer/bounties", { action: "reject", bountyId, submissionId }),
        award: (bountyId, submissionId) => this.signedPost("/api/v1/developer/bounties", { action: "award", bountyId, submissionId }),
    };
    treasury = {
        get: () => this.get("/api/v1/developer/treasury"),
        setup: (input) => this.signedPost("/api/v1/developer/treasury", { action: "setup", ...input }),
        createBudget: (input) => this.signedPost("/api/v1/developer/treasury", { action: "budget", ...input }),
        createProposal: (input) => this.signedPost("/api/v1/developer/treasury", { action: "proposal", ...input }),
    };
    giveaways = {
        list: () => this.get("/api/v1/developer/giveaways"),
        create: (input) => this.signedPost("/api/v1/developer/giveaways", input),
        draw: (giveawayId) => this.signedPost("/api/v1/developer/giveaways", { action: "draw", giveawayId }),
    };
    drops = {
        list: () => this.get("/api/v1/developer/drops"),
        create: (input) => this.signedPost("/api/v1/developer/drops", input),
    };
    vesting = {
        list: () => this.get("/api/v1/developer/vesting"),
        create: (input) => this.signedPost("/api/v1/developer/vesting", input),
    };
    activations = {
        submit: (input) => this.signedPost("/api/v1/developer/activations", {
            ...input,
            occurredAt: input.occurredAt ?? new Date().toISOString(),
            payload: input.payload ?? {},
        }),
    };
    identities = {
        attest: (input) => this.signedPost("/api/v1/developer/identity-attestations", input),
    };
    conditions = {
        verify: (input) => this.signedPost("/api/v1/developer/claim-conditions", input),
    };
    analytics = {
        get: () => this.get("/api/v1/developer/analytics"),
    };
    integrations = {
        manifest: () => this.publicGet("/api/v1/integration-manifest"),
        readiness: () => this.get("/api/v1/developer/integration-readiness"),
        certify: () => this.signedPost("/api/v1/developer/integration-certification", {}),
    };
    network = {
        proof: () => this.publicGet("/api/v1/network-proof"),
    };
    dossier = {
        get: () => this.publicGet("/api/v1/grant-dossier"),
        application: () => this.publicGet("/api/v1/grant-application"),
    };
    proofs = {
        campaigns: () => this.publicGet("/api/v1/campaign-proofs"),
        reviewerDemo: () => this.publicGet("/api/v1/reviewer-demo"),
        projectToken: () => this.publicGet("/api/v1/project-token-proof"),
        health: () => this.publicGet("/api/v1/proof-health"),
    };
    quality = {
        get: () => this.get("/api/v1/developer/quality"),
        evaluate: (distributionId) => this.signedPost("/api/v1/developer/quality", { action: "evaluate", distributionId }),
        updatePolicy: (distributionId, input) => this.signedPost("/api/v1/developer/quality", { action: "update-policy", distributionId, ...input }),
    };
    funding = {
        list: () => this.get("/api/v1/developer/funding"),
    };
    gateway = {
        list: () => this.get("/api/v1/developer/gateway"),
    };
    liquidity = {
        get: () => this.get("/api/v1/developer/liquidity"),
    };
    partners = {
        get: () => this.get("/api/v1/developer/partners"),
    };
    venues = {
        get: () => this.get("/api/v1/developer/venues"),
    };
    releases = {
        get: () => this.get("/api/v1/developer/launch-readiness"),
    };
    observability = {
        get: () => this.get("/api/v1/developer/observability"),
    };
    security = {
        get: () => this.get("/api/v1/developer/security"),
        auditReadiness: () => this.get("/api/v1/security/audit-readiness"),
    };
    evidence = {
        list: () => this.get("/api/v1/developer/evidence"),
        create: (input = {}) => this.signedPost("/api/v1/developer/evidence", input),
    };
    grant = {
        list: () => this.get("/api/v1/developer/grant"),
        create: (input = {}) => this.signedPost("/api/v1/developer/grant", input),
    };
    pilots = {
        list: () => this.get("/api/v1/developer/pilots"),
        create: (input) => this.signedPost("/api/v1/developer/pilots", input),
        update: (pilotId, input) => this.signedPost("/api/v1/developer/pilots", { action: "update", pilotId, ...input }),
        createInvitation: (input) => this.signedPost("/api/v1/developer/pilots", { action: "create-invitation", ...input }),
        reviewApplication: (applicationId, status, reviewNotes) => this.signedPost("/api/v1/developer/pilots", { action: "review-application", applicationId, status, reviewNotes }),
    };
    agentActions = {
        list: () => this.get("/api/v1/developer/agent-actions"),
        proposeDistribution: (input) => this.signedPost("/api/v1/developer/agent-actions", input),
    };
    constructor(options) {
        if (!options.apiKey || !options.signingSecret) {
            throw new Error("Current requires apiKey and signingSecret.");
        }
        this.apiKey = options.apiKey;
        this.signingSecret = options.signingSecret;
        this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://www.currentco.finance");
        this.request = options.fetch ?? globalThis.fetch;
    }
    async get(path) {
        const response = await this.request(`${this.baseUrl}${path}`, {
            headers: {
                accept: "application/json",
                authorization: `Bearer ${this.apiKey}`,
            },
        });
        return parseResponse(response);
    }
    async publicGet(path) {
        const response = await this.request(`${this.baseUrl}${path}`, { headers: { accept: "application/json" } });
        return parseResponse(response);
    }
    async signedPost(path, value) {
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
        return parseResponse(response);
    }
}
export async function verifyCurrentWebhook(input) {
    const timestamp = Number(input.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > (input.toleranceMs ?? 300_000)) {
        return false;
    }
    const expected = await signature(input.secret, input.timestamp, input.rawBody);
    if (expected.length !== input.signature.length)
        return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
        difference |= expected.charCodeAt(index) ^ input.signature.charCodeAt(index);
    }
    return difference === 0;
}
//# sourceMappingURL=index.js.map