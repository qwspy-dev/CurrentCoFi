# Policy-bound agent commerce

Current CoFi agents can propose walletless USDC checkout links through the same signed, idempotent action ledger used for reward distributions. An agent may request a plain merchant checkout or a programmable settlement plan containing bounded affiliate payouts and customer USDC rewards.

## Enforced policy

Every agent key records independent controls for maximum checkout price, the price that requires human approval, whether programmable settlement is allowed, maximum affiliate basis points, maximum customer-reward basis points, and a shared daily action limit. Requests outside those limits are stored as blocked decisions. Requests at or above the review threshold remain inert until an authorized project member approves them.

## No-custody boundary

An approved agent action creates only a hosted checkout link. It does not charge a customer, approve a token, move USDC, or give the agent access to a Circle wallet. A customer later signs in and explicitly authorizes the exact payment. The agent result states `link_created_no_funds_moved` so link creation can never be confused with settlement.

Agents also cannot create a merchant profile or choose its settlement address. A project owner must configure the merchant destination first, and every agent-created checkout inherits that human-controlled destination.

## Integration surfaces

- Signed API: `POST /api/v1/developer/agent-actions` with `kind: "programmable_checkout"`.
- TypeScript SDK: `current.agentActions.proposeCheckout(...)`.
- MCP write tool: `current_propose_programmable_checkout`, protected by `I_APPROVE_CURRENT_CHECKOUT`.
- MCP read tool: `current_get_programmable_commerce`.
- Webhook: `agent.checkout-created`.
- Workspace: the human approval queue distinguishes checkout proposals from funded reward campaigns and links to completed hosted checkout pages.

This gives games, launch platforms, communities, and AI systems a reusable commerce primitive while preserving human control over policy changes and customer control over every payment.
