import { ARC_TESTNET } from "../config.js";
import { ApiError } from "../http.js";

export const CCTP_TOKEN_MESSENGER_V2 = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
export const CCTP_FORWARD_HOOK = "0x636374702d666f72776172640000000000000000000000000000000000000000";

export const fundingChains = [
  {
    code: "ETH-SEPOLIA",
    label: "Ethereum Sepolia",
    domain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    explorer: "https://sepolia.etherscan.io",
  },
  {
    code: "AVAX-FUJI",
    label: "Avalanche Fuji",
    domain: 1,
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    explorer: "https://testnet.snowtrace.io",
  },
  {
    code: "OP-SEPOLIA",
    label: "OP Sepolia",
    domain: 2,
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    explorer: "https://sepolia-optimism.etherscan.io",
  },
  {
    code: "ARB-SEPOLIA",
    label: "Arbitrum Sepolia",
    domain: 3,
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    explorer: "https://sepolia.arbiscan.io",
  },
  {
    code: "BASE-SEPOLIA",
    label: "Base Sepolia",
    domain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorer: "https://sepolia.basescan.org",
  },
  {
    code: "MATIC-AMOY",
    label: "Polygon Amoy",
    domain: 7,
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    explorer: "https://amoy.polygonscan.com",
  },
] as const;

export type FundingChainCode = typeof fundingChains[number]["code"];

export function fundingChain(code: string) {
  const chain = fundingChains.find((item) => item.code === code);
  if (!chain) throw new ApiError(400, "UNSUPPORTED_SOURCE_CHAIN", "Choose a supported USDC testnet.");
  return chain;
}

export const arcFundingDestination = {
  code: ARC_TESTNET.network,
  domain: ARC_TESTNET.gatewayDomain,
  usdcAddress: ARC_TESTNET.usdcAddress,
  explorer: ARC_TESTNET.explorerUrl,
};
