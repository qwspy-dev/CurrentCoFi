import assert from "node:assert/strict";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodePacked,
  getAddress,
  keccak256,
  parseUnits,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const initialAccounts = provider.getInitialAccounts();
const accounts = Object.entries(initialAccounts).map(([address, value]) => ({
  address: getAddress(address),
  account: privateKeyToAccount(value.secretKey as `0x${string}`),
}));
const transport = custom(provider);
const publicClient = createPublicClient({ transport });
const ownerClient = createWalletClient({ account: accounts[0].account, transport });
const senderClient = createWalletClient({ account: accounts[1].account, transport });
const claimantClient = createWalletClient({ account: accounts[2].account, transport });
const recipient = accounts[3].address;
const authorizer = accounts[4].account;
const compiled = compileContracts();

const usdcHash = await ownerClient.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode });
const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
const usdc = usdcReceipt.contractAddress;
assert.ok(usdc);
const vaultHash = await ownerClient.deployContract({
  chain: null,
  abi: compiled.vault.abi,
  bytecode: compiled.vault.bytecode,
  args: [accounts[0].address, authorizer.address],
});
const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
const vault = vaultReceipt.contractAddress;
assert.ok(vault);

const amount = parseUnits("25", 6);
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: usdc, abi: compiled.mockUsdc.abi, functionName: "mint", args: [accounts[1].address, amount * BigInt(3)],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: usdc, abi: compiled.mockUsdc.abi, functionName: "approve", args: [vault, amount * BigInt(3)],
  }),
});

const distributionId = keccak256(stringToHex("current-integration-claim"));
const secret = keccak256(stringToHex("private-claim-secret"));
const secretHash = keccak256(encodePacked(["bytes32"], [secret]));
const block = await publicClient.getBlock();
const expiresAt = Number(block.timestamp) + 3_600;
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.vault.abi,
    functionName: "fundDistribution",
    args: [distributionId, usdc, amount, expiresAt, secretHash],
  }),
});
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [vault] }), amount);

const authorizationDeadline = expiresAt - 60;
const digest = await publicClient.readContract({
  address: vault,
  abi: compiled.vault.abi,
  functionName: "claimDigest",
  args: [distributionId, recipient, authorizationDeadline],
}) as `0x${string}`;
const signature = await authorizer.signMessage({ message: { raw: digest } });
await publicClient.waitForTransactionReceipt({
  hash: await claimantClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.vault.abi,
    functionName: "claim",
    args: [distributionId, secret, recipient, authorizationDeadline, signature],
  }),
});
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [recipient] }), amount);
await assert.rejects(() => claimantClient.writeContract({
  chain: null,
  address: vault,
  abi: compiled.vault.abi,
  functionName: "claim",
  args: [distributionId, secret, recipient, authorizationDeadline, signature],
}));

const refundId = keccak256(stringToHex("current-integration-refund"));
const refundSecret = keccak256(stringToHex("refund-secret"));
const refundExpiry = Number((await publicClient.getBlock()).timestamp) + 60;
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.vault.abi,
    functionName: "fundDistribution",
    args: [refundId, usdc, amount, refundExpiry, keccak256(encodePacked(["bytes32"], [refundSecret]))],
  }),
});
await assert.rejects(() => senderClient.writeContract({
  chain: null,
  address: vault, abi: compiled.vault.abi, functionName: "refund", args: [refundId],
}));
await provider.request({ method: "evm_increaseTime", params: [61] });
await provider.request({ method: "evm_mine", params: [] });
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: vault, abi: compiled.vault.abi, functionName: "refund", args: [refundId],
  }),
});
const refunded = await publicClient.readContract({
  address: vault, abi: compiled.vault.abi, functionName: "distributions", args: [refundId],
}) as readonly unknown[];
assert.equal(refunded[5], 3);

console.log("Claim vault funding, authorized claiming, replay protection, expiry, and refunds passed.");
provider.disconnect();
