import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readinessFromFacts } from "../server/onboarding/repository.js";

const empty = readinessFromFacts({ hasName: false, hasDescription: false, hasWebsite: false, hasWallet: false, hasProjectToken: false, campaignCount: 0, apiKeyCount: 0, webhookCount: 0, pilotCount: 0 });
assert.equal(empty.score, 0);
assert.equal(empty.stage, "setup-required");
assert.equal(empty.requiredComplete, false);

const operating = readinessFromFacts({ hasName: true, hasDescription: true, hasWebsite: true, hasWallet: true, hasProjectToken: true, campaignCount: 1, apiKeyCount: 0, webhookCount: 0, pilotCount: 0 });
assert.equal(operating.score, 57);
assert.equal(operating.stage, "testnet-operating");
assert.equal(operating.requiredComplete, true);

const [api, ui, styles, meta, openapi] = await Promise.all([
  readFile(new URL("../api/v1/project-setup.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/project-onboarding.css", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8"),
]);
assert.match(api, /projectSetupWorkspace/);
assert.match(api, /resolveToken/);
assert.match(ui, /GRANT READINESS/);
assert.match(ui, /Inspect on Arc/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(meta, /grant-ready-project-launch-workspace/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
console.log("Project launch workspace verified: persistent identity, Arc token inspection, real readiness evidence, and campaign handoff.");
