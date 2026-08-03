# Current CoFi MCP integration

Current CoFi ships an installable Model Context Protocol server for AI agents that need to inspect public Arc evidence, read project outcomes, propose walletless reward campaigns, or submit verified activation events.

## Read-only setup

```json
{
  "mcpServers": {
    "current-cofi": {
      "command": "node",
      "args": ["/absolute/path/to/CurrentCoFi/packages/mcp/dist/index.js"],
      "env": { "CURRENT_MCP_MODE": "read-only" }
    }
  }
}
```

Run `pnpm --filter @currentcofi/mcp build` first. The package is source-ready and tested in the public repository. Publishing `@currentcofi/mcp` to npm is a separate external release step; after publication, the shorter command will be `npx -y @currentcofi/mcp`.

Read-only mode is the default and does not need Current credentials. It exposes live proof health, network proof, the Circle grant packet, and the integration manifest.

## Project setup

Project mode adds authenticated analytics, community-bounty access, and three write tools. Store credentials in the agent host's secret manager, never in prompts or source control.

```json
{
  "CURRENT_MCP_MODE": "project",
  "CURRENT_API_KEY": "current_live_...",
  "CURRENT_SIGNING_SECRET": "...",
  "CURRENT_MCP_MAX_RECIPIENTS": "25"
}
```

## Value-movement boundary

The MCP server does not hold wallet private keys or seed phrases. Reward proposals require the exact `I_APPROVE_CURRENT_DISTRIBUTION` phrase, a stable idempotency key, scoped credentials, HMAC signing, and Current's project policy evaluation. A result of `approval_required` or `awaiting_settlement` does not mean funds moved. Only `completed` with an Arc transaction receipt is settlement evidence.

Activation submission requires the exact `I_APPROVE_CURRENT_ACTIVATION` phrase and an idempotent external event identifier. Recipient batches default to 25 and cannot exceed 500.

## Verification

- Public manifest: `https://www.currentco.finance/api/v1/mcp-manifest`
- Agent tool catalog: `https://www.currentco.finance/api/v1/agent/tools`
- Developer interface: `https://www.currentco.finance/#/developers`
- Source package: `packages/mcp`

The integration test launches the compiled server over stdio, connects through the official MCP client, discovers all nine tools, exercises public and authenticated reads, verifies signed write requests, and proves that missing approval is rejected.
