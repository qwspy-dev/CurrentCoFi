# Community bounties

Current CoFi community bounties turn a project task into a fully allocated Arc reward. A project publishes a brief, amount, asset, category, and deadline. Current creates a one-recipient Campaign Vault allocation and keeps the winning claim credential encrypted until the project selects a submission.

## Safety and privacy

- A bounty accepts submissions only after its USDC or project-token prize is active in the Campaign Vault.
- Public submitter contacts are normalized, hashed for duplicate protection, encrypted at rest, and returned to operators only as masked labels.
- Work proof must use a public HTTPS URL without embedded credentials.
- Each proof receives a deterministic digest that can be included in audit, webhook, and grant-evidence records.
- Selecting a winner rejects every other submission and reveals one walletless claim URL to the authorized project operator.
- Current never exposes the private claim credential in the public bounty response.

## Product surfaces

- `#/bounties` is the authenticated project workspace for publishing, funding, reviewing, and awarding bounties.
- `?bounty=<slug>#/bounty` is the public brief and submission experience.
- `GET|POST /api/v1/bounties` serves the authenticated web application.
- `GET|POST /api/v1/bounties/public` serves public bounty discovery and submission.
- `GET|POST /api/v1/developer/bounties` provides scoped HMAC API access.
- `Current.bounties` exposes the workflow through `@currentcofi/sdk`.
- The MCP server exposes a read tool and an explicitly approved create tool for AI agents.

## Honest boundary

The shipped flow is Arc testnet infrastructure. Creating a bounty prepares the Campaign Vault funding transaction; an authorized Circle wallet must approve and complete the funding before the public bounty opens. Current does not claim that a testnet prize has monetary value, that submitted work is objectively correct, or that an award replaces a project’s own review process.
