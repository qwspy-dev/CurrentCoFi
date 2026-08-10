import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTreasuryProofUrl } from "../server/treasury/repository.js";

const repository = readFileSync(new URL("../server/treasury/repository.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8");
const sdk = readFileSync(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8");
const mcp = readFileSync(new URL("../packages/mcp/src/server.ts", import.meta.url), "utf8");
const meta = readFileSync(new URL("../api/v1/meta.ts", import.meta.url), "utf8");
const openapi = readFileSync(new URL("../api/v1/openapi.ts", import.meta.url), "utf8");
const evidence = readFileSync(new URL("../server/evidence/reports.ts", import.meta.url), "utf8");

assert.equal(validateTreasuryProofUrl("https://example.org/proof/42"), "https://example.org/proof/42");
assert.equal(validateTreasuryProofUrl(""), null);
assert.throws(() => validateTreasuryProofUrl("http://example.org/proof"), /HTTPS/);
assert.throws(() => validateTreasuryProofUrl("https://user:pass@example.org/proof"), /HTTPS/);

assert.match(repository, /BUDGET_EXCEEDED/);
assert.match(repository, /TREASURY_GOVERNANCE_REQUIRED/);
assert.match(repository, /TREASURY_WALLET_REQUIRED/);
assert.match(repository, /createWalletTransferChallenge/);
assert.match(repository, /confirmWalletTransferChallenge/);
assert.match(repository, /publicView \? `\$\{row\.proposal\.recipientAddress\.slice/);
assert.match(ui, /Community treasury/);
assert.match(ui, /Current never takes custody/);
assert.match(sdk, /createProposal/);
assert.match(mcp, /I_APPROVE_CURRENT_TREASURY_PROPOSAL/);
assert.match(meta, /transparent-community-treasury/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
assert.match(openapi, /\/developer\/treasury/);
assert.match(evidence, /EVIDENCE_SCHEMA_VERSION = "current-evidence-v\d+"/);
assert.match(evidence, /Recipient addresses are excluded/);

console.log("Community treasury verified: governed budgets, non-custodial proposals, Circle wallet authorization, public receipts, SDK/MCP access, and privacy-safe grant evidence.");
