import assert from "node:assert/strict";
import { formatAtomic, toAtomic } from "../server/campaigns/repository.js";

assert.equal(toAtomic("25.50", 6), "25500000");
assert.equal(formatAtomic("25500000", 6), "25.5");
assert.equal(toAtomic("1.250000000000000001", 18), "1250000000000000001");
assert.equal(formatAtomic("1250000000000000001", 18), "1.250000000000000001");
assert.equal(toAtomic("0.000000000000000001", 18), "1");
assert.throws(() => toAtomic("1.0000001", 6), /at most 6 decimal places/i);
assert.throws(() => toAtomic("0", 18), /greater than zero/i);

console.log("Universal asset-link precision and amount boundaries passed.");
