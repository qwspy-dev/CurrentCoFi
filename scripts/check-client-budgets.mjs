import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";

const assetDirectory = new URL("../dist/client/assets/", import.meta.url);
const budgets = {
  largestJavaScriptGzip: 130_000,
  // Includes every deferred route/runtime chunk, not only initial delivery.
  totalJavaScriptGzip: 340_000,
  largestCssGzip: 70_000,
  totalCssGzip: 80_000,
};

const names = await readdir(assetDirectory);
const assets = await Promise.all(
  names
    .filter((name) => [".js", ".css"].includes(extname(name)))
    .map(async (name) => {
      const body = await readFile(new URL(name, assetDirectory));
      return { name, type: extname(name), raw: body.byteLength, gzip: gzipSync(body).byteLength };
    }),
);

const javascript = assets.filter((asset) => asset.type === ".js");
const css = assets.filter((asset) => asset.type === ".css");
const largest = (items) => Math.max(0, ...items.map((item) => item.gzip));
const total = (items) => items.reduce((sum, item) => sum + item.gzip, 0);
const measurements = {
  largestJavaScriptGzip: largest(javascript),
  totalJavaScriptGzip: total(javascript),
  largestCssGzip: largest(css),
  totalCssGzip: total(css),
};

console.table(
  [...assets]
    .sort((left, right) => right.gzip - left.gzip)
    .map(({ name, raw, gzip }) => ({ name, rawBytes: raw, gzipBytes: gzip })),
);

let failed = false;
for (const [metric, budget] of Object.entries(budgets)) {
  const actual = measurements[metric];
  const status = actual <= budget ? "PASS" : "FAIL";
  console.log(`${status} ${metric}: ${actual.toLocaleString()} / ${budget.toLocaleString()} bytes`);
  failed ||= actual > budget;
}

if (failed) {
  console.error("Client delivery budgets exceeded. Split or optimize the affected surface before release.");
  process.exitCode = 1;
}
