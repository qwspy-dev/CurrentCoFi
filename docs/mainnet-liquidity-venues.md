# Mainnet liquidity venue qualification

Current CoFi separates protocol custody from venue-specific liquidity execution. The protocol-owned liquidity vault keeps $CURRENT and USDC under delayed governance, while adapters isolate the integration details of a particular Arc liquidity venue.

The venue registry closes the gap between “an address is allowlisted” and “this exact reviewed integration is qualified.”

## Qualification record

Every qualified adapter is bound to:

- Its exact deployed runtime bytecode hash.
- A stable venue identifier and committed display metadata.
- The immutable $CURRENT and native Arc USDC pair.
- A maximum slippage policy, capped by the registry at 10%.
- A maximum protocol-reserve allocation, capped by the registry at 50%.
- Its original activation time and latest policy update.
- A public approved or revoked state.

Current CoFi's initial testnet policy is stricter: 3% maximum slippage and 20% maximum reserve allocation.

## Governance

`CurrentVenueRegistryGovernor` owns the registry. The owner may queue a qualification or revocation, but execution is impossible until the public delay has elapsed. An independent guardian may cancel a queued operation or pause the governor. The guardian cannot approve a venue, alter its payload, or redirect protocol assets.

The queued payload commits to the adapter address, venue identity, metadata hash, bytecode hash, slippage ceiling, allocation ceiling, and approval state. Any change produces a payload mismatch at execution.

## Mainnet transition

No Arc mainnet DEX is hardcoded before liquidity, audited contracts, and integration terms are known. When a production venue is selected:

1. Build and independently review a venue-specific adapter against the stable liquidity interface.
2. Deploy it with the final $CURRENT and native Arc USDC addresses.
3. Record its exact bytecode and proposed risk policy.
4. Queue qualification through the venue governor.
5. Allow the public review window and guardian cancellation period to pass.
6. Qualify the same adapter in liquidity custody governance.
7. Begin with a bounded position and verify reserve accounting before increasing exposure.

This makes venue selection a replaceable integration decision while custody, accounting, governance, and public evidence remain stable.

## Public integration surface

- `GET /api/v1/venues`
- `GET /api/v1/developer/venues`
- `current.venues.get()` in the TypeScript SDK
- The **Liquidity venues** application view
- Venue registry anchors in grant-evidence schema v9

The Arc testnet venue entry and its balances have no monetary value and do not represent endorsement by a production exchange.
