import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const apiKey = "current_mcp_test_key";
const signingSecret = "current_mcp_test_signing_secret";
const requests: Array<{ method: string; url: string; headers: Headers; body: string }> = [];

const fixtures: Record<string, unknown> = {
  "/api/v1/proof-health": { digest: "proof-health-digest", status: "healthy", checks: [{ id: "arc", status: "verified" }] },
  "/api/v1/network-proof": { digest: "network-proof-digest", network: "Arc Testnet", totals: { wallets: 18, claims: 42 } },
  "/api/v1/grant-application": { digest: "grant-digest", status: "application-ready", applicantInputs: ["legal entity"] },
  "/api/v1/integration-manifest": { digest: "integration-digest", paths: [{ id: "mcp", package: "@currentcofi/mcp" }] },
  "/api/v1/developer/analytics": { totals: { campaigns: 3, recipients: 90, claimed: 61, activated: 28 }, retention: { day7: 41 } },
  "/api/v1/developer/bounties": { bounties: [{ id: "bounty_mcp", title: "Build the launch reel", status: "open", submissionCount: 2 }], totals: { bounties: 1, open: 1, submissions: 2, awarded: 0 }, privacy: "masked" },
  "/api/v1/developer/treasury": { treasury: { id: "treasury_mcp", name: "Community Treasury" }, budgets: [], proposals: [], totals: { proposals: 0, pending: 0, executed: 0, categories: 0 } },
  "/api/v1/developer/giveaways": { giveaways: [{ id: "giveaway_mcp", title: "Launch current", status: "open", entryCount: 24 }], totals: { giveaways: 1, open: 1, entries: 24, referrals: 7, drawn: 0 }, privacy: "masked" },
};

const httpServer = createServer(async (request, response) => {
  const bodyParts: Buffer[] = [];
  for await (const part of request) bodyParts.push(Buffer.from(part));
  const body = Buffer.concat(bodyParts).toString("utf8");
  const url = request.url ?? "/";
  const headers = new Headers(request.headers as Record<string, string>);
  requests.push({ method: request.method ?? "GET", url, headers, body });

  let data = fixtures[url];
  if (request.method === "POST" && url === "/api/v1/developer/agent-actions") {
    data = { id: "action_mcp", status: "approval_required", policyDecision: "human-review", settlement: null };
  }
  if (request.method === "POST" && url === "/api/v1/developer/activations") {
    data = { id: "activation_mcp", status: "accepted", duplicate: false };
  }
  response.writeHead(data ? 200 : 404, { "content-type": "application/json" });
  response.end(JSON.stringify(data ? { ok: true, data } : { ok: false, error: { code: "NOT_FOUND", message: "Missing fixture" } }));
});

