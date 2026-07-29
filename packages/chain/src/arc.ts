import { createPublicClient, defineChain, http, type PublicClient } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.io";
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_TESTNET_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC_URL],
      webSocket: ["wss://rpc.testnet.arc.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: ARC_TESTNET_EXPLORER_URL,
    },
  },
  testnet: true,
});

export type ArcEnvironment = "arc-testnet" | "arc-mainnet";

export function parseArcEnvironment(value: string | undefined): ArcEnvironment {
  const environment = value ?? "arc-testnet";

  if (environment === "arc-mainnet") {
    throw new Error(
      "Arc mainnet is not publicly available. Use ARC_NETWORK=arc-testnet.",
    );
  }

  if (environment !== "arc-testnet") {
    throw new Error(`Unsupported ARC_NETWORK: ${environment}`);
  }

  return environment;
}

export function createArcPublicClient(
  rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL,
): PublicClient {
  parseArcEnvironment(process.env.ARC_NETWORK);

  return createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });
}
