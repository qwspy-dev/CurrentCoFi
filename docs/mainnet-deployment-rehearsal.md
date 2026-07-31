# Current CoFi mainnet deployment rehearsal

Current CoFi rehearses the production deployment as one governed release, not a collection of unrelated contract addresses. The Arc testnet proof is anchored by `CurrentReleaseRegistry` and `CurrentReleaseGovernor`.

## Active rehearsal proof

- Release registry: `0x1d5de9e5c9a1af2d04cab2a083a08ad444235aca`
- Delayed release governor: `0xe9eb91803df1b460f9df036b011bb1fd027d2c79`
- Release ID: `0x00404b5caf8fab798e7b87ec8756b90f7226e4fb3495cfaedede4f0188ce45a4`
- Manifest hash: `0xa096d974f57b99d8ca1fd76c08541917d40d0f69d5b0fa797c1159147b1209aa`
- Critical components: 10
- Public review delay: 30 seconds on testnet

The active manifest binds the claim vault, campaign vault, $CURRENT token, project lock vault, fee router, access manager, buyback governor, liquidity vault, partner vault, and liquidity venue registry to exact runtime bytecode hashes.

## Release sequence

1. Compile reviewed, pinned contract sources.
2. Deploy modules in dependency order.
3. Read each deployed runtime bytecode hash.
4. Build one deterministic release payload containing component ID, address, code hash, and version hash.
5. Queue that exact payload through `CurrentReleaseGovernor`.
6. Allow the public review delay to elapse.
7. Execute the unchanged payload. Any mutation is rejected.
8. Verify all components through `validateComponent` and publish the manifest through the API and dashboard.

## Pause and rollback drill

The independent guardian may cancel a queued release or pause new executions, but cannot publish a release or redirect funds. Rollback is a new delayed release using the complete, previously reviewed component payload. Deactivation is also delayed. The active release remains readable even if the application is unavailable.

## Mainnet gate

The mainnet deployment uses the same process with a materially longer delay, multisignature owner and guardian accounts, production Circle configuration, final Arc mainnet RPC/explorer values, audited contract artifacts, and a qualified production liquidity venue. No mainnet addresses or monetary-value token claims are presented until Arc mainnet is officially available and each gate passes.

## Reviewer surfaces

- `GET /api/v1/launch-readiness`
- `GET /api/v1/developer/launch-readiness`
- `current.releases.get()` in the TypeScript SDK
- The **Launch readiness** application view
- Grant-evidence schema v10 release anchors

