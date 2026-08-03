# @currentcofi/mcp

Connect Current CoFi's walletless USDC and Arc project-token activation infrastructure to any MCP-compatible agent host.

The server starts in `read-only` mode and exposes public network proof, proof health, the Circle grant packet, and the builder integration manifest. Project analytics and mutations require scoped Current API credentials and `CURRENT_MCP_MODE=project`.

```json
{
  "mcpServers": {
    "current-cofi": {
      "command": "node",
      "args": ["/absolute/path/to/CurrentCoFi/packages/mcp/dist/index.js"],
      "env": {
        "CURRENT_MCP_MODE": "read-only"
      }
    }
  }
}
```

Build the package with `pnpm --filter @currentcofi/mcp build`. The future registry command will be `npx -y @currentcofi/mcp`; npm publication is not claimed until that external release is complete.

For project mode, add `CURRENT_API_KEY` and `CURRENT_SIGNING_SECRET` from a scoped Current developer key. Keep both values in the agent host's secret storage—not in prompts or source control.

## Safety boundary

- Read-only is the default.
- Write tools are unusable without project mode and both scoped credentials.
- Reward proposals pass through Current's existing agent policy engine.
- Every write requires an exact explicit approval phrase.
- Recipient batches are capped by `CURRENT_MCP_MAX_RECIPIENTS` (default 25, hard maximum 500).
- Stable idempotency keys protect reward proposals from duplicate execution.
- The MCP server never receives wallet private keys or seed phrases.
- `approval_required` and `awaiting_settlement` do not mean funds moved. Only `completed` with Arc transaction evidence is settlement.

## Tools

- `current_get_proof_health`
- `current_get_network_proof`
- `current_get_grant_application`
- `current_get_integration_manifest`
- `current_get_campaign_analytics`
- `current_list_community_bounties`
- `current_get_community_treasury`
- `current_create_treasury_proposal`
- `current_create_community_bounty`
- `current_list_verifiable_giveaways`
- `current_create_verifiable_giveaway`
- `current_list_launch_vesting`
- `current_create_launch_vesting`
- `current_propose_reward_distribution`
- `current_submit_activation`

Treasury agents can read published budgets and propose spending only after the exact `I_APPROVE_CURRENT_TREASURY_PROPOSAL` phrase. They cannot execute a payment; the configured Circle treasury wallet must approve the final transfer.

Giveaway agents can read masked entry totals, referral attribution, and public draw proof. Creation requires the exact `I_APPROVE_CURRENT_GIVEAWAY` phrase. Prize funding remains a separate Circle-wallet action, and the MCP server never receives the private winner claim.

Launch-vesting agents can read masked recipients, funded schedules, unlocks, and claims. Creation requires `I_APPROVE_CURRENT_VESTING`; full schedule funding remains a separate Circle-wallet action, while private recipient identities and tranche claim credentials remain encrypted.
