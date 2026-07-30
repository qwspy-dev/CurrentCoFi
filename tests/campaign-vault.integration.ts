import assert from "node:assert/strict";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  getAddress,
  keccak256,
  parseUnits,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildCampaignTree, contractAllocationId } from "../server/campaigns/merkle.js";
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
const authorizer = accounts[4].account;
const compiled = compileContracts();

const usdcReceipt = await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.deployContract({
    chain: null,
    abi: compiled.mockUsdc.abi,
    bytecode: compiled.mockUsdc.bytecode,
  }),
});
const usdc = usdcReceipt.contractAddress;
assert.ok(usdc);
const vaultReceipt = await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.deployContract({
    chain: null,
    abi: compiled.campaignVault.abi,
    bytecode: compiled.campaignVault.bytecode,
    args: [accounts[0].address, authorizer.address],
  }),
});
const vault = vaultReceipt.contractAddress;
assert.ok(vault);

const allocations = [
  { allocationId: crypto.randomUUID(), index: 0, amountAtomic: parseUnits("10", 6).toString() },
  { allocationId: crypto.randomUUID(), index: 1, amountAtomic: parseUnits("15", 6).toString() },
  { allocationId: crypto.randomUUID(), index: 2, amountAtomic: parseUnits("25", 6).toString() },
];
const tree = buildCampaignTree(allocations);
const total = allocations.reduce((sum, allocation) => sum + BigInt(allocation.amountAtomic), BigInt(0));
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: usdc,
    abi: compiled.mockUsdc.abi,
    functionName: "mint",
    args: [accounts[1].address, total * BigInt(2)],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: usdc,
    abi: compiled.mockUsdc.abi,
    functionName: "approve",
    args: [vault, total * BigInt(2)],
  }),
});

const campaignId = keccak256(stringToHex("current-campaign-integration"));
const expiresAt = Number((await publicClient.getBlock()).timestamp) + 3_600;
await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.campaignVault.abi,
    functionName: "fundCampaign",
    args: [campaignId, usdc, total, expiresAt, allocations.length, tree.root],
  }),
});

const allocation = allocations[1];
const recipient = accounts[3].address;
const deadline = expiresAt - 60;
const digest = keccak256(encodeAbiParameters(
  [
    { type: "address" },
    { type: "uint256" },
    { type: "bytes32" },
    { type: "uint256" },
    { type: "bytes32" },
    { type: "address" },
    { type: "uint256" },
    { type: "uint64" },
  ],
  [
    vault,
    BigInt(await publicClient.getChainId()),
    campaignId,
    BigInt(allocation.index),
    contractAllocationId(allocation.allocationId),
    recipient,
    BigInt(allocation.amountAtomic),
    BigInt(deadline),
  ],
));
const signature = await authorizer.signMessage({ message: { raw: digest } });
const claimArgs = [
  campaignId,
  BigInt(allocation.index),
  contractAllocationId(allocation.allocationId),
  BigInt(allocation.amountAtomic),
  recipient,
  BigInt(deadline),
  tree.proof(allocation.index),
  signature,
] as const;
await publicClient.waitForTransactionReceipt({
  hash: await claimantClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.campaignVault.abi,
    functionName: "claim",
    args: claimArgs,
  }),
});
assert.equal(
  await publicClient.readContract({
    address: usdc,
    abi: compiled.mockUsdc.abi,
    functionName: "balanceOf",
    args: [recipient],
  }),
  BigInt(allocation.amountAtomic),
);
assert.equal(
  await publicClient.readContract({
    address: vault,
    abi: compiled.campaignVault.abi,
    functionName: "isClaimed",
    args: [campaignId, BigInt(allocation.index)],
  }),
  true,
);
await assert.rejects(() => claimantClient.writeContract({
  chain: null,
  address: vault,
  abi: compiled.campaignVault.abi,
  functionName: "claim",
  args: claimArgs,
}));

await publicClient.waitForTransactionReceipt({
  hash: await senderClient.writeContract({
    chain: null,
    address: vault,
    abi: compiled.campaignVault.abi,
    functionName: "cancel",
    args: [campaignId],
  }),
});
const campaign = await publicClient.readContract({
  address: vault,
  abi: compiled.campaignVault.abi,
  functionName: "campaigns",
  args: [campaignId],
}) as readonly unknown[];
assert.equal(campaign[7], 4);

console.log("Campaign vault Merkle claims, recipient authorization, replay protection, and cancellation passed.");
provider.disconnect();
