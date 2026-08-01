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
      "CurrentMilestoneEscrow.sol": { content: readSource("contracts/CurrentMilestoneEscrow.sol") },
      "CurrentToken.sol": { content: readSource("contracts/CurrentToken.sol") },
      "CurrentLockVault.sol": { content: readSource("contracts/CurrentLockVault.sol") },
      "CurrentFeeRouter.sol": { content: readSource("contracts/CurrentFeeRouter.sol") },
      "CurrentAccessManager.sol": { content: readSource("contracts/CurrentAccessManager.sol") },
      "CurrentBuybackGovernor.sol": { content: readSource("contracts/CurrentBuybackGovernor.sol") },
      "CurrentLiquidityVault.sol": { content: readSource("contracts/CurrentLiquidityVault.sol") },
      "CurrentLiquidityGovernor.sol": { content: readSource("contracts/CurrentLiquidityGovernor.sol") },
      "CurrentPartnerVault.sol": { content: readSource("contracts/CurrentPartnerVault.sol") },
      "CurrentPartnerGovernor.sol": { content: readSource("contracts/CurrentPartnerGovernor.sol") },
      "CurrentLiquidityVenueRegistry.sol": { content: readSource("contracts/CurrentLiquidityVenueRegistry.sol") },
      "CurrentVenueRegistryGovernor.sol": { content: readSource("contracts/CurrentVenueRegistryGovernor.sol") },
      "CurrentReleaseRegistry.sol": { content: readSource("contracts/CurrentReleaseRegistry.sol") },
      "CurrentReleaseGovernor.sol": { content: readSource("contracts/CurrentReleaseGovernor.sol") },
      "test/MockUSDC.sol": { content: readSource("contracts/test/MockUSDC.sol") },
      "test/MockExchangeAdapter.sol": { content: readSource("contracts/test/MockExchangeAdapter.sol") },
      "test/CurrentTestnetExchangeAdapter.sol": {
        content: readSource("contracts/test/CurrentTestnetExchangeAdapter.sol"),
      },
      "test/CurrentTestnetLiquidityAdapter.sol": {
        content: readSource("contracts/test/CurrentTestnetLiquidityAdapter.sol"),
      },
      "test/CurrentTestnetPartnerToken.sol": {
        content: readSource("contracts/test/CurrentTestnetPartnerToken.sol"),
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
  const milestoneEscrow = output.contracts?.["CurrentMilestoneEscrow.sol"]?.CurrentMilestoneEscrow;
  const currentToken = output.contracts?.["CurrentToken.sol"]?.CurrentToken;
  const currentLockVault = output.contracts?.["CurrentLockVault.sol"]?.CurrentLockVault;
  const currentFeeRouter = output.contracts?.["CurrentFeeRouter.sol"]?.CurrentFeeRouter;
  const currentAccessManager = output.contracts?.["CurrentAccessManager.sol"]?.CurrentAccessManager;
  const currentBuybackGovernor = output.contracts?.["CurrentBuybackGovernor.sol"]?.CurrentBuybackGovernor;
  const currentLiquidityVault = output.contracts?.["CurrentLiquidityVault.sol"]?.CurrentLiquidityVault;
  const currentLiquidityGovernor = output.contracts?.["CurrentLiquidityGovernor.sol"]?.CurrentLiquidityGovernor;
  const currentPartnerVault = output.contracts?.["CurrentPartnerVault.sol"]?.CurrentPartnerVault;
  const currentPartnerGovernor = output.contracts?.["CurrentPartnerGovernor.sol"]?.CurrentPartnerGovernor;
  const currentLiquidityVenueRegistry = output.contracts?.["CurrentLiquidityVenueRegistry.sol"]?.CurrentLiquidityVenueRegistry;
  const currentVenueRegistryGovernor = output.contracts?.["CurrentVenueRegistryGovernor.sol"]?.CurrentVenueRegistryGovernor;
  const currentReleaseRegistry = output.contracts?.["CurrentReleaseRegistry.sol"]?.CurrentReleaseRegistry;
  const currentReleaseGovernor = output.contracts?.["CurrentReleaseGovernor.sol"]?.CurrentReleaseGovernor;
  const mockUsdc = output.contracts?.["test/MockUSDC.sol"]?.MockUSDC;
  const mockExchangeAdapter = output.contracts?.["test/MockExchangeAdapter.sol"]?.MockExchangeAdapter;
  const currentTestnetExchangeAdapter =
    output.contracts?.["test/CurrentTestnetExchangeAdapter.sol"]?.CurrentTestnetExchangeAdapter;
  const currentTestnetLiquidityAdapter =
    output.contracts?.["test/CurrentTestnetLiquidityAdapter.sol"]?.CurrentTestnetLiquidityAdapter;
  const currentTestnetPartnerToken =
    output.contracts?.["test/CurrentTestnetPartnerToken.sol"]?.CurrentTestnetPartnerToken;
  if (
    !vault?.evm.bytecode.object ||
    !campaignVault?.evm.bytecode.object ||
    !milestoneEscrow?.evm.bytecode.object ||
    !currentToken?.evm.bytecode.object ||
    !currentLockVault?.evm.bytecode.object ||
    !currentFeeRouter?.evm.bytecode.object ||
    !currentAccessManager?.evm.bytecode.object ||
    !currentBuybackGovernor?.evm.bytecode.object ||
    !currentLiquidityVault?.evm.bytecode.object ||
    !currentLiquidityGovernor?.evm.bytecode.object ||
    !currentPartnerVault?.evm.bytecode.object ||
    !currentPartnerGovernor?.evm.bytecode.object ||
    !currentLiquidityVenueRegistry?.evm.bytecode.object ||
    !currentVenueRegistryGovernor?.evm.bytecode.object ||
    !currentReleaseRegistry?.evm.bytecode.object ||
    !currentReleaseGovernor?.evm.bytecode.object ||
    !mockUsdc?.evm.bytecode.object ||
    !mockExchangeAdapter?.evm.bytecode.object ||
    !currentTestnetExchangeAdapter?.evm.bytecode.object ||
    !currentTestnetLiquidityAdapter?.evm.bytecode.object ||
    !currentTestnetPartnerToken?.evm.bytecode.object
  ) {
    throw new Error("Solidity compilation produced no bytecode.");
  }
  return {
    vault: { abi: vault.abi, bytecode: `0x${vault.evm.bytecode.object}` as `0x${string}` },
    campaignVault: {
      abi: campaignVault.abi,
      bytecode: `0x${campaignVault.evm.bytecode.object}` as `0x${string}`,
    },
    milestoneEscrow: {
      abi: milestoneEscrow.abi,
      bytecode: `0x${milestoneEscrow.evm.bytecode.object}` as `0x${string}`,
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
    currentLiquidityVault: {
      abi: currentLiquidityVault.abi,
      bytecode: `0x${currentLiquidityVault.evm.bytecode.object}` as `0x${string}`,
    },
    currentLiquidityGovernor: {
      abi: currentLiquidityGovernor.abi,
      bytecode: `0x${currentLiquidityGovernor.evm.bytecode.object}` as `0x${string}`,
    },
    currentPartnerVault: {
      abi: currentPartnerVault.abi,
      bytecode: `0x${currentPartnerVault.evm.bytecode.object}` as `0x${string}`,
    },
    currentPartnerGovernor: {
      abi: currentPartnerGovernor.abi,
      bytecode: `0x${currentPartnerGovernor.evm.bytecode.object}` as `0x${string}`,
    },
    currentLiquidityVenueRegistry: {
      abi: currentLiquidityVenueRegistry.abi,
      bytecode: `0x${currentLiquidityVenueRegistry.evm.bytecode.object}` as `0x${string}`,
    },
    currentVenueRegistryGovernor: {
      abi: currentVenueRegistryGovernor.abi,
      bytecode: `0x${currentVenueRegistryGovernor.evm.bytecode.object}` as `0x${string}`,
    },
    currentReleaseRegistry: {
      abi: currentReleaseRegistry.abi,
      bytecode: `0x${currentReleaseRegistry.evm.bytecode.object}` as `0x${string}`,
    },
    currentReleaseGovernor: {
      abi: currentReleaseGovernor.abi,
      bytecode: `0x${currentReleaseGovernor.evm.bytecode.object}` as `0x${string}`,
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
    currentTestnetLiquidityAdapter: {
      abi: currentTestnetLiquidityAdapter.abi,
      bytecode: `0x${currentTestnetLiquidityAdapter.evm.bytecode.object}` as `0x${string}`,
    },
    currentTestnetPartnerToken: {
      abi: currentTestnetPartnerToken.abi,
      bytecode: `0x${currentTestnetPartnerToken.evm.bytecode.object}` as `0x${string}`,
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
    path.join(outputDirectory, "CurrentMilestoneEscrow.json"),
    JSON.stringify(compiled.milestoneEscrow, null, 2),
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
  fs.writeFileSync(path.join(outputDirectory, "CurrentLiquidityVault.json"), JSON.stringify(compiled.currentLiquidityVault, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentLiquidityGovernor.json"), JSON.stringify(compiled.currentLiquidityGovernor, null, 2));
  fs.writeFileSync(
    path.join(outputDirectory, "CurrentTestnetExchangeAdapter.json"),
    JSON.stringify(compiled.currentTestnetExchangeAdapter, null, 2),
  );
  fs.writeFileSync(path.join(outputDirectory, "CurrentTestnetLiquidityAdapter.json"), JSON.stringify(compiled.currentTestnetLiquidityAdapter, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentPartnerVault.json"), JSON.stringify(compiled.currentPartnerVault, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentPartnerGovernor.json"), JSON.stringify(compiled.currentPartnerGovernor, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentLiquidityVenueRegistry.json"), JSON.stringify(compiled.currentLiquidityVenueRegistry, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentVenueRegistryGovernor.json"), JSON.stringify(compiled.currentVenueRegistryGovernor, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentReleaseRegistry.json"), JSON.stringify(compiled.currentReleaseRegistry, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentReleaseGovernor.json"), JSON.stringify(compiled.currentReleaseGovernor, null, 2));
  fs.writeFileSync(path.join(outputDirectory, "CurrentTestnetPartnerToken.json"), JSON.stringify(compiled.currentTestnetPartnerToken, null, 2));
  console.log("Current protocol contracts compiled successfully.");
}
