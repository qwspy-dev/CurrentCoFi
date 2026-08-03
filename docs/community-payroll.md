# Current CoFi community payroll

Community payroll turns a reusable contributor roster into recurring, identity-bound Arc distributions. It supports Arc testnet USDC and inspected ERC-20 project tokens while preserving Current CoFi's walletless claim experience.

## Product flow

1. An authorized project operator creates a weekly, biweekly, or monthly schedule.
2. Contributors are assigned by email, X account, wallet, game identity, or custom project identity.
3. Raw identities are normalized and encrypted at rest. The dashboard only receives masked labels.
4. The lifecycle worker creates one idempotent due-run record for each scheduled cycle.
5. A project operator prepares the run. Current decrypts the roster only in memory and builds a Merkle campaign with one allocation per contributor.
6. The operator explicitly approves token access and funds the campaign through Circle's wallet challenge.
7. Contributors claim into an existing wallet or a newly created Current wallet without holding gas.
8. Expiration and recovery use the existing campaign vault controls.

## Trust boundaries

- Current never silently moves project funds. Each run requires an authenticated Circle approval.
- Contributor identities are encrypted with the server application key and are never included in list responses, logs, audit metadata, or webhook payloads.
- Project membership is checked on every schedule, status, and preparation operation.
- A unique schedule/cycle index and conflict-safe insertion prevent duplicate scheduled runs.
- Payroll reuses the audited campaign amount parsing, token inspection, duplicate-recipient checks, Merkle commitments, wallet-bound identity attestations, and recovery rails.
- Scheduled automation prepares operational work; it does not claim custody or promise unattended transfers.

## Grant evidence

The module adds a new Arc-native value flow: projects can repeatedly pay global contributors in USDC or their own token without collecting wallets first. Every run produces a project-scoped audit event, signed webhook event, fully funded campaign commitment, claim receipts, and measurable funded-wallet activity. This directly demonstrates USDC utility, embedded wallet acquisition, repeat settlement, and reusable infrastructure for other Arc teams.

## Remaining external proof

Production traction still requires outside Arc projects and real contributors. Mainnet value movement remains blocked on Arc mainnet availability and production Circle configuration. Independent review remains required before real-value custody.
