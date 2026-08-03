# Universal asset links

Current CoFi personal links use the same funded, recoverable Arc vault for USDC and readable ERC-20 project tokens. A sender selects an asset, funds the exact amount, and shares a single-use signed claim URL. The recipient can open an embedded Circle wallet and claim without already holding gas.

## Safety boundary

- USDC is matched against the configured Arc testnet Circle contract and marked verified.
- Project-token metadata is read directly from the submitted Arc contract before a link is created.
- Invalid addresses, unreadable contracts, metadata longer than supported limits, and tokens with more than 18 decimals are rejected.
- A readable project token is not presented as endorsed, audited, or economically safe.
- Amounts use the token's declared decimals. No six-decimal USDC assumption is used for project tokens.
- The vault records the exact token contract and amount, supports one claim, and enables sender recovery according to the link's expiry rules.

## Builder API

Inspect the contract with `current.links.inspectToken(address)`, then create a link with `current.links.create({ amount, tokenAddress, message })`. Both developer mutations require a scoped key and HMAC signature. The response includes the claim URL, exact atomic funding amount, asset contract, metadata, and funding state.

Project tokens must already exist on Arc. Current CoFi does not bridge or issue third-party project tokens.
