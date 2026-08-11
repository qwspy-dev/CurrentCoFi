import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const pnpmScript = process.env.npm_execpath;
const pnpmCommand = pnpmScript ? process.execPath : "pnpm";
const pnpmArgs = (args) => pnpmScript ? [pnpmScript, ...args] : args;
const startedAt = new Date();
const results = [];

function run(name, command, args) {
  const started = Date.now();
  process.stdout.write(`\n\u001b[36m[release gate]\u001b[0m ${name}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${result.error.stack || result.error.message}\n`);
  const record = {
    name,
    status: result.status === 0 ? "passed" : "failed",
    durationMs: Date.now() - started,
  };
  results.push(record);
  if (result.status !== 0) {
    finish("failed", `${name} exited with code ${result.status ?? "unknown"}.`);
  }
}

function finish(status, failure = null) {
  const finishedAt = new Date();
  const report = {
    schemaVersion: 1,
    verificationMode: "deterministic-offline",
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    checks: results,
    failure,
  };
  mkdirSync(resolve(root, "artifacts"), { recursive: true });
  writeFileSync(resolve(root, "artifacts", "release-gate.json"), `${JSON.stringify(report, null, 2)}\n`);
  const passed = results.filter((item) => item.status === "passed").length;
  process.stdout.write(`\n${status === "passed" ? "\u001b[32m" : "\u001b[31m"}[release gate] ${status.toUpperCase()}\u001b[0m · ${passed}/${results.length} checks · ${(report.durationMs / 1000).toFixed(1)}s\n`);
  process.stdout.write(`[release gate] Evidence: artifacts/release-gate.json\n`);
  process.exit(status === "passed" ? 0 : 1);
}

run("Application build", pnpmCommand, pnpmArgs(["run", "build"]));
run("Client delivery budgets", process.execPath, ["scripts/check-client-budgets.mjs"]);
run("Rendered application shell", process.execPath, ["--test", "tests/rendered-html.test.mjs"]);
run("Type safety", pnpmCommand, pnpmArgs(["run", "typecheck"]));
run("Static analysis", pnpmCommand, pnpmArgs(["run", "lint"]));
run("SDK, React embed, and MCP packages", pnpmCommand, pnpmArgs(["run", "packages:build"]));
const suites = [
  ["Social and community payments", "social:test"],
  ["Verified account portfolio", "portfolio:test"],
  ["Authenticated wallet transfers", "wallet-transfer:test"],
  ["Exact-output consumer swaps", "consumer-swap:test"],
  ["Arc asset trust", "token-trust:test"],
  ["Project-token control monitoring", "token-monitor:test"],
  ["Conditional campaigns", "conditions:test"],
  ["Community payroll", "payroll:test"],
  ["Community bounties", "bounty:test"],
  ["Community treasury", "treasury:test"],
  ["Verifiable giveaways", "giveaway:test"],
  ["Walletless launch vesting", "vesting:test"],
  ["Public walletless drops", "drops:test"],
  ["Proof-gated public drops", "activation-drops:test"],
  ["Encrypted campaign delivery", "delivery-center:test"],
  ["Automated campaign email delivery", "email-delivery:test"],
  ["Post-claim activation destinations", "activation-destinations:test"],
  ["Opportunity discovery", "discovery:test"],
  ["Acquisition intelligence", "acquisition:test"],
  ["Project brand studio", "brand:test"],
  ["Project launch workspace", "onboarding:test"],
  ["Project collaboration", "workspace:test"],
  ["Project activity center", "activity:test"],
  ["Programmable merchant settlement", "programmable-commerce:test"],
  ["Policy-bound agent commerce", "agent-commerce:test"],
  ["Cryptographic Circle reviewer bundle", "grant-bundle:test"],
  ["Smart-contract behavior", "contracts:test"],
  ["Adversarial security and audit scope", "security:test"],
  ["Developer, grant, agent, and evidence platform", "developer:test"],
  ["Public SDK", "sdk:test"],
  ["MCP server", "mcp:test"],
];

for (const [name, script] of suites) {
  run(name, pnpmCommand, pnpmArgs(["run", script]));
}
finish("passed");
