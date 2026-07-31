import { createPublicClient, http, keccak256, parseAbi, type Address } from "viem";
import { ARC_TESTNET, getServerConfig } from "../config.js";

const registryAbi = parseAbi([
  "function owner() view returns (address)", "function current() view returns (address)", "function usdc() view returns (address)",
  "function approvedVenueCount() view returns (uint256)", "function totalVenueApprovals() view returns (uint256)", "function totalVenueRevocations() view returns (uint256)",
  "function venues(address) view returns (bool approved,bytes32 venueId,bytes32 venueNameHash,bytes32 adapterCodeHash,uint16 maxSlippageBps,uint16 maxAllocationBps,uint64 activatedAt,uint64 updatedAt)",
]);
const governorAbi = parseAbi([
  "function registry() view returns (address)", "function guardian() view returns (address)", "function minimumDelay() view returns (uint64)",
  "function totalQueued() view returns (uint256)", "function totalExecuted() view returns (uint256)", "function totalCancelled() view returns (uint256)",
]);
const multicall = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

export async function getVenueRegistrySnapshot() {
  const config = getServerConfig(); const registry = config.CURRENT_VENUE_REGISTRY_ADDRESS as Address | undefined;
  const governor = config.CURRENT_VENUE_REGISTRY_GOVERNOR_ADDRESS as Address | undefined;
  const adapter = config.CURRENT_TESTNET_LIQUIDITY_ADAPTER_ADDRESS as Address | undefined;
  if (!registry || !governor || !adapter) return { configured: false, network: ARC_TESTNET.network, addresses: null, venue: null, governance: null };
  const client = createPublicClient({ transport: http(config.ARC_RPC_URL, { retryCount: 5, retryDelay: 800 }) });
  const values = await client.multicall({ multicallAddress: multicall, allowFailure: false, contracts: [
    { address: registry, abi: registryAbi, functionName: "owner" }, { address: registry, abi: registryAbi, functionName: "current" },
    { address: registry, abi: registryAbi, functionName: "usdc" }, { address: registry, abi: registryAbi, functionName: "approvedVenueCount" },
    { address: registry, abi: registryAbi, functionName: "totalVenueApprovals" }, { address: registry, abi: registryAbi, functionName: "totalVenueRevocations" },
    { address: registry, abi: registryAbi, functionName: "venues", args: [adapter] },
    { address: governor, abi: governorAbi, functionName: "registry" }, { address: governor, abi: governorAbi, functionName: "guardian" },
    { address: governor, abi: governorAbi, functionName: "minimumDelay" }, { address: governor, abi: governorAbi, functionName: "totalQueued" },
    { address: governor, abi: governorAbi, functionName: "totalExecuted" }, { address: governor, abi: governorAbi, functionName: "totalCancelled" },
  ] as never }) as readonly unknown[];
  const venue = values[6] as readonly [boolean, `0x${string}`, `0x${string}`, `0x${string}`, number, number, bigint, bigint];
  const code = await client.getCode({ address: adapter }); const liveCodeHash = code ? keccak256(code) : null;
  return {
    configured: true, network: ARC_TESTNET.network, explorerUrl: ARC_TESTNET.explorerUrl,
    addresses: { registry, governor, adapter, current: values[1], usdc: values[2] },
    venue: { approved: venue[0], venueId: venue[1], venueNameHash: venue[2], registeredCodeHash: venue[3], liveCodeHash, codeHashMatches: liveCodeHash === venue[3], maxSlippageBps: Number(venue[4]), maxAllocationBps: Number(venue[5]), activatedAt: Number(venue[6]), updatedAt: Number(venue[7]) },
    governance: { governorOwnsRegistry: String(values[0]).toLowerCase() === governor.toLowerCase() && String(values[7]).toLowerCase() === registry.toLowerCase(), guardian: values[8], minimumDelaySeconds: Number(values[9]), totalQueued: Number(values[10]), totalExecuted: Number(values[11]), totalCancelled: Number(values[12]) },
    totals: { approvedVenues: Number(values[3]), approvals: Number(values[4]), revocations: Number(values[5]) },
    readiness: { custodyAdapterBoundary: true, exactBytecodeBinding: venue[0] && liveCodeHash === venue[3], exactPairBinding: String(values[1]).toLowerCase() === String(config.CURRENT_TOKEN_ADDRESS).toLowerCase() && String(values[2]).toLowerCase() === ARC_TESTNET.usdcAddress.toLowerCase(), riskCaps: Number(venue[4]) > 0 && Number(venue[5]) > 0, testnetQualificationOnly: true },
    proofMode: "Arc testnet venue qualification; production venue selection remains gated on mainnet liquidity and review",
  };
}
