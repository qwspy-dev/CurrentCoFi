# Agent Settlement Gateway

Current CoFi agents can propose walletless USDC or project-token campaigns, but agents never receive unrestricted custody or silently move project funds.

## Settlement boundary

1. A signed agent request is evaluated against its identity, daily-volume, maximum-reward, and human-review policies.
2. A permitted request creates a fully allocated campaign in `awaiting_funding`.
3. Current CoFi creates a durable settlement handoff and reports `awaiting_settlement`; campaign creation is not represented as settlement.
4. An authorized project member opens the agent ledger and signs the ERC-20 approval through their Circle user-controlled wallet.
5. The same wallet signs the Arc Campaign Vault deposit.
6. Only after Circle confirms the Arc transaction does the agent action become `completed`.

## Proof and recovery

Every handoff stores its campaign, approval challenge, funding challenge, final transaction hash, reviewer, timestamps, and structured evidence. The UI exposes the three-stage state machine, can safely restart interrupted wallet challenges, and links successful funding to the Arc explorer.

Events are delivered as `agent.settlement-ready`, `agent.settlement-approved`, and `agent.settled`. Evidence schema v5 includes settlement handoffs and counts only transaction-confirmed settlements toward agent-runtime grant readiness.

## Integration contract

Agents use `/api/v1/developer/agent-actions` to propose and read actions. Authorized workspace members use `/api/v1/agent-actions/settle` to create or confirm the Circle wallet challenges. This separation lets games, communities, and AI systems automate campaign preparation while project owners retain the final authority over funds.
