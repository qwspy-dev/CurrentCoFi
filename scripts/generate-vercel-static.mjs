import { writeFile } from "node:fs/promises";
import worker from "../dist/server/index.js";

const hostname =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  "currentco.finance";

const response = await worker.fetch(
  new Request(`https://${hostname}/`),
  {},
  undefined,
);

if (!response.ok) {
  throw new Error(`Static page render failed with status ${response.status}`);
}

const html = await response.text();
await writeFile(new URL("../dist/client/index.html", import.meta.url), html);

console.log("Generated dist/client/index.html for Vercel.");
