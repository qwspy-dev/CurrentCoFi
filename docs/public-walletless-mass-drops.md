# Public walletless mass drops

Current CoFi public drops turn one shareable URL into a finite, fully funded distribution for an offchain audience. A project chooses USDC or an Arc project token, a fixed reward per person, a hard cap of 2–500 recipients, and an expiry. Current creates every allocation and the campaign Merkle root before the pool opens.

## Recipient flow

1. Open the public drop URL.
2. Verify the project, reward, capacity, expiry, and funding proof.
3. Enter a display name and email address. The normalized email is hashed for duplicate prevention and encrypted for storage.
4. Current atomically reserves one unused allocation and binds its identity commitment to that email.
5. Continue through the private claim URL, sign in with the same email, and create an embedded Circle wallet when needed.
6. Claim without holding a separate gas token. The ordinary campaign settlement pipeline records the Arc receipt.

Returning with the same email returns the same protected claim rather than consuming another slot. Concurrent requests use a compare-and-set reservation update; competing requests retry another unreserved slot.

## Project and developer surfaces

- Product workspace: `#/drops`
- Public claim page: `?drop=<slug>#/drop`
- Signed-in API: `GET|POST /api/v1/drops`
- Public API: `GET|POST /api/v1/drops/public`
- HMAC developer API: `GET|POST /api/v1/developer/drops`
- TypeScript SDK: `client.drops.list()` and `client.drops.create()`
- MCP: `current_list_public_mass_drops` and `current_create_public_mass_drop`
- Webhooks: `public_drop.created` and `public_drop.reserved`

## Grant evidence

Evidence schema `current-evidence-v19` exports aggregate pool count, funded drops, reservations, claims, referrals, rewards, Merkle roots, and Arc funding transaction hashes. It does not export raw emails, encrypted identity ciphertext, or private claim tokens.

## Honest boundary

Creating a drop prepares a funded campaign but does not move funds by itself. An authorized Circle wallet must approve and deposit the complete pool. A drop only becomes open after campaign funding is active. Testnet assets have no monetary value.
