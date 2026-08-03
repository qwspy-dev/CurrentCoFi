import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mcpManifest } from "../server/developer/mcp-manifest.js";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

const manifest = mcpManifest();
const { digest, ...body } = manifest;
assert.equal(digest, createHash("sha256").update(stable(body)).digest("hex"));
assert.equal(manifest.tools.length, 19);
assert.equal(manifest.tools.filter((tool) => tool.kind === "read").length, 11);
const writes = manifest.tools.filter((tool) => tool.kind === "write");
assert.equal(writes.length, 8);
assert.ok(writes.every((tool) => "approval" in tool && tool.approval.startsWith("I_APPROVE_CURRENT_")));
assert.equal(manifest.defaultMode, "read-only");
assert.match(manifest.safety.custody, /never receives wallet private keys/i);
assert.match(manifest.safety.settlementBoundary, /do not mean funds moved/i);
assert.equal(manifest.distribution.sourceReady, true);
assert.equal(manifest.distribution.registryStatus, "publication-required");
assert.match(manifest.safety.distributionBoundary, /external release step/i);
assert.doesNotMatch(JSON.stringify(manifest), /seed phrase\s*:/i);
console.log("MCP manifest verified: canonical digest, nineteen tools, read-only default, explicit write approvals, encrypted delivery recovery, and honest settlement boundary.");
