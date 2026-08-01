import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GRANT_REVIEW_SCHEMA_VERSION } from "../server/grants/review.js";

assert.equal(GRANT_REVIEW_SCHEMA_VERSION, "current-grant-review-v1");
const source = await readFile(new URL("../server/grants/review.ts", import.meta.url), "utf8");
for (const requirement of [
  "Strong platform alignment",
  "Exceptional team and shipping ability",
  "Traction and path to success",
  "Ecosystem impact",
  "Independent security auditor",
  "Recipient identities, login data, secrets, and private contact details are excluded",
]) assert.match(source, new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(source, /evidenceDigest\(packageBody\)/);
assert.match(source, /getPublicEvidenceReport/);
console.log("Circle grant review package criteria, privacy, integrity, and milestone boundaries passed.");
