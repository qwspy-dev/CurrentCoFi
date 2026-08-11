import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateAgentCheckoutPolicy } from "../server/agents/runtime.js";

const input = { kind: "programmable_checkout", title: "Community pass", amount: "125", splits: [{ kind: "affiliate", label: "Partner", recipientAddress: "0x1111111111111111111111111111111111111111", basisPoints: 500 }, { kind: "customer-reward", label: "Cashback", basisPoints: 200 }] };
const policy = { dailyEventLimit: 25, maxCheckoutAtomic: "500000000", humanApprovalCheckoutAtomic: "250000000", allowProgrammableCheckout: true, maxAffiliateBasisPoints: 1_000, maxCustomerRewardBasisPoints: 500 };

const approved = evaluateAgentCheckoutPolicy(policy, input, 2);
assert.equal(approved.outcome, "auto_approved");
assert.equal(approved.amountAtomic, "125000000");
assert.equal(approved.recipientCount, 3);

const review = evaluateAgentCheckoutPolicy({ ...policy, humanApprovalCheckoutAtomic: "100000000" }, input, 2);
assert.equal(review.outcome, "approval_required");
assert.match(review.reasons[0], /human approval/i);

assert.equal(evaluateAgentCheckoutPolicy({ ...policy, allowProgrammableCheckout: false }, input, 2).outcome, "blocked");
assert.equal(evaluateAgentCheckoutPolicy({ ...policy, maxAffiliateBasisPoints: 400 }, input, 2).outcome, "blocked");
assert.equal(evaluateAgentCheckoutPolicy({ ...policy, maxCustomerRewardBasisPoints: 100 }, input, 2).outcome, "blocked");
assert.equal(evaluateAgentCheckoutPolicy({ ...policy, maxCheckoutAtomic: "100000000" }, input, 2).outcome, "blocked");
assert.equal(evaluateAgentCheckoutPolicy(policy, input, 25).outcome, "blocked");

const [runtime, endpoint, sdk, mcp, manifest, ui, meta, evidence, docs] = await Promise.all([
  readFile(new URL("../server/agents/runtime.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/developer/agent-actions.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../packages/mcp/src/server.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/developer/mcp-manifest.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/evidence/reports.ts", import.meta.url), "utf8"),
  readFile(new URL("../docs/agent-commerce.md", import.meta.url), "utf8"),
]);
assert.match(runtime, /agent\.checkout-created/);
assert.match(runtime, /link_created_no_funds_moved/);
assert.doesNotMatch(runtime.match(/if \(action\.kind === "programmable_checkout"\)[\s\S]*?return publicAction\(completed\);/)?.[0] ?? "", /settlementAddress:/);
assert.match(endpoint, /proposeAgentCheckout/);
assert.match(sdk, /proposeCheckout/);
assert.match(mcp, /current_propose_programmable_checkout/);
assert.match(manifest, /I_APPROVE_CURRENT_CHECKOUT/);
assert.match(ui, /Checkout approval at/);
assert.match(meta, /policy-bound-agent-commerce/);
assert.match(evidence, /completedAgentCheckouts/);
assert.match(docs, /No-custody boundary/);

console.log("Policy-bound agent commerce verified: limits, human review, SDK, MCP, UI, webhooks, and no-custody result semantics passed.");
