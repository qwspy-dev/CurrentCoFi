import assert from "node:assert/strict";
import { evaluateAgentActionPolicy } from "../server/agents/runtime.js";

const recipients = [{ identityType: "game", identity: "player-42", amount: "25" }];

const approved = evaluateAgentActionPolicy({
  dailyEventLimit: 100,
  maxRewardAtomic: "100000000",
  humanApprovalAtomic: "50000000",
  allowedIdentityTypes: ["game"],
}, recipients, 3);
assert.equal(approved.outcome, "auto_approved");
assert.equal(approved.amountAtomic, "25000000");

const review = evaluateAgentActionPolicy({
  dailyEventLimit: 100,
  maxRewardAtomic: "100000000",
  humanApprovalAtomic: "25000000",
  allowedIdentityTypes: ["game"],
}, recipients, 3);
assert.equal(review.outcome, "approval_required");
assert.equal(review.riskLevel, "medium");

const tooLarge = evaluateAgentActionPolicy({
  dailyEventLimit: 100,
  maxRewardAtomic: "10000000",
  allowedIdentityTypes: ["game"],
}, recipients, 3);
assert.equal(tooLarge.outcome, "blocked");

const wrongIdentity = evaluateAgentActionPolicy({
  dailyEventLimit: 100,
  maxRewardAtomic: "100000000",
  allowedIdentityTypes: ["email"],
}, recipients, 3);
assert.equal(wrongIdentity.outcome, "blocked");

const dailyLimit = evaluateAgentActionPolicy({
  dailyEventLimit: 3,
  maxRewardAtomic: "100000000",
  allowedIdentityTypes: ["game"],
}, recipients, 3);
assert.equal(dailyLimit.outcome, "blocked");

console.log("Agent action policy boundaries passed.");
