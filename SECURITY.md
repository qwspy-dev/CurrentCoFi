# Current CoFi security policy

Current CoFi is an Arc testnet product. It has an implementation-ready external-review package, but it has not completed an independent production audit and is not approved for mainnet funds.

## Report a vulnerability

Please use GitHub's private vulnerability reporting flow for this repository. Do not open a public issue containing exploit details, wallet credentials, recipient identities, signing material, or active attack instructions.

Include the affected component, impact, reproducible steps, a minimal proof of concept, and any suggested remediation. We will acknowledge a complete report within two business days, validate severity, coordinate a fix and disclosure window, and credit the reporter when requested.

## Scope

The preferred review scope is defined in [`security/audit-scope.json`](security/audit-scope.json). The threat model, protocol invariants, and auditor handoff are in the `docs` directory. Testnet funds have no monetary value; reports about production credential exposure, authorization bypass, unauthorized asset movement, replay, identity disclosure, or governance bypass receive the highest priority.

Never send real private keys, seed phrases, API secrets, or personal recipient data in a report.
