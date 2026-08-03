import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyAssetPosture } from "../server/tokens/trust.js";

assert.equal(classifyAssetPosture({ verified: true, owner: null, proxyImplementation: null, observedCapabilities: [] }), "circle-verified");
assert.equal(classifyAssetPosture({ verified: false, owner: "0x1", proxyImplementation: null, observedCapabilities: [] }), "review-required");
assert.equal(classifyAssetPosture({ verified: false, owner: null, proxyImplementation: "0x2", observedCapabilities: [] }), "review-required");
assert.equal(classifyAssetPosture({ verified: false, owner: null, proxyImplementation: null, observedCapabilities: ["mint"] }), "review-required");
assert.equal(classifyAssetPosture({ verified: false, owner: null, proxyImplementation: null, observedCapabilities: [] }), "standard-observations");

const source = await readFile(new URL("../server/tokens/trust.ts", import.meta.url), "utf8");
assert.match(source, /getBytecode/);
assert.match(source, /implementationSlot/);
assert.match(source, /totalSupply/);
assert.match(source, /reviewDigest/);
assert.match(source, /not an audit, endorsement, fraud determination/);
assert.doesNotMatch(source, /safeToken|guaranteedSafe|rugScore/);
console.log("Asset trust milestone verified: reproducible bytecode, supply, ownership, proxy, selector, digest, and claims-boundary checks.");
