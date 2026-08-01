# Campaign quality and retention

Current CoFi measures whether walletless distributions create retained users while keeping token delivery separate from referral-reward enforcement.

## Explainable quality engine

Each referral assessment is built from explicit, reviewable signals:

- account age when the referral claim was created;
- referral volume from the same source inside a configurable burst window;
- time between claim and first verified activation;
- diversity of signed activation-event types;
- absence of a verified activation after seven days.

Signals have published weights. The final score is capped at 100 and maps to low, review, or high bands. Every assessment stores the policy snapshot and evidence used for the decision, so a project can explain and reproduce it.

The default policy never blocks a walletless token claim. Projects may monitor, route a participant to manual review, or hold only the referral reward. This avoids turning an imperfect fraud heuristic into an irreversible denial of user funds.

## Retention methodology

Retention begins with a confirmed Arc claim and uses only signed project activation events. A participant enters a retention denominator only after enough time has elapsed for that window. Day-7 retention therefore excludes claims less than seven days old instead of reporting them as failures.

Weekly cohorts include:

- confirmed claimants;
- claimants eligible for the day-7 window;
- claimants with a verified activation at or after day seven;
- the resulting eligible day-7 rate.

Returning users have at least two verified activation events separated by 24 hours.

## API lifecycle

1. Configure a policy for a campaign with `POST /api/v1/quality` or the HMAC-signed developer endpoint.
2. Run an evaluation after referral activity arrives.
3. Inspect retention, policy state, aggregate decisions, and the explainable review queue.
4. Consume the `quality.assessed` webhook to synchronize downstream review tools.

## Security and privacy

- All reads and mutations are project-scoped.
- Developer mutations require a signed request and `campaigns:write` permission.
- No recipient email, social handle, IP address, or device identifier is returned.
- Assessments use internal user IDs and aggregate evidence only.
- Policy changes and evaluations create audit records.
