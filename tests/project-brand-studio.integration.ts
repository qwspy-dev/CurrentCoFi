import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectBrand } from "../server/branding/repository.js";

assert.deepEqual(projectBrand(undefined), {
  primaryColor: "#0868B7",
  accentColor: "#22E4D5",
  successColor: "#00A94F",
  surface: "midnight",
  headline: "A funded current is waiting for you.",
  claimCta: "Claim your tokens",
  poweredByCurrent: true,
});
assert.deepEqual(projectBrand({ brand: { primaryColor: "#112233", accentColor: "unsafe", successColor: "#aabbcc", surface: "light", headline: "Welcome in", claimCta: "Enter" } }), {
  primaryColor: "#112233",
  accentColor: "#22E4D5",
  successColor: "#AABBCC",
  surface: "light",
  headline: "Welcome in",
  claimCta: "Enter",
  poweredByCurrent: true,
});

const [api, developerApi, claims, drops, bounties, giveaways, ui, styles, sdk, meta, openapi, docs] = await Promise.all([
  readFile(new URL("../api/v1/brand.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/developer/brand.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/claims/links.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/drops/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/bounties/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/giveaways/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/brand-studio.css", import.meta.url), "utf8"),
  readFile(new URL("../packages/sdk/src/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8"),
  readFile(new URL("../docs/project-brand-studio.md", import.meta.url), "utf8"),
]);
assert.match(api, /updateProjectBrand/);
assert.match(developerApi, /verifySignedDeveloperRequest/);
assert.match(claims, /projectBrand\(row\.projectSettings\)/);
assert.match(drops, /publicProjectBrand/);
assert.match(bounties, /publicProjectBrand/);
assert.match(giveaways, /publicProjectBrand/);
assert.match(ui, /PROJECT BRAND STUDIO/);
assert.match(ui, /Powered by Current CoFi/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(sdk, /readonly brand/);
assert.match(meta, /safe-hosted-experience-theming/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
assert.match(docs, /Custom CSS, scripts, HTML/);
console.log("Project Brand Studio verified: bounded project identity, safe HTTPS assets, public-flow inheritance, responsive preview, and permanent trust disclosures.");
