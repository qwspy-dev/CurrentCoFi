import assert from "node:assert/strict";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  keccak256,
  parseUnits,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileContracts } from "../scripts/contracts/compile.js";

const provider = ganache.provider({ logging: { quiet: true } });
const accounts = Object.entries(provider.getInitialAccounts()).map(([address, value]) => ({
  address: getAddress(address),
  account: privateKeyToAccount(value.secretKey as `0x${string}`),
}));
const transport = custom(provider);
const publicClient = createPublicClient({ transport });
const owner = createWalletClient({ account: accounts[0].account, transport });
const client = createWalletClient({ account: accounts[1].account, transport });
const providerWallet = createWalletClient({ account: accounts[2].account, transport });
const arbitrator = createWalletClient({ account: accounts[3].account, transport });
const compiled = compileContracts();

const usdcReceipt = await publicClient.waitForTransactionReceipt({
  hash: await owner.deployContract({ chain: null, abi: compiled.mockUsdc.abi, bytecode: compiled.mockUsdc.bytecode }),
});
const escrowReceipt = await publicClient.waitForTransactionReceipt({
  hash: await owner.deployContract({ chain: null, abi: compiled.milestoneEscrow.abi, bytecode: compiled.milestoneEscrow.bytecode, args: [accounts[0].address] }),
});
const usdc = usdcReceipt.contractAddress;
const escrow = escrowReceipt.contractAddress;
assert.ok(usdc && escrow);

const amountOne = parseUnits("400", 6);
const amountTwo = parseUnits("600", 6);
const total = amountOne + amountTwo;
await publicClient.waitForTransactionReceipt({
  hash: await owner.writeContract({ chain: null, address: usdc, abi: compiled.mockUsdc.abi, functionName: "mint", args: [accounts[1].address, total * BigInt(3)] }),
});
await publicClient.waitForTransactionReceipt({
  hash: await client.writeContract({ chain: null, address: usdc, abi: compiled.mockUsdc.abi, functionName: "approve", args: [escrow, total * BigInt(3)] }),
});

const block = await publicClient.getBlock();
const dealId = keccak256(stringToHex("current-milestone-proof"));
const dueDates = [Number(block.timestamp) + 3_600, Number(block.timestamp) + 7_200];
await publicClient.waitForTransactionReceipt({
  hash: await client.writeContract({
    chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "createEscrow",
    args: [{ dealId, provider: accounts[2].address, refundAddress: accounts[1].address, token: usdc, arbitrator: accounts[3].address, amounts: [amountOne, amountTwo], dueDates, termsHash: keccak256(stringToHex("signed scope v1")) }],
  }),
});
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [escrow] }), total);

await publicClient.waitForTransactionReceipt({
  hash: await providerWallet.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "submitMilestone", args: [dealId, 0, keccak256(stringToHex("delivery-one"))] }),
});
await publicClient.waitForTransactionReceipt({
  hash: await client.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "approveMilestone", args: [dealId, 0] }),
});
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [accounts[2].address] }), amountOne);

await publicClient.waitForTransactionReceipt({
  hash: await providerWallet.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "submitMilestone", args: [dealId, 1, keccak256(stringToHex("delivery-two"))] }),
});
await publicClient.waitForTransactionReceipt({
  hash: await client.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "raiseDispute", args: [dealId, 1] }),
});
const providerAward = parseUnits("250", 6);
await publicClient.waitForTransactionReceipt({
  hash: await arbitrator.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "resolveDispute", args: [dealId, 1, providerAward] }),
});
assert.equal(await publicClient.readContract({ address: usdc, abi: compiled.mockUsdc.abi, functionName: "balanceOf", args: [accounts[2].address] }), amountOne + providerAward);
const deal = await publicClient.readContract({ address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "deals", args: [dealId] }) as readonly unknown[];
assert.equal(deal[11], 3, "the split resolution should complete the agreement");

const cancellationDeal = keccak256(stringToHex("current-mutual-cancel"));
await publicClient.waitForTransactionReceipt({
  hash: await client.writeContract({
    chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "createEscrow",
    args: [{ dealId: cancellationDeal, provider: accounts[2].address, refundAddress: accounts[1].address, token: usdc, arbitrator: accounts[3].address, amounts: [amountOne], dueDates: [Number(block.timestamp) + 10_800], termsHash: keccak256(stringToHex("cancel scope")) }],
  }),
});
await publicClient.waitForTransactionReceipt({ hash: await client.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "requestCancellation", args: [cancellationDeal] }) });
await publicClient.waitForTransactionReceipt({ hash: await providerWallet.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "acceptCancellation", args: [cancellationDeal] }) });
const cancelled = await publicClient.readContract({ address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "deals", args: [cancellationDeal] }) as readonly unknown[];
assert.equal(cancelled[11], 4, "mutual cancellation should be recoverable and terminal");

await assert.rejects(() => providerWallet.writeContract({ chain: null, address: escrow, abi: compiled.milestoneEscrow.abi, functionName: "submitMilestone", args: [dealId, 1, keccak256(stringToHex("replay"))] }));
console.log("Milestone escrow funding, sequential release, split dispute resolution, recovery, and replay boundaries passed.");
provider.disconnect();
