import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_USDC_ADDRESS,
} from "@current-cofi/chain";
import Fastify, { type FastifyInstance } from "fastify";

import { readEnvironment } from "./env.js";

export function buildServer(): FastifyInstance {
  const environment = readEnvironment();
  const server = Fastify({
    logger: environment.NODE_ENV !== "test",
  });

  server.get("/health", async () => ({
    service: "current-cofi-api",
    status: "ok",
  }));

  server.get("/v1/network", async () => ({
    chainId: ARC_TESTNET_CHAIN_ID,
    environment: environment.ARC_NETWORK,
    explorerUrl: ARC_TESTNET_EXPLORER_URL,
    rpcUrl: environment.ARC_TESTNET_RPC_URL,
    usdcAddress: ARC_TESTNET_USDC_ADDRESS,
  }));

  return server;
}