httpServer.listen(0, "127.0.0.1");
await once(httpServer, "listening");
const address = httpServer.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve("dist/index.js")],
  cwd: process.cwd(),
  stderr: "pipe",
  env: {
    ...inheritedEnv,
    CURRENT_BASE_URL: baseUrl,
    CURRENT_MCP_MODE: "project",
    CURRENT_API_KEY: apiKey,
    CURRENT_SIGNING_SECRET: signingSecret,
    CURRENT_MCP_MAX_RECIPIENTS: "2",
  },
});
const client = new Client({ name: "current-mcp-integration-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const toolList = await client.listTools();
  assert.equal(toolList.tools.length, 13);
  assert.equal(toolList.tools.filter((tool) => tool.annotations?.readOnlyHint).length, 8);
  assert.equal(toolList.tools.filter((tool) => tool.annotations?.readOnlyHint === false).length, 5);
  const rewardSchema = toolList.tools.find((tool) => tool.name === "current_propose_reward_distribution")?.inputSchema as { properties?: { approval?: { const?: string } } } | undefined;
  assert.equal(rewardSchema?.properties?.approval?.const, "I_APPROVE_CURRENT_DISTRIBUTION");
  const bountySchema = toolList.tools.find((tool) => tool.name === "current_create_community_bounty")?.inputSchema as { properties?: { approval?: { const?: string } } } | undefined;
  assert.equal(bountySchema?.properties?.approval?.const, "I_APPROVE_CURRENT_BOUNTY");
  const treasurySchema = toolList.tools.find((tool) => tool.name === "current_create_treasury_proposal")?.inputSchema as { properties?: { approval?: { const?: string } } } | undefined;
  assert.equal(treasurySchema?.properties?.approval?.const, "I_APPROVE_CURRENT_TREASURY_PROPOSAL");
  const giveawaySchema = toolList.tools.find((tool) => tool.name === "current_create_verifiable_giveaway")?.inputSchema as { properties?: { approval?: { const?: string } } } | undefined;
  assert.equal(giveawaySchema?.properties?.approval?.const, "I_APPROVE_CURRENT_GIVEAWAY");

  const proof = await client.callTool({ name: "current_get_proof_health", arguments: {} });
  assert.equal((proof.structuredContent as { digest: string }).digest, "proof-health-digest");
  const grant = await client.callTool({ name: "current_get_grant_application", arguments: {} });
  assert.equal((grant.structuredContent as { status: string }).status, "application-ready");
  const analytics = await client.callTool({ name: "current_get_campaign_analytics", arguments: {} });
  assert.equal((analytics.structuredContent as { totals: { campaigns: number } }).totals.campaigns, 3);
  const bounties = await client.callTool({ name: "current_list_community_bounties", arguments: {} });
  assert.equal((bounties.structuredContent as { totals: { bounties: number } }).totals.bounties, 1);
  const treasury = await client.callTool({ name: "current_get_community_treasury", arguments: {} });
  assert.equal((treasury.structuredContent as { treasury: { name: string } }).treasury.name, "Community Treasury");
  const giveaways = await client.callTool({ name: "current_list_verifiable_giveaways", arguments: {} });
  assert.equal((giveaways.structuredContent as { totals: { entries: number } }).totals.entries, 24);

  const distribution = await client.callTool({
    name: "current_propose_reward_distribution",
    arguments: {
      idempotencyKey: "mcp-reward-0001",
      name: "MCP verified reward",
      recipients: [{ identityType: "game", identity: "player-42", amount: "25" }],
      approval: "I_APPROVE_CURRENT_DISTRIBUTION",
    },
  });
  assert.equal((distribution.structuredContent as { status: string }).status, "approval_required");
  const actionRequest = requests.find((request) => request.url === "/api/v1/developer/agent-actions");
  assert.ok(actionRequest);
  assert.equal(actionRequest.headers.get("authorization"), `Bearer ${apiKey}`);
  const actionTimestamp = actionRequest.headers.get("x-current-timestamp");
  assert.ok(actionTimestamp);
  assert.equal(
    actionRequest.headers.get("x-current-signature"),
    createHmac("sha256", signingSecret).update(`${actionTimestamp}.${actionRequest.body}`).digest("base64url"),
  );
  assert.equal(JSON.parse(actionRequest.body).approval, undefined);

  const activation = await client.callTool({
    name: "current_submit_activation",
    arguments: {
      externalEventId: "game-match-0042",
      eventType: "game.first_match",
      distributionId: "11111111-1111-4111-8111-111111111111",
      walletAddress: "0x1111111111111111111111111111111111111111",
      approval: "I_APPROVE_CURRENT_ACTIVATION",
    },
  });
  assert.equal(activation.isError, undefined, JSON.stringify(activation.content));
  assert.equal((activation.structuredContent as { status: string }).status, "accepted");
  const activationRequest = requests.find((request) => request.url === "/api/v1/developer/activations");
  assert.ok(activationRequest);
  assert.ok(activationRequest.headers.get("x-current-signature"));
  assert.equal(JSON.parse(activationRequest.body).approval, undefined);

  const unapproved = await client.callTool({ name: "current_propose_reward_distribution", arguments: { idempotencyKey: "mcp-reward-0002", name: "No approval", recipients: [{ identityType: "email", identity: "person@example.com", amount: "5" }] } });
  assert.equal(unapproved.isError, true);
  assert.match(JSON.stringify(unapproved.content), /approval/i);
  console.log("Current MCP integration test passed: 13 tools, public proof, authenticated analytics, bounties, treasury and giveaways, signed proposals, signed activations, and explicit approval validation.");
} finally {
  await client.close().catch(() => undefined);
  httpServer.close();
  await once(httpServer, "close");
}
