# Universal social payments

Current CoFi social payments support USDC and readable Arc ERC-20 project tokens across username sends, payment requests, tips, and split links. Current never holds the payment: the payer approves one exact token transfer from their Circle wallet to the recipient wallet.

## Asset integrity

- The token contract is inspected on Arc before a social current is created.
- The contract address, symbol, name, decimals, and verification boundary are stored with the payment.
- Amounts are converted using the token's own decimals, including 18-decimal project-token splits.
- Public payment pages disclose whether the asset is Circle-verified USDC or metadata read from a project-token contract.
- Settlement calls `transfer(address,uint256)` on the stored token contract, never a UI-selected or client-supplied address.
- Receipts and webhooks include the asset symbol and exact contract address.

Readable metadata does not mean a project token is endorsed, audited, or economically safe. Project tokens must already exist on Arc and the payer must hold enough of the selected token.

## Builder API

The signed TypeScript SDK accepts `tokenAddress` in `current.socialPayments.create(...)`. Server-created requests, tips, and split links use the same inspection, precision, public-preview, receipt, and direct-settlement path as the Current web application.
