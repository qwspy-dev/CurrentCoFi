import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  toFunctionSelector,
  type Address,
  type Hex,
} from "viem";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { ApiError } from "../http.js";
import { sha256 } from "../security/crypto.js";

const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
]);
const ownerAbi = parseAbi(["function owner() view returns (address)"]);
const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;
const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;
const zeroStorage = `0x${"0".repeat(64)}`;
const observedSelectors = [
  { id: "mint", label: "Mint-like selector", selector: toFunctionSelector("mint(address,uint256)") },
  { id: "pause", label: "Pause-like selector", selector: toFunctionSelector("pause()") },
  { id: "blacklist", label: "Blacklist-like selector", selector: toFunctionSelector("blacklist(address)") },
  { id: "upgrade", label: "Upgrade-like selector", selector: toFunctionSelector("upgradeToAndCall(address,bytes)") },
] as const;

export type AssetTrustSignal = {
  id: string;
  label: string;
  status: "verified" | "observed" | "caution" | "unavailable";
  detail: string;
};

export type ArcTokenTrust = {
  schemaVersion: "1.1";
  network: typeof ARC_TESTNET.network;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  totalSupplyAtomic: string;
  codeHash: string;
  codeSizeBytes: number;
  owner: string | null;
  proxyImplementation: string | null;
  observedCapabilities: string[];
  verified: boolean;
  posture: "circle-verified" | "review-required" | "standard-observations";
  distributionPolicy: "allowed" | "allowed-with-disclosure";
  signals: AssetTrustSignal[];
  controlDigest: string;
  reviewDigest: string;
  inspectedAt: string;
  explorerUrl: string;
  boundary: string;
};

function implementationFromStorage(value: Hex | undefined) {
  if (!value || value.toLowerCase() === zeroStorage) return null;
  const address = `0x${value.slice(-40)}`;
  return isAddress(address) && address !== "0x0000000000000000000000000000000000000000" ? getAddress(address).toLowerCase() : null;
}

export function classifyAssetPosture(input: { verified: boolean; owner: string | null; proxyImplementation: string | null; observedCapabilities: string[] }) {
  if (input.verified) return "circle-verified" as const;
  if (input.owner || input.proxyImplementation || input.observedCapabilities.length) return "review-required" as const;
  return "standard-observations" as const;
}

