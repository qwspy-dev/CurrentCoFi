import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["api", "server", "contracts", "lib", "packages"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".sol"]);
const findings = [];

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = join(path, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }))).flat();
}

for (const directory of scanRoots) {
  for (const file of await walk(join(root, directory))) {
    if (![...extensions].some((extension) => file.endsWith(extension))) continue;
    const source = await readFile(file, "utf8");
    const checks = [
      [/tx\.origin\b/g, "tx.origin authorization"],
      [/delegatecall\s*\(/g, "delegatecall"],
      [/selfdestruct\s*\(/g, "selfdestruct"],
      [/Math\.random\s*\(/g, "non-cryptographic randomness"],
      [/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/g, "embedded private key"],
      [/(?:sk_live|sk_test|whsec)_[A-Za-z0-9]{16,}/g, "embedded provider secret"],
    ];
    for (const [pattern, label] of checks) {
      if (pattern.test(source)) findings.push(`${relative(root, file)}: ${label}`);
    }
  }
}

const required = [
  "SECURITY.md", "security/audit-scope.json", "docs/security-threat-model.md",
  "docs/security-invariants.md", "docs/external-audit-package.md",
];
for (const file of required) await readFile(join(root, file), "utf8");
const vercel = await readFile(join(root, "vercel.json"), "utf8");
for (const header of ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "Permissions-Policy"]) {
  if (!vercel.includes(header)) findings.push(`vercel.json: missing ${header}`);
}
if (findings.length) {
  console.error(`Security baseline failed with ${findings.length} finding(s):\n${findings.join("\n")}`);
  process.exit(1);
}
console.log("Security baseline passed: dangerous primitives, embedded-secret patterns, review documents, and browser headers verified.");
