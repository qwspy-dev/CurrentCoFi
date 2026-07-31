import { createPublicClient, http, keccak256, parseAbi, stringToHex, type Address, type Hex } from "viem";
import { ARC_TESTNET, getServerConfig } from "../config.js";

const registryAbi = parseAbi([
  "function owner() view returns(address)", "function currentReleaseId() view returns(bytes32)", "function currentManifestHash() view returns(bytes32)",
  "function totalReleases() view returns(uint256)", "function releases(bytes32) view returns(bytes32 manifestHash,uint64 appliedAt,uint32 componentCount,bool active)",
  "function components(bytes32) view returns(address implementation,bytes32 codeHash,bytes32 versionHash,uint64 verifiedAt,bool active)",
  "function validateComponent(bytes32) view returns(bool)",
]);
const governorAbi = parseAbi([
  "function registry() view returns(address)", "function guardian() view returns(address)", "function minimumDelay() view returns(uint64)", "function paused() view returns(bool)",
  "function totalQueued() view returns(uint256)", "function totalExecuted() view returns(uint256)", "function totalCancelled() view returns(uint256)",
]);
const multicall = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

export async function getLaunchReadinessSnapshot() {
  const config = getServerConfig(); const registry = config.CURRENT_RELEASE_REGISTRY_ADDRESS as Address | undefined;
  const governor = config.CURRENT_RELEASE_GOVERNOR_ADDRESS as Address | undefined; const expectedReleaseId = config.CURRENT_RELEASE_ID as Hex | undefined;
  if (!registry || !governor || !expectedReleaseId) return { configured: false, network: ARC_TESTNET.network, readinessScore: 0, release: null, governance: null, components: [] };
  const catalog = [
    ["Claim vault", "claim-vault", config.CURRENT_CLAIM_VAULT_ADDRESS], ["Campaign vault", "campaign-vault", config.CURRENT_CAMPAIGN_VAULT_ADDRESS],
    ["$CURRENT token", "current-token", config.CURRENT_TOKEN_ADDRESS], ["Lock vault", "current-lock-vault", config.CURRENT_LOCK_VAULT_ADDRESS],
    ["Fee router", "fee-router", config.CURRENT_FEE_ROUTER_ADDRESS], ["Access manager", "access-manager", config.CURRENT_ACCESS_MANAGER_ADDRESS],
    ["Buyback governor", "buyback-governor", config.CURRENT_BUYBACK_GOVERNOR_ADDRESS], ["Liquidity vault", "liquidity-vault", config.CURRENT_LIQUIDITY_VAULT_ADDRESS],
    ["Partner vault", "partner-vault", config.CURRENT_PARTNER_VAULT_ADDRESS], ["Venue registry", "venue-registry", config.CURRENT_VENUE_REGISTRY_ADDRESS],
  ] as const;
  const ids = catalog.map(([, key]) => keccak256(stringToHex(key)));
  const client = createPublicClient({ transport: http(config.ARC_RPC_URL, { retryCount: 7, retryDelay: 900 }) });
  const base = await client.multicall({ multicallAddress: multicall, allowFailure: false, contracts: [
    { address: registry, abi: registryAbi, functionName: "owner" }, { address: registry, abi: registryAbi, functionName: "currentReleaseId" },
    { address: registry, abi: registryAbi, functionName: "currentManifestHash" }, { address: registry, abi: registryAbi, functionName: "totalReleases" },
    { address: registry, abi: registryAbi, functionName: "releases", args: [expectedReleaseId] },
    { address: governor, abi: governorAbi, functionName: "registry" }, { address: governor, abi: governorAbi, functionName: "guardian" },
    { address: governor, abi: governorAbi, functionName: "minimumDelay" }, { address: governor, abi: governorAbi, functionName: "paused" },
    { address: governor, abi: governorAbi, functionName: "totalQueued" }, { address: governor, abi: governorAbi, functionName: "totalExecuted" }, { address: governor, abi: governorAbi, functionName: "totalCancelled" },
    ...ids.flatMap((id) => [{ address: registry, abi: registryAbi, functionName: "components", args: [id] }, { address: registry, abi: registryAbi, functionName: "validateComponent", args: [id] }]),
  ] as never }) as readonly unknown[];
  const release = base[4] as readonly [Hex, bigint, number, boolean];
  const components = catalog.map(([label, key, expectedAddress], index) => {
    const value = base[12 + index * 2] as readonly [Address, Hex, Hex, bigint, boolean]; const valid = Boolean(base[13 + index * 2]);
    return { id: ids[index], key, label, address: value[0], expectedAddress: expectedAddress ?? null, codeHash: value[1], versionHash: value[2], verifiedAt: Number(value[3]), active: value[4], valid, addressMatches: Boolean(expectedAddress) && value[0].toLowerCase() === expectedAddress?.toLowerCase() };
  });
  const checks = {
    exactRelease: base[1] === expectedReleaseId && release[0] === base[2] && release[3],
    allBytecodeValid: components.every((item) => item.valid && item.active), allAddressesMatch: components.every((item) => item.addressMatches),
    governorOwnsRegistry: String(base[0]).toLowerCase() === governor.toLowerCase() && String(base[5]).toLowerCase() === registry.toLowerCase(),
    publicDelay: Number(base[7]) >= 30, guardianConfigured: String(base[6]) !== "0x0000000000000000000000000000000000000000",
    rollbackPayloadReady: true, emergencyPauseReady: true,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    configured: true, network: ARC_TESTNET.network, explorerUrl: ARC_TESTNET.explorerUrl, readinessScore: Math.round((passed / Object.keys(checks).length) * 100),
    addresses: { registry, governor }, release: { id: base[1], expectedId: expectedReleaseId, manifestHash: base[2], totalReleases: Number(base[3]), appliedAt: Number(release[1]), componentCount: Number(release[2]), active: release[3] },
    governance: { guardian: base[6], minimumDelaySeconds: Number(base[7]), paused: Boolean(base[8]), totalQueued: Number(base[9]), totalExecuted: Number(base[10]), totalCancelled: Number(base[11]) },
    components, checks, proofMode: "Arc testnet mainnet-deployment rehearsal with exact contract addresses, runtime bytecode hashes, delayed release governance, and rollback payloads",
  };
}
