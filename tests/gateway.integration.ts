import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress } from "viem";
import {
  buildGatewayBurnTypedData,
  GATEWAY_MINTER_ADDRESS,
  GATEWAY_WALLET_ADDRESS,
} from "../server/gateway/service.js";

const account = privateKeyToAccount(
  "0x8b3a350cf5c34c9194ca3a545d4b8a151b2b47d9678721d5cc670878e5b72f50",
);
const recipient = "0x1111111111111111111111111111111111111111";
const typedData = buildGatewayBurnTypedData({
  sourceDomain: 6,
  sourceToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  sourceDepositor: account.address,
  destinationRecipient: recipient,
  value: "25000000",
  maxFee: "2010000",
  salt: `0x${"42".repeat(32)}`,
});

assert.equal(typedData.domain.name, "GatewayWallet");
assert.equal(typedData.primaryType, "BurnIntent");
assert.equal(typedData.message.spec.sourceDomain, 6);
assert.equal(typedData.message.spec.destinationDomain, 26);
assert.equal(typedData.message.spec.value, "25000000");
assert.equal(
  typedData.message.spec.sourceContract.toLowerCase().endsWith(GATEWAY_WALLET_ADDRESS.slice(2).toLowerCase()),
  true,
);
assert.equal(
  typedData.message.spec.destinationContract.toLowerCase().endsWith(GATEWAY_MINTER_ADDRESS.slice(2).toLowerCase()),
  true,
);

const signature = await account.signTypedData(
  typedData as unknown as Parameters<typeof account.signTypedData>[0],
);
const recovered = await recoverTypedDataAddress({
  ...(typedData as unknown as Parameters<typeof recoverTypedDataAddress>[0]),
  signature,
});
assert.equal(recovered.toLowerCase(), account.address.toLowerCase());

console.log("Gateway burn-intent construction and EOA signature recovery passed.");
