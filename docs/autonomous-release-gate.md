# Autonomous release gate

Current CoFi has one deterministic release command for every internally verifiable product claim:

```text
pnpm run release:verify
```

The gate builds the production client, enforces compressed JavaScript budgets, verifies the rendered application shell, checks TypeScript and lint rules, builds the public SDK, React embeds, and MCP server, then runs every curated offline product, contract, security, developer, grant-evidence, agent, SDK, and MCP suite exposed by `package.json` in a stable order.

The command stops at the first broken boundary and writes a machine-readable report to `artifacts/release-gate.json`. That report includes the commit supplied by Vercel or GitHub, each completed check, its result, and its duration. It contains no credentials or user data.

## Release boundary

A passing gate proves that the repository's autonomous implementation and evidence remain internally coherent. It does not claim an independent audit, external pilot traction, token legal approval, or Arc mainnet availability. Those remain external gates and must not be replaced by self-attestation.

Database-backed account journeys and live Circle or Arc settlement checks intentionally remain in the staging verification layer. The deterministic gate never points test code at production data, never requires production wallet credentials, and never treats a missing external secret as a product regression.

## Continuous verification

GitHub runs the same gate on pull requests, pushes to `main`, and the weekly scheduled review. Production deployment should occur only from a commit that passes this command. The Vercel deployment is then checked separately for live health, browser rendering, and runtime errors.
