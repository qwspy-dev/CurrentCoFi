import { Current } from "@currentcofi/sdk";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
function normalizeBaseUrl(value) {
    return value.replace(/\/+$/, "");
}
function boundedInteger(value, fallback, minimum, maximum) {
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}
function success(value) {
    const structuredContent = value && typeof value === "object" && !Array.isArray(value) ? value : { result: value };
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent };
}
function failure(code, message) {
    return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: { code, message } }, null, 2) }] };
}
export function configFromEnv(env = process.env) {
    return {
        baseUrl: env.CURRENT_BASE_URL,
        mode: env.CURRENT_MCP_MODE === "project" ? "project" : "read-only",
        apiKey: env.CURRENT_API_KEY,
        signingSecret: env.CURRENT_SIGNING_SECRET,
        maxRecipients: env.CURRENT_MCP_MAX_RECIPIENTS ? Number(env.CURRENT_MCP_MAX_RECIPIENTS) : undefined,
    };
}
export function createCurrentMcpServer(input = configFromEnv()) {
    const baseUrl = normalizeBaseUrl(input.baseUrl ?? "https://www.currentco.finance");
    const mode = input.mode ?? "read-only";
    const maxRecipients = boundedInteger(input.maxRecipients, 25, 1, 500);
    const request = input.fetch ?? globalThis.fetch;
    const projectEnabled = mode === "project" && Boolean(input.apiKey && input.signingSecret);
    const current = projectEnabled ? new Current({ apiKey: input.apiKey, signingSecret: input.signingSecret, baseUrl, fetch: request }) : null;
    const server = new McpServer({ name: "current-cofi", version: "0.1.0" }, { instructions: "Use Current's public proof tools before recommending an integration. Project mutations require explicit user approval, a stable idempotency key, and scoped credentials. A proposed reward is not settled until Current returns completed with Arc transaction evidence." });
    async function publicGet(path) {
        const response = await request(`${baseUrl}${path}`, { headers: { accept: "application/json" } });
        const envelope = await response.json();
        if (!response.ok || !envelope.ok || envelope.data === undefined)
            throw new Error(envelope.error?.message ?? `Current returned HTTP ${response.status}.`);
        return envelope.data;
    }
    function requireProject() {
        if (!current)
            throw new Error("Project mode requires CURRENT_MCP_MODE=project, CURRENT_API_KEY, and CURRENT_SIGNING_SECRET.");
        return current;
    }
    const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
    const mutation = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
    const noInput = {};
    server.registerTool("current_get_proof_health", {
        title: "Verify Current grant proof health",
        description: "Read the live digest-verified status of Current CoFi's public Arc evidence surfaces and honest external boundaries.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => success(await publicGet("/api/v1/proof-health")));
    server.registerTool("current_get_network_proof", {
        title: "Read Current network proof",
        description: "Read privacy-safe verified Arc testnet project, campaign, claim, wallet, and activation totals.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => success(await publicGet("/api/v1/network-proof")));
    server.registerTool("current_get_grant_application", {
        title: "Read Current grant application packet",
        description: "Read Current CoFi's canonical Circle grant answers, milestone evidence, applicant inputs, and external gates.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => success(await publicGet("/api/v1/grant-application")));
    server.registerTool("current_get_integration_manifest", {
        title: "Discover Current integration paths",
        description: "Read the digest-addressed SDK, React, REST, webhook, identity, and agent integration contract.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => success(await publicGet("/api/v1/integration-manifest")));
    server.registerTool("current_get_campaign_analytics", {
        title: "Read project campaign analytics",
        description: "Read authenticated campaign, recipient, claim, activation, referral, and retention outcomes for the configured project.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => {
        try {
            return success(await requireProject().analytics.get());
        }
        catch (error) {
            return failure("PROJECT_MODE_REQUIRED", error instanceof Error ? error.message : "Project analytics are unavailable.");
        }
    });
    server.registerTool("current_list_community_bounties", {
        title: "Read project community bounties",
        description: "Read funded prize status, masked submissions, proof digests, and awards for the configured Current project.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => {
        try {
            return success(await requireProject().bounties.list());
        }
        catch (error) {
            return failure("PROJECT_MODE_REQUIRED", error instanceof Error ? error.message : "Project bounties are unavailable.");
        }
    });
    server.registerTool("current_create_community_bounty", {
        title: "Create a prize-backed community bounty",
        description: "Prepare a fully allocated USDC or Arc project-token bounty and its walletless winner claim. Funding still requires an authorized Circle wallet approval.",
        inputSchema: {
            title: z.string().min(3).max(100),
            summary: z.string().min(30).max(2_000),
            category: z.string().min(2).max(50),
            amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
            tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
            submissionDeadline: z.string().datetime(),
            approval: z.literal("I_APPROVE_CURRENT_BOUNTY"),
        },
        annotations: mutation,
    }, async ({ approval: _approval, ...value }) => {
        void _approval;
        try {
            return success(await requireProject().bounties.create(value));
        }
        catch (error) {
            return failure("CURRENT_ACTION_REJECTED", error instanceof Error ? error.message : "Current rejected the bounty.");
        }
    });
    server.registerTool("current_list_verifiable_giveaways", {
        title: "Read project verifiable giveaways",
        description: "Read prize funding, encrypted-entry totals, referral attribution, commitments, revealed draw proofs, and winners.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => {
        try {
            return success(await requireProject().giveaways.list());
        }
        catch (error) {
            return failure("PROJECT_MODE_REQUIRED", error instanceof Error ? error.message : "Project giveaways are unavailable.");
        }
    });
    server.registerTool("current_create_verifiable_giveaway", {
        title: "Create a verifiable walletless giveaway",
        description: "Precommit randomness and prepare a fully allocated USDC or Arc project-token prize. Funding and drawing remain separate authorized actions.",
        inputSchema: {
            title: z.string().min(3).max(100), description: z.string().min(20).max(1_000), amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
            tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), entryDeadline: z.string().datetime(), maxEntries: z.number().int().min(2).max(100_000).optional(),
            approval: z.literal("I_APPROVE_CURRENT_GIVEAWAY"),
        },
        annotations: mutation,
    }, async ({ approval: _approval, ...value }) => {
        void _approval;
        try {
            return success(await requireProject().giveaways.create(value));
        }
        catch (error) {
            return failure("CURRENT_ACTION_REJECTED", error instanceof Error ? error.message : "Current rejected the giveaway.");
        }
    });
    server.registerTool("current_get_community_treasury", {
        title: "Read the community treasury",
        description: "Read transparent budgets, proposal decisions, and Arc settlement receipts for the configured project.",
        inputSchema: noInput,
        annotations: readOnly,
    }, async () => {
        try {
            return success(await requireProject().treasury.get());
        }
        catch (error) {
            return failure("PROJECT_MODE_REQUIRED", error instanceof Error ? error.message : "Community treasury is unavailable.");
        }
    });
    server.registerTool("current_create_treasury_proposal", {
        title: "Create a community treasury proposal",
        description: "Create a transparent spending proposal. This never moves funds; authorized project members must approve it and the configured Circle wallet must execute it.",
        inputSchema: {
            treasuryId: z.string().uuid(), budgetId: z.string().uuid().optional(), title: z.string().min(3).max(100), description: z.string().min(20).max(2_000), category: z.string().min(2).max(50),
            recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), amount: z.string().regex(/^\d+(\.\d{1,18})?$/), tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), proofUrl: z.string().url().optional(),
            approval: z.literal("I_APPROVE_CURRENT_TREASURY_PROPOSAL"),
        },
        annotations: mutation,
    }, async ({ approval: _approval, ...value }) => {
        void _approval;
        try {
            return success(await requireProject().treasury.createProposal(value));
        }
        catch (error) {
            return failure("CURRENT_ACTION_REJECTED", error instanceof Error ? error.message : "Current rejected the treasury proposal.");
        }
    });
    const recipientSchema = z.object({
        identityType: z.enum(["email", "wallet", "x", "game", "custom"]),
        identity: z.string().min(1).max(320),
        amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
    });
    const rewardInput = {
        idempotencyKey: z.string().min(8).max(160),
        name: z.string().min(2).max(120),
        tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
        recipients: z.array(recipientSchema).min(1).max(maxRecipients),
        expiresInHours: z.number().int().min(1).max(720).optional(),
        activationEvent: z.string().min(2).max(160).optional(),
        referralReward: z.string().min(1).max(160).optional(),
        approval: z.literal("I_APPROVE_CURRENT_DISTRIBUTION"),
    };
    server.registerTool("current_propose_reward_distribution", {
        title: "Propose a policy-bound reward distribution",
        description: "Propose a walletless USDC or Arc project-token campaign. Current enforces project policy and may block, require human review, or await authorized wallet settlement.",
        inputSchema: rewardInput,
        annotations: mutation,
    }, async ({ approval: _approval, recipients, ...value }) => {
        void _approval;
        try {
            return success(await requireProject().agentActions.proposeDistribution({ ...value, recipients: recipients }));
        }
        catch (error) {
            return failure("CURRENT_ACTION_REJECTED", error instanceof Error ? error.message : "Current rejected the proposal.");
        }
    });
    const activationInput = {
        externalEventId: z.string().min(3).max(160),
        eventType: z.string().min(2).max(160),
        distributionId: z.string().uuid(),
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        occurredAt: z.string().datetime().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        approval: z.literal("I_APPROVE_CURRENT_ACTIVATION"),
    };
    server.registerTool("current_submit_activation", {
        title: "Submit a verified activation event",
        description: "Attribute a project-verified post-claim action to an exact Current campaign and recipient wallet. The external event ID is idempotent.",
        inputSchema: activationInput,
        annotations: mutation,
    }, async ({ approval: _approval, ...value }) => {
        void _approval;
        try {
            return success(await requireProject().activations.submit({ ...value, walletAddress: value.walletAddress }));
        }
        catch (error) {
            return failure("CURRENT_ACTION_REJECTED", error instanceof Error ? error.message : "Current rejected the activation.");
        }
    });
    return { server, capabilities: { mode, projectEnabled, maxRecipients, tools: 13, writesRequireExplicitApproval: true, custody: "MCP server never receives wallet private keys or seed phrases" } };
}
//# sourceMappingURL=server.js.map