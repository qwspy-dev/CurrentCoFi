import fs from "node:fs";
import path from "node:path";
import solc from "solc";

type SolcOutput = {
  errors?: Array<{ severity: string; formattedMessage: string }>;
  contracts?: Record<string, Record<string, {
    abi: unknown[];
    evm: { bytecode: { object: string }; deployedBytecode: { object: string } };
  }>>;
};

const root = process.cwd();

function readSource(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function resolveImport(importPath: string) {
  const candidates = [
    path.join(root, importPath),
    path.join(root, "node_modules", importPath),
    path.join(root, "contracts", importPath),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match ? { contents: fs.readFileSync(match, "utf8") } : { error: `Import not found: ${importPath}` };
}

export function compileContracts() {
  const input = {
    language: "Solidity",
    sources: {
      "CurrentClaimVault.sol": { content: readSource("contracts/CurrentClaimVault.sol") },
      "test/MockUSDC.sol": { content: readSource("contracts/test/MockUSDC.sol") },
    },
    settings: {
      optimizer: { enabled: true, runs: 10_000 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport })) as SolcOutput;
  const fatal = output.errors?.filter((entry) => entry.severity === "error") ?? [];
  if (fatal.length) throw new Error(fatal.map((entry) => entry.formattedMessage).join("\n"));
  const vault = output.contracts?.["CurrentClaimVault.sol"]?.CurrentClaimVault;
  const mockUsdc = output.contracts?.["test/MockUSDC.sol"]?.MockUSDC;
  if (!vault?.evm.bytecode.object || !mockUsdc?.evm.bytecode.object) throw new Error("Solidity compilation produced no bytecode.");
  return {
    vault: { abi: vault.abi, bytecode: `0x${vault.evm.bytecode.object}` as `0x${string}` },
    mockUsdc: { abi: mockUsdc.abi, bytecode: `0x${mockUsdc.evm.bytecode.object}` as `0x${string}` },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"))) {
  const compiled = compileContracts();
  const outputDirectory = path.join(root, "contracts", "artifacts");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "CurrentClaimVault.json"), JSON.stringify(compiled.vault, null, 2));
  console.log("CurrentClaimVault compiled successfully.");
}
