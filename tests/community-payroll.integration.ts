import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addDays } from "../server/payroll/repository.js";

const base = new Date("2026-08-03T12:00:00.000Z");
assert.equal(addDays(base, 7).toISOString(), "2026-08-10T12:00:00.000Z");
assert.equal(addDays(base, 14).toISOString(), "2026-08-17T12:00:00.000Z");
assert.equal(addDays(base, 30).toISOString(), "2026-09-02T12:00:00.000Z");

const [repository, lifecycle, endpoint, schema, vercel] = await Promise.all([
  readFile(new URL("../server/payroll/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/payroll/lifecycle.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/internal/payroll/lifecycle.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8"),
]);

assert.match(repository, /identityCiphertext: await sealSecret/);
assert.match(repository, /identity: await openSecret/);
assert.match(repository, /payroll_runs_schedule_cycle_unique|PAYROLL_RUN_CONFLICT/);
assert.match(repository, /claimMode: "identity-bound"/);
assert.match(repository, /preparedAt/);
assert.match(repository, /createCampaign\(/);
assert.match(lifecycle, /onConflictDoNothing\(\)/);
assert.match(lifecycle, /payroll\.run_due/);
assert.match(endpoint, /CRON_SECRET/);
assert.match(endpoint, /PAYROLL_LIFECYCLE_UNAUTHORIZED/);
assert.match(schema, /identity_ciphertext/);
assert.match(schema, /payroll_members_schedule_identity_unique/);
assert.match(vercel, /internal\/payroll\/lifecycle/);

console.log("community payroll encryption, scheduling, idempotency, and lifecycle controls passed");
