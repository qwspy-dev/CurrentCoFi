import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "security", "audit-manifest.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(join(root, path));

async function buildManifest() {
  const scopeBytes = await read("security/audit-scope.json");
  const scope = JSON.parse(scopeBytes.toString("utf8"));
  const packageJson = JSON.parse((await read("package.json")).toString("utf8"));
  const sources = [];
  for (const path of scope.contracts) {
    const bytes = await read(path);
    const artifactPath = `contracts/artifacts/${basename(path, ".sol")}.json`;
    const artifactBytes = await read(artifactPath);
    const artifact = JSON.parse(artifactBytes.toString("utf8"));
    sources.push({
      path,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      artifact: {
        path: artifactPath,
        sha256: sha256(artifactBytes),
        creationBytecodeSha256: sha256(String(artifact.bytecode ?? "")),
        abiEntries: Array.isArray(artifact.abi) ? artifact.abi.length : 0,
      },
    });
  }
  return {
    schemaVersion: "current-audit-manifest-v1",
    product: "Current CoFi",
    network: "Arc testnet",
    assurance: "internal-review-only",
    mainnetApproved: false,
    compiler: { package: "solc", versionRange: packageJson.devDependencies.solc, optimizer: { enabled: true, runs: 10_000 } },
    scope: { path: "security/audit-scope.json", sha256: sha256(scopeBytes), contracts: sources.length, serverBoundaries: scope.serverBoundaries.length, priorityProperties: scope.priorityProperties.length },
    sources,
    reproducibility: {
      lockfile: { path: "pnpm-lock.yaml", sha256: sha256(await read("pnpm-lock.yaml")) },
      deployment: { path: "deployments/arc-testnet.json", sha256: sha256(await read("deployments/arc-testnet.json")) },
      commands: ["pnpm contracts:compile", "pnpm contracts:test", "pnpm developer:test", "pnpm security:test", "pnpm typecheck", "pnpm lint", "pnpm vercel:build"],
    },
    boundaries: ["No independent audit report is claimed.", "No mainnet approval is claimed.", "Third-party Circle, Arc, OAuth, CCTP, Gateway, and venue implementations remain outside this source manifest."],
  };
}

const manifest = await buildManifest();
const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes("--write")) {
  await writeFile(manifestPath, output);
  console.log(`Wrote ${manifest.sources.length} scoped contract records to security/audit-manifest.json.`);
} else {
  const committed = await readFile(manifestPath, "utf8").catch(() => "");
  if (committed !== output) {
    console.error("Audit manifest drift detected. Run pnpm audit:manifest and review the scope changes.");
    process.exit(1);
  }
  console.log(`Audit manifest verified: ${manifest.sources.length} sources, artifacts, lockfile, and deployment snapshot match.`);
}
