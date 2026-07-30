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
      "CurrentCampaignVault.sol": { content: readSource("contracts/CurrentCampaignVault.sol") },
      "CurrentToken.sol": { content: readSource("contracts/CurrentToken.sol") },
      "CurrentLockVault.sol": { content: readSource("contracts/CurrentLockVault.sol") },
      "CurrentFeeRouter.sol": { content: readSource("contracts/CurrentFeeRouter.sol") },
      "CurrentAccessManager.sol": { content: readSource("contracts/CurrentAccessManager.sol") },
      "CurrentBuybackGovernor.sol": { content: readSource("contracts/CurrentBuybackGovernor.sol") },
      "test/MockUSDC.sol": { content: readSource("contracts/test/MockUSDC.sol") },
      "test/MockExchangeAdapter.sol": { content: readSource("contracts/test/MockExchangeAdapter.sol") },
      "test/CurrentTestnetExchangeAdapter.sol": {
        content: readSource("contracts/test/CurrentTestnetExchangeAdapter.sol"),
      },
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
  const campaignVault = output.contracts?.["CurrentCampaignVault.sol"]?.CurrentCampaignVault;
  const currentToken = output.contracts?.["CurrentToken.sol"]?.CurrentToken;
  const currentLockVault = output.contracts?.["CurrentLockVault.sol"]?.CurrentLockVault;
  const currentFeeRouter = output.contracts?.["CurrentFeeRouter.sol"]?.CurrentFeeRouter;
  const currentAccessManager = output.contracts?.["CurrentAccessManager.sol"]?.CurrentAccessManager;
  const currentBuybackGovernor = output.contracts?.["CurrentBuybackGovernor.sol"]?.CurrentBuybackGovernor;
  const mockUsdc = output.contracts?.["test/MockUSDC.sol"]?.MockUSDC;
  const mockExchangeAdapter = output.contracts?.["test/MockExchangeAdapter.sol"]?.MockExchangeAdapter;
  const currentTestnetExchangeAdapter =
    output.contracts?.["test/CurrentTestnetExchangeAdapter.sol"]?.CurrentTestnetExchangeAdapter;
  if (
    !vault?.evm.bytecode.object ||
    !campaignVault?.evm.bytecode.object ||
    !currentToken?.evm.bytecode.object ||
    !currentLockVault?.evm.bytecode.object ||
    !currentFeeRouter?.evm.bytecode.object ||
    !currentAccessManager?.evm.bytecode.object ||
    !currentBuybackGovernor?.evm.bytecode.object ||
    !mockUsdc?.evm.bytecode.object ||
    !mockExchangeAdapter?.evm.bytecode.object ||
    !currentTestnetExchangeAdapter?.evm.bytecode.object
  ) {
    throw new Error("Solidity compilation produced no bytecode.");
  }
  return {
    vault: { abi: vault.abi, bytecode: `0x${vault.evm.bytecode.object}` as `0x${string}` },
    campaignVault: {
      abi: campaignVault.abi,
      bytecode: `0x${campaignVault.evm.bytecode.object}` as `0x${string}`,
    },
    currentToken: {
      abi: currentToken.abi,
      bytecode: `0x${currentToken.evm.bytecode.object}` as `0x${string}`,
    },
    currentLockVault: {
      abi: currentLockVault.abi,
      bytecode: `0x${currentLockVault.evm.bytecode.object}` as `0x${string}`,
    },
    currentFeeRouter: {
      abi: currentFeeRouter.abi,
      bytecode: `0x${currentFeeRouter.evm.bytecode.object}` as `0x${string}`,
    },
    currentAccessManager: {
      abi: currentAccessManager.abi,
      bytecode: `0x${currentAccessManager.evm.bytecode.object}` as `0x${string}`,
    },
    currentBuybackGovernor: {
      abi: currentBuybackGovernor.abi,
      bytecode: `0x${currentBuybackGovernor.evm.bytecode.object}` as `0x${string}`,
    },
    mockUsdc: { abi: mockUsdc.abi, bytecode: `0x${mockUsdc.evm.bytecode.object}` as `0x${string}` },
    mockExchangeAdapter: {
      abi: mockExchangeAdapter.abi,
      bytecode: `0x${mockExchangeAdapter.evm.bytecode.object}` as `0x${string}`,
    },
    currentTestnetExchangeAdapter: {
      abi: currentTestnetExchangeAdapter.abi,
      bytecode: `0x${currentTestnetExchangeAdapter.evm.bytecode.object}` as `0x${string}`,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"))) {
  const compiled = compileContracts();
  const outputDirectory = path.join(root, "contracts", "artifacts");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "CurrentClaimVault.json"), JSON.stringify(compiled.vault, null, 2));
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentCampaignVault.json"),
    JSON.stringify(compiled.campaignVault, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentToken.json"),
    JSON.stringify(compiled.currentToken, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentLockVault.json"),
    JSON.stringify(compiled.currentLockVault, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentFeeRouter.json"),
    JSON.stringify(compiled.currentFeeRouter, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentAccessManager.json"),
    JSON.stringify(compiled.currentAccessManager, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentBuybackGovernor.json"),
    JSON.stringify(compiled.currentBuybackGovernor, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentTestnetExchangeAdapter.json"),
    JSON.stringify(compiled.currentTestnetExchangeAdapter, null, 2),
  );
  console.log("Current protocol contracts compiled successfully.");
}
