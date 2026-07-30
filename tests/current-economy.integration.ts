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
const ownerClient = createWalletClient({ account: accounts[0].account, transport });
const projectClient = createWalletClient({ account: accounts[1].account, transport });
const compiled = compileContracts();

async function deployed(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
  assert.ok(receipt.contractAddress);
  return receipt.contractAddress;
}

const current = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentToken.abi,
  bytecode: compiled.currentToken.bytecode,
  args: [accounts[0].address],
}));
const usdc = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.mockUsdc.abi,
  bytecode: compiled.mockUsdc.bytecode,
}));
const lockVault = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentLockVault.abi,
  bytecode: compiled.currentLockVault.bytecode,
  args: [accounts[0].address, current],
}));
const feeRouter = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.currentFeeRouter.abi,
  bytecode: compiled.currentFeeRouter.bytecode,
  args: [
    accounts[0].address,
    usdc,
    current,
    lockVault,
    accounts[5].address,
    accounts[6].address,
    accounts[7].address,
    accounts[0].address,
  ],
}));
const adapter = await deployed(await ownerClient.deployContract({
  chain: null,
  abi: compiled.mockExchangeAdapter.abi,
  bytecode: compiled.mockExchangeAdapter.bytecode,
  args: [BigInt(1_000_000_000_000)],
}));

const projectCurrent = parseUnits("1000", 18);
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: current,
    abi: compiled.currentToken.abi,
    functionName: "transfer",
    args: [accounts[1].address, projectCurrent],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await projectClient.writeContract({
    chain: null,
    address: current,
    abi: compiled.currentToken.abi,
    functionName: "approve",
    args: [lockVault, projectCurrent],
  }),
});
const projectLockId = keccak256(stringToHex("project-lock-proof"));
const projectId = keccak256(stringToHex("tidebreak"));
const unlockAt = Number((await publicClient.getBlock()).timestamp) + 86_500;
await publicClient.waitForTransactionReceipt({
  hash: await projectClient.writeContract({
    chain: null,
    address: lockVault,
    abi: compiled.currentLockVault.abi,
    functionName: "createLock",
    args: [projectLockId, projectId, accounts[1].address, parseUnits("100", 18), unlockAt],
  }),
});
assert.equal(await publicClient.readContract({
  address: lockVault,
  abi: compiled.currentLockVault.abi,
  functionName: "totalLocked",
}), parseUnits("100", 18));
await assert.rejects(() => projectClient.writeContract({
  chain: null,
  address: lockVault,
  abi: compiled.currentLockVault.abi,
  functionName: "withdraw",
  args: [projectLockId],
}));

const feeAmount = parseUnits("100", 6);
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: usdc,
    abi: compiled.mockUsdc.abi,
    functionName: "mint",
    args: [accounts[1].address, feeAmount],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await projectClient.writeContract({
    chain: null,
    address: usdc,
    abi: compiled.mockUsdc.abi,
    functionName: "approve",
    args: [feeRouter, feeAmount],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await projectClient.writeContract({
    chain: null,
    address: feeRouter,
    abi: compiled.currentFeeRouter.abi,
    functionName: "routeProductFee",
    args: [keccak256(stringToHex("campaign-fee-proof")), feeAmount],
  }),
});
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "buybackReserve",
}), parseUnits("35", 6));
assert.equal(await publicClient.readContract({
  address: usdc,
  abi: compiled.mockUsdc.abi,
  functionName: "balanceOf",
  args: [accounts[5].address],
}), parseUnits("25", 6));
assert.equal(await publicClient.readContract({
  address: usdc,
  abi: compiled.mockUsdc.abi,
  functionName: "balanceOf",
  args: [accounts[6].address],
}), parseUnits("20", 6));
assert.equal(await publicClient.readContract({
  address: usdc,
  abi: compiled.mockUsdc.abi,
  functionName: "balanceOf",
  args: [accounts[7].address],
}), parseUnits("20", 6));

await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: current,
    abi: compiled.currentToken.abi,
    functionName: "transfer",
    args: [adapter, parseUnits("100", 18)],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: feeRouter,
    abi: compiled.currentFeeRouter.abi,
    functionName: "setExchangeAdapter",
    args: [adapter, true],
  }),
});
await publicClient.waitForTransactionReceipt({
  hash: await ownerClient.writeContract({
    chain: null,
    address: feeRouter,
    abi: compiled.currentFeeRouter.abi,
    functionName: "executeBuyback",
    args: [adapter, parseUnits("20", 6), parseUnits("20", 18), "0x"],
  }),
});
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "totalCurrentPurchased",
}), parseUnits("20", 18));
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "totalCurrentBurned",
}), parseUnits("10", 18));
assert.equal(await publicClient.readContract({
  address: feeRouter,
  abi: compiled.currentFeeRouter.abi,
  functionName: "totalCurrentProtocolLocked",
}), parseUnits("5", 18));
assert.equal(await publicClient.readContract({
  address: current,
  abi: compiled.currentToken.abi,
  functionName: "balanceOf",
  args: [accounts[6].address],
}), parseUnits("5", 18));

await provider.request({ method: "evm_increaseTime", params: [86_600] });
await provider.request({ method: "evm_mine", params: [] });
await publicClient.waitForTransactionReceipt({
  hash: await projectClient.writeContract({
    chain: null,
    address: lockVault,
    abi: compiled.currentLockVault.abi,
    functionName: "withdraw",
    args: [projectLockId],
  }),
});
assert.equal(await publicClient.readContract({
  address: lockVault,
  abi: compiled.currentLockVault.abi,
  functionName: "totalLocked",
}), parseUnits("5", 18));

console.log("CURRENT locking, fee allocation, buyback routing, burn, protocol lock, and withdrawal passed.");
provider.disconnect();
