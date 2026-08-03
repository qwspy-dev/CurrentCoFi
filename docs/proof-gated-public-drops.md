# Proof-gated public activation drops

Current public drops can optionally require a project-signed action proof before settlement. Projects still commit and fund the complete USDC or Arc project-token pool before opening the public link, while recipients reserve one encrypted, identity-bound allocation and receive an embedded wallet through the normal walletless claim flow.

## Settlement boundary

The drop stores a normalized condition containing an event type, recipient-facing label, instructions, and maximum proof lifetime. After the recipient signs in and receives an Arc wallet, an authorized project integration submits a signed condition proof for that exact distribution, wallet, and event. Current rejects missing, expired, reused, or wallet-mismatched proofs; a successful proof is consumed by the confirmed claim.

Current does not claim to independently observe the project's offchain action. The project attests the event with its scoped signing secret, and Current makes that trust boundary explicit in the hosted page, API response, audit events, and evidence export.

## Builder surfaces

- Workspace operators configure the gate while creating a public mass drop.
- REST and the TypeScript SDK accept `claimCondition` on public-drop creation.
- The MCP project tool accepts the same bounded condition under explicit write approval.
- The existing signed claim-condition endpoint issues wallet-bound proofs.
- Public and owner drop views expose the normalized condition without exposing recipient identities.
- Grant evidence reports funded drops, proof-gated pools, reservations, referrals, and confirmed Arc claims separately.

This turns Current's public distribution surface from an airdrop counter into an activation rail: projects can reward a completed game milestone, purchase, attendance record, qualified referral, or custom signed action without requiring recipients to begin with a wallet or gas.