export async function inspectArcTokenTrust(value: string): Promise<ArcTokenTrust> {
  if (!isAddress(value)) throw new ApiError(400, "INVALID_TOKEN", "Enter a valid Arc token contract address.");
  const address = getAddress(value) as Address;
  const client = createPublicClient({ transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 4, retryDelay: 500 }) });
  // Arc's public RPC applies burst limits. Batch interface reads through Multicall3,
  // then pace the remaining bytecode and storage requests.
  const pause = () => new Promise((resolve) => setTimeout(resolve, 350));
  const bytecode = await client.getBytecode({ address });
  await pause();
  const reads = await client.multicall({
    multicallAddress,
    allowFailure: true,
    contracts: [
      { address, abi: tokenAbi, functionName: "symbol" },
      { address, abi: tokenAbi, functionName: "name" },
      { address, abi: tokenAbi, functionName: "decimals" },
      { address, abi: tokenAbi, functionName: "totalSupply" },
      { address, abi: ownerAbi, functionName: "owner" },
    ],
  });
  const symbol = reads[0]?.status === "success" ? String(reads[0].result) : null;
  const name = reads[1]?.status === "success" ? String(reads[1].result) : null;
  const decimalsValue = reads[2]?.status === "success" ? Number(reads[2].result) : null;
  const supply = reads[3]?.status === "success" ? BigInt(reads[3].result as bigint) : null;
  const ownerResult = reads[4]?.status === "success" ? String(reads[4].result) : null;
  await pause();
  const storageResult = await client.getStorageAt({ address, slot: implementationSlot }).catch(() => undefined);
  if (!bytecode || bytecode === "0x") throw new ApiError(400, "TOKEN_CODE_MISSING", "No contract code exists at this Arc address.");
  if (symbol === null || name === null || decimalsValue === null) throw new ApiError(400, "TOKEN_NOT_READABLE", "Current CoFi could not read ERC-20 metadata from this Arc contract.");
  const decimals = Number(decimalsValue);
  if (decimals > 18 || !symbol || symbol.length > 24 || !name || name.length > 100) throw new ApiError(400, "INVALID_TOKEN", "This token exposes unsupported metadata.");
  const totalSupplyAtomic = supply?.toString() ?? "0";
  const verified = address.toLowerCase() === ARC_TESTNET.usdcAddress.toLowerCase();
  const owner = ownerResult && isAddress(ownerResult) && ownerResult !== "0x0000000000000000000000000000000000000000" ? ownerResult.toLowerCase() : null;
  const proxyImplementation = implementationFromStorage(storageResult);
  const code = bytecode.toLowerCase();
  const capabilities = observedSelectors.filter((item) => code.includes(item.selector.slice(2).toLowerCase())).map((item) => item.id);
  const posture = classifyAssetPosture({ verified, owner, proxyImplementation, observedCapabilities: capabilities });
  const signals: AssetTrustSignal[] = [
    { id: "contract-code", label: "Contract code", status: "verified", detail: `${(bytecode.length - 2) / 2} bytes · ${keccak256(bytecode).slice(0, 14)}…` },
    { id: "erc20-metadata", label: "ERC-20 metadata", status: "verified", detail: `${symbol} · ${decimals} decimals` },
    { id: "supply", label: "Supply interface", status: supply === null ? "unavailable" : "observed", detail: supply === null ? "totalSupply() was not readable." : `${formatUnits(supply, decimals)} ${symbol} reported` },
    { id: "ownership", label: "Owner interface", status: owner ? "caution" : "observed", detail: owner ? `owner() reports ${owner.slice(0, 8)}…${owner.slice(-6)}` : "No active owner() address was observed." },
    { id: "proxy", label: "Proxy storage", status: proxyImplementation ? "caution" : "observed", detail: proxyImplementation ? `EIP-1967 implementation ${proxyImplementation.slice(0, 8)}…${proxyImplementation.slice(-6)}` : "No EIP-1967 implementation address was observed." },
    { id: "capabilities", label: "Privileged selectors", status: capabilities.length ? "caution" : "observed", detail: capabilities.length ? `${capabilities.join(", ")} selectors appear in runtime code; presence does not prove reachability or authority.` : "No monitored mint, pause, blacklist, or upgrade selectors were observed." },
  ];
  const controlInput = { network: ARC_TESTNET.network, address: address.toLowerCase(), codeHash: keccak256(bytecode), owner, proxyImplementation, capabilities };
  const digestInput = { ...controlInput, symbol, name, decimals, totalSupplyAtomic };
  return {
    schemaVersion: "1.1", network: ARC_TESTNET.network, address: address.toLowerCase(), symbol, name, decimals,
    totalSupply: supply === null ? "unavailable" : formatUnits(supply, decimals), totalSupplyAtomic,
    codeHash: keccak256(bytecode), codeSizeBytes: (bytecode.length - 2) / 2, owner, proxyImplementation,
    observedCapabilities: capabilities, verified, posture,
    distributionPolicy: verified ? "allowed" : "allowed-with-disclosure",
    signals, controlDigest: await sha256(JSON.stringify(controlInput)), reviewDigest: await sha256(JSON.stringify(digestInput)), inspectedAt: new Date().toISOString(),
    explorerUrl: `${ARC_TESTNET.explorerUrl}/address/${address}`,
    boundary: "These are reproducible contract observations, not an audit, endorsement, fraud determination, or guarantee of transfer behavior or market value.",
  };
}
