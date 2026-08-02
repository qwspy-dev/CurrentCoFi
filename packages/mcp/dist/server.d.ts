import { McpServer } from "@modelcontextprotocol/server";
export type CurrentMcpConfig = {
    baseUrl?: string;
    mode?: "read-only" | "project";
    apiKey?: string;
    signingSecret?: string;
    maxRecipients?: number;
    fetch?: typeof globalThis.fetch;
};
export declare function configFromEnv(env?: NodeJS.ProcessEnv): CurrentMcpConfig;
export declare function createCurrentMcpServer(input?: CurrentMcpConfig): {
    server: McpServer;
    capabilities: {
        mode: "read-only" | "project";
        projectEnabled: boolean;
        maxRecipients: number;
        tools: number;
        writesRequireExplicitApproval: boolean;
        custody: string;
    };
};
//# sourceMappingURL=server.d.ts.map