import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_USDC_ADDRESS,
  createArcPublicClient,
} from "../packages/chain/dist/index.js";
import { formatGwei } from "viem";

const client = createArcPublicClient();

const [chainId, blockNumber, gasPrice, bytecode] = await Promise.all([
  client.getChainId(),
  client.getBlockNumber(),
  client.getGasPrice(),
  client.getCode({ address: ARC_TESTNET_USDC_ADDRESS }),
]);

if (chainId !== ARC_TESTNET_CHAIN_ID) {
  throw new Error(
    `Wrong chain: expected ${ARC_TESTNET_CHAIN_ID}, received ${chainId}`,
  );
}

if (!bytecode || bytecode === "0x") {
  throw new Error("No USDC contract code found at the configured address");
}

console.log(
  JSON.stringify(
    {
      blockNumber: blockNumber.toString(),
      chainId,
      explorerUrl: ARC_TESTNET_EXPLORER_URL,
      gasPriceGwei: formatGwei(gasPrice),
      status: "ok",
      usdcAddress: ARC_TESTNET_USDC_ADDRESS,
    },
    null,
    2,
  ),
);
