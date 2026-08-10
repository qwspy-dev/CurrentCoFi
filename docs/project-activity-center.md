# Project Activity & Audit Center

Current CoFi now turns its existing project-scoped audit events into an authenticated operational ledger at `/#/activity` and `/api/v1/activity`.

## What it proves

- Every workspace role may review the active project's history, while non-members receive no ledger access.
- Access changes, distributions, settlement, commerce, integrations, evidence, protocol controls, and operational events share one normalized timeline.
- Actor attribution resolves verified Current members and scoped project integrations without returning complete internal identifiers.
- Date, category, and text filters operate on the server. The same privacy boundary applies to the downloadable CSV.
- The dashboard distinguishes ordinary events, successful state changes, and actions that deserve attention without implying an operational failure.

## Privacy boundary

The API excludes raw recipient identities, complete user and API-key identifiers, IP hashes, request identifiers, email addresses, secrets, signatures, and arbitrary event metadata. Only an explicit metadata allowlist is returned. Invitation email values remain masked.

## Grant value

This closes the gap between having durable audit records and operating them as a real multi-project product. Reviewers can see that Current CoFi treats access, value movement, integrations, and evidence publication as accountable project activity rather than disconnected demonstrations.

External audit review and real pilot activity remain external gates; this feature does not claim either has occurred.
