import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createPublicClient,
  formatUnits,
  http,
  keccak256,
  parseAbi,
  parseUnits,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import type { CurrentSession } from "../auth/session.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";
import { createUserContractExecutionChallenge } from "../circle/client.js";
import { ARC_TESTNET, getServerConfig } from "../config.js";
import { getDb, hasDatabaseConfig } from "../db/client.js";
import { tokenEconomyActions } from "../db/schema.js";
import { ApiError } from "../http.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";

const tokenAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);
const lockAbi = parseAbi([
  "function totalLocked() view returns (uint256)",
]);
const routerAbi = parseAbi([
  "function owner() view returns (address)",
  "function exchangeAdapters(address) view returns (bool)",
  "function totalProductFees() view returns (uint256)",
  "function buybackReserve() view returns (uint256)",
  "function totalBuybackUSDC() view returns (uint256)",
  "function totalCurrentPurchased() view returns (uint256)",
  "function totalCurrentBurned() view returns (uint256)",
  "function totalCurrentProtocolLocked() view returns (uint256)",
]);
const accessAbi = parseAbi([
  "function totalAccessActivations() view returns (uint256)",
  "function STREAM_REQUIREMENT() view returns (uint256)",
  "function SURGE_REQUIREMENT() view returns (uint256)",
  "function CURRENT_REQUIREMENT() view returns (uint256)",
  "function accessOf(bytes32) view returns (uint8 tier,uint64 expiresAt,bytes32 lockId,address owner)",
]);
const governorAbi = parseAbi([
  "function feeRouter() view returns (address)",
  "function guardian() view returns (address)",
  "function minimumDelay() view returns (uint64)",
  "function totalQueued() view returns (uint256)",
  "function totalExecuted() view returns (uint256)",
  "function totalCancelled() view returns (uint256)",
]);

function contracts() {
  const config = getServerConfig();
  if (!config.CURRENT_TOKEN_ADDRESS || !config.CURRENT_LOCK_VAULT_ADDRESS || !config.CURRENT_FEE_ROUTER_ADDRESS) {
    return null;
  }
  return {
    current: config.CURRENT_TOKEN_ADDRESS as Address,
    lockVault: config.CURRENT_LOCK_VAULT_ADDRESS as Address,
    feeRouter: config.CURRENT_FEE_ROUTER_ADDRESS as Address,
    accessManager: config.CURRENT_ACCESS_MANAGER_ADDRESS as Address | undefined,
    buybackGovernor: config.CURRENT_BUYBACK_GOVERNOR_ADDRESS as Address | undefined,
    testnetAdapter: config.CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS as Address | undefined,
  };
}

const publicClient = () => createPublicClient({
  transport: http(getServerConfig().ARC_RPC_URL, { retryCount: 5, retryDelay: 500 }),
});
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

function display(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: decimals === 6 ? 2 : 4,
  });
}

const tierNames = ["None", "Stream", "Surge", "Current"] as const;

function projectContractId(projectId?: string) {
  return projectId ? keccak256(stringToHex(projectId)) : null;
}

export async function economySnapshot(walletAddress?: string, projectId?: string) {
  const addresses = contracts();
  if (!addresses) {
    return {
      configured: false,
      network: ARC_TESTNET.network,
      addresses: null,
      metrics: null,
      walletCurrent: null,
      recentActions: [],
    };
  }
  const client = publicClient();
  const baseReads = [
    { address: addresses.current, abi: tokenAbi, functionName: "totalSupply" },
    { address: addresses.lockVault, abi: lockAbi, functionName: "totalLocked" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "totalProductFees" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "buybackReserve" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "totalBuybackUSDC" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "totalCurrentPurchased" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "totalCurrentBurned" },
    { address: addresses.feeRouter, abi: routerAbi, functionName: "totalCurrentProtocolLocked" },
  ] as const;
  const governanceConfigured = Boolean(
    addresses.accessManager && addresses.buybackGovernor && addresses.testnetAdapter,
  );
  const accessProjectId = projectContractId(projectId);
  let rpcStatus: "live" | "degraded" = "live";
  let results: readonly unknown[];
  try {
    const reads: Array<Record<string, unknown>> = [...baseReads];
    if (walletAddress && /^0x[0-9a-f]{40}$/i.test(walletAddress)) {
      reads.push({
        address: addresses.current,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [walletAddress as Address],
      });
    }
    if (governanceConfigured) {
      reads.push(
        { address: addresses.accessManager!, abi: accessAbi, functionName: "totalAccessActivations" },
        { address: addresses.accessManager!, abi: accessAbi, functionName: "STREAM_REQUIREMENT" },
        { address: addresses.accessManager!, abi: accessAbi, functionName: "SURGE_REQUIREMENT" },
        { address: addresses.accessManager!, abi: accessAbi, functionName: "CURRENT_REQUIREMENT" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "feeRouter" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "guardian" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "minimumDelay" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "totalQueued" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "totalExecuted" },
        { address: addresses.buybackGovernor!, abi: governorAbi, functionName: "totalCancelled" },
        { address: addresses.feeRouter, abi: routerAbi, functionName: "owner" },
        {
          address: addresses.feeRouter,
          abi: routerAbi,
          functionName: "exchangeAdapters",
          args: [addresses.testnetAdapter!],
        },
      );
      if (accessProjectId) {
        reads.push({
          address: addresses.accessManager!,
          abi: accessAbi,
          functionName: "accessOf",
          args: [accessProjectId],
        });
      }
    }
    results = await client.multicall({
      contracts: reads as never,
      multicallAddress: MULTICALL3,
      allowFailure: false,
    }) as readonly unknown[];
  } catch {
    rpcStatus = "degraded";
    results = [BigInt("1000000000000000000000000000"), ...Array<bigint>(20).fill(BigInt(0))];
  }
  const totalSupply = BigInt(results[0] as bigint);
  const totalLocked = BigInt(results[1] as bigint);
  const totalProductFees = BigInt(results[2] as bigint);
  const buybackReserve = BigInt(results[3] as bigint);
  const totalBuybackUSDC = BigInt(results[4] as bigint);
  const totalCurrentPurchased = BigInt(results[5] as bigint);
  const totalCurrentBurned = BigInt(results[6] as bigint);
  const totalCurrentProtocolLocked = BigInt(results[7] as bigint);
  const walletCurrent = walletAddress && /^0x[0-9a-f]{40}$/i.test(walletAddress)
    ? BigInt((results[8] as bigint | undefined) ?? BigInt(0))
    : null;
  const governanceOffset = walletCurrent === null ? 8 : 9;
  const governanceValues = governanceConfigured ? results.slice(governanceOffset) : [];
  const [
    totalAccessActivations = BigInt(0),
    streamRequirement = BigInt(0),
    surgeRequirement = BigInt(0),
    currentRequirement = BigInt(0),
    governedRouter = "0x0000000000000000000000000000000000000000",
    guardian = "0x0000000000000000000000000000000000000000",
    minimumDelay = BigInt(0),
    totalQueued = BigInt(0),
    totalExecuted = BigInt(0),
    totalCancelled = BigInt(0),
    routerOwner = "0x0000000000000000000000000000000000000000",
    adapterAllowed = false,
    accessTuple,
  ] = governanceValues;
  const projectAccess = Array.isArray(accessTuple)
    ? {
      tier: Number(accessTuple[0]),
      tierName: tierNames[Number(accessTuple[0])] ?? "None",
      expiresAt: Number(accessTuple[1]),
      lockId: String(accessTuple[2]),
      owner: String(accessTuple[3]),
    }
    : null;
  const recentActions = hasDatabaseConfig()
    ? await getDb().select({
      id: tokenEconomyActions.id,
      kind: tokenEconomyActions.kind,
      reference: tokenEconomyActions.reference,
      amountAtomic: tokenEconomyActions.amountAtomic,
      durationDays: tokenEconomyActions.durationDays,
      transactionHash: tokenEconomyActions.transactionHash,
      createdAt: tokenEconomyActions.createdAt,
    }).from(tokenEconomyActions)
      .where(inArray(tokenEconomyActions.status, ["confirmed", "activated"]))
      .orderBy(desc(tokenEconomyActions.createdAt))
      .limit(8)
    : [];
  return {
    configured: true,
    rpcStatus,
    verifiedAt: rpcStatus === "live" ? new Date().toISOString() : null,
    network: ARC_TESTNET.network,
    explorerUrl: ARC_TESTNET.explorerUrl,
    addresses,
    metrics: {
      totalSupply: display(totalSupply, 18),
      totalSupplyAtomic: totalSupply.toString(),
      totalLocked: display(totalLocked, 18),
      totalLockedAtomic: totalLocked.toString(),
      totalProductFees: display(totalProductFees, 6),
      totalProductFeesAtomic: totalProductFees.toString(),
      buybackReserve: display(buybackReserve, 6),
      buybackReserveAtomic: buybackReserve.toString(),
      totalBuybackUSDC: display(totalBuybackUSDC, 6),
      totalCurrentPurchased: display(totalCurrentPurchased, 18),
      totalCurrentBurned: display(totalCurrentBurned, 18),
      totalCurrentProtocolLocked: display(totalCurrentProtocolLocked, 18),
    },
    walletCurrent: walletCurrent === null ? null : {
      display: display(walletCurrent, 18),
      atomic: walletCurrent.toString(),
    },
    allocations: {
      buybackBps: 3_500,
      gasBps: 2_500,
      liquidityBps: 2_000,
      operationsBps: 2_000,
    },
    governance: {
      configured: governanceConfigured,
      governorOwnsRouter: governanceConfigured &&
        String(governedRouter).toLowerCase() === addresses.feeRouter.toLowerCase() &&
        String(routerOwner).toLowerCase() === addresses.buybackGovernor!.toLowerCase(),
      adapterAllowed: Boolean(adapterAllowed),
      guardian: governanceConfigured ? String(guardian) : null,
      minimumDelaySeconds: Number(minimumDelay),
      totalQueued: Number(totalQueued),
      totalExecuted: Number(totalExecuted),
      totalCancelled: Number(totalCancelled),
      totalAccessActivations: Number(totalAccessActivations),
    },
    accessTiers: governanceConfigured ? [
      { name: "Stream", requirement: display(BigInt(streamRequirement as bigint), 18), recipientLimit: 1_000 },
      { name: "Surge", requirement: display(BigInt(surgeRequirement as bigint), 18), recipientLimit: 10_000 },
      { name: "Current", requirement: display(BigInt(currentRequirement as bigint), 18), recipientLimit: 100_000 },
    ] : [],
    projectAccess,
    recentActions: recentActions.map((action) => ({
      ...action,
      amount: action.kind === "product-fee"
        ? display(BigInt(action.amountAtomic), 6)
        : display(BigInt(action.amountAtomic), 18),
      createdAt: action.createdAt.toISOString(),
    })),
  };
}

function parseAmount(value: unknown, decimals: number, symbol: string) {
  if (typeof value !== "string" || !/^\d+(\.\d{1,18})?$/.test(value.trim())) {
    throw new ApiError(400, "INVALID_AMOUNT", `Enter a valid ${symbol} amount.`);
  }
  try {
    const amount = parseUnits(value, decimals);
    if (amount <= 0) throw new Error("zero");
    return amount;
  } catch {
    throw new ApiError(400, "INVALID_AMOUNT", `Enter a valid ${symbol} amount.`);
  }
}

function actionContracts() {
  const value = contracts();
  if (!value) {
    throw new ApiError(503, "CURRENT_ECONOMY_NOT_CONFIGURED", "$CURRENT testnet contracts are not configured.");
  }
  return value;
}

export async function listEconomyActions(userId: string) {
  const rows = await getDb().select().from(tokenEconomyActions)
    .where(eq(tokenEconomyActions.userId, userId))
    .orderBy(desc(tokenEconomyActions.createdAt))
    .limit(25);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    reference: row.reference,
    amount: row.kind === "product-fee"
      ? display(BigInt(row.amountAtomic), 6)
      : display(BigInt(row.amountAtomic), 18),
    amountAtomic: row.amountAtomic,
    durationDays: row.durationDays,
    contractActionId: row.contractActionId,
    status: row.status,
    transactionHash: row.transactionHash,
    accessTier: typeof (row.metadata as Record<string, unknown>).accessTier === "string"
      ? (row.metadata as Record<string, unknown>).accessTier
      : null,
    accessExpiresAt: typeof (row.metadata as Record<string, unknown>).accessExpiresAt === "number"
      ? (row.metadata as Record<string, unknown>).accessExpiresAt
      : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

type BeginInput = {
  kind: "project-lock" | "product-fee";
  amount: unknown;
  durationDays?: unknown;
  reference?: unknown;
};

export async function beginEconomyAction(
  request: Request,
  session: CurrentSession,
  userId: string,
  projectId: string,
  input: BeginInput,
) {
  const addresses = actionContracts();
  const wallet = arcWallet(session);
  const isLock = input.kind === "project-lock";
  const amount = parseAmount(input.amount, isLock ? 18 : 6, isLock ? "CURRENT" : "USDC");
  const durationDays = isLock ? Math.round(Number(input.durationDays ?? 90)) : null;
  if (isLock && (!Number.isFinite(durationDays) || durationDays! < 1 || durationDays! > 730)) {
    throw new ApiError(400, "INVALID_LOCK_DURATION", "Lock duration must be between 1 and 730 days.");
  }
  const id = crypto.randomUUID();
  const contractActionId = keccak256(stringToHex(id));
  const reference = typeof input.reference === "string" && input.reference.trim()
    ? input.reference.trim().slice(0, 80)
    : isLock ? "Project campaign access" : "Current CoFi product fee";
  const [row] = await getDb().insert(tokenEconomyActions).values({
    id,
    userId,
    projectId,
    kind: input.kind,
    reference,
    amountAtomic: amount.toString(),
    durationDays,
    contractActionId,
    status: "approving",
    metadata: isLock
      ? { unlockAt: Math.floor(Date.now() / 1_000) + durationDays! * 86_400 }
      : {},
  }).returning();
  const tokenAddress = isLock ? addresses.current : ARC_TESTNET.usdcAddress;
  const spender = isLock ? addresses.lockVault : addresses.feeRouter;
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: tokenAddress,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [spender, amount.toString()],
    refId: `current-approve-${row.id}`.slice(0, 100),
  });
  await getDb().update(tokenEconomyActions).set({
    approvalChallengeId: challengeId,
    updatedAt: new Date(),
  }).where(eq(tokenEconomyActions.id, row.id));
  return { actionId: row.id, challengeId, status: "approving" };
}

async function ownedAction(actionId: string, userId: string) {
  const [row] = await getDb().select().from(tokenEconomyActions)
    .where(and(eq(tokenEconomyActions.id, actionId), eq(tokenEconomyActions.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "ECONOMY_ACTION_NOT_FOUND", "This token action was not found.");
  return row;
}

export async function confirmEconomyApproval(
  request: Request,
  session: CurrentSession,
  userId: string,
  actionId: string,
  challengeId: string,
) {
  const row = await ownedAction(actionId, userId);
  if (row.approvalChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This approval does not belong to the token action.");
  }
  const result = await circleChallengeResult(request, session, challengeId);
  if (result.pending) return { ...result, actionId };
  await getDb().update(tokenEconomyActions).set({
    status: "approved",
    updatedAt: new Date(),
  }).where(eq(tokenEconomyActions.id, actionId));
  return { ...result, actionId, status: "approved" };
}

export async function beginEconomyExecution(
  request: Request,
  session: CurrentSession,
  userId: string,
  actionId: string,
) {
  const row = await ownedAction(actionId, userId);
  if (row.status === "confirmed") {
    return { actionId, complete: true, status: "confirmed", transactionHash: row.transactionHash };
  }
  if (row.status !== "approved" && row.status !== "executing") {
    throw new ApiError(409, "ECONOMY_ACTION_NOT_APPROVED", "Complete the asset approval first.");
  }
  const addresses = actionContracts();
  const wallet = arcWallet(session);
  const isLock = row.kind === "project-lock";
  const metadata = row.metadata as Record<string, unknown>;
  const parameters = isLock
    ? {
      contractAddress: addresses.lockVault,
      abiFunctionSignature: "createLock(bytes32,bytes32,address,uint256,uint64)",
      abiParameters: [
        row.contractActionId,
        keccak256(stringToHex(row.projectId ?? "current-project")),
        wallet.address,
        row.amountAtomic,
        String(metadata.unlockAt),
      ],
    }
    : {
      contractAddress: addresses.feeRouter,
      abiFunctionSignature: "routeProductFee(bytes32,uint256)",
      abiParameters: [row.contractActionId, row.amountAtomic],
    };
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    ...parameters,
    refId: `current-execute-${row.id}`.slice(0, 100),
  });
  await getDb().update(tokenEconomyActions).set({
    status: "executing",
    executionChallengeId: challengeId,
    updatedAt: new Date(),
  }).where(eq(tokenEconomyActions.id, row.id));
  return { actionId, challengeId, status: "executing" };
}

export async function confirmEconomyExecution(
  request: Request,
  session: CurrentSession,
  userId: string,
  actionId: string,
  challengeId: string,
) {
  const row = await ownedAction(actionId, userId);
  if (row.executionChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This execution does not belong to the token action.");
  }
  const result = await circleChallengeResult(request, session, challengeId);
  if (result.pending) return { ...result, actionId };
  const updated = await getDb().update(tokenEconomyActions).set({
    status: "confirmed",
    transactionHash: result.transactionHash,
    updatedAt: new Date(),
  }).where(and(
    eq(tokenEconomyActions.id, actionId),
    eq(tokenEconomyActions.status, "executing"),
  )).returning();
  if (updated.length && row.projectId) {
    await queueWebhookEvent(
      row.projectId,
      row.kind === "project-lock" ? "current.locked" : "fee.routed",
      {
        actionId: row.id,
        contractActionId: row.contractActionId,
        amountAtomic: row.amountAtomic,
        transactionHash: result.transactionHash,
        network: ARC_TESTNET.network,
      },
    );
    await deliverQueuedWebhooks(10);
  }
  return { ...result, actionId, status: "confirmed" };
}

function tierForAmount(amountAtomic: string) {
  const amount = BigInt(amountAtomic);
  if (amount >= parseUnits("25000", 18)) return "Current";
  if (amount >= parseUnits("5000", 18)) return "Surge";
  if (amount >= parseUnits("100", 18)) return "Stream";
  return "None";
}

export async function beginAccessActivation(
  request: Request,
  session: CurrentSession,
  userId: string,
  actionId: string,
) {
  const row = await ownedAction(actionId, userId);
  if (row.kind !== "project-lock") {
    throw new ApiError(409, "LOCK_REQUIRED", "Only a confirmed $CURRENT lock can activate project access.");
  }
  if (row.status === "activated") {
    const metadata = row.metadata as Record<string, unknown>;
    return {
      actionId,
      complete: true,
      status: "activated",
      transactionHash: metadata.accessTransactionHash ?? row.transactionHash,
      accessTier: metadata.accessTier,
    };
  }
  if (row.status !== "confirmed" && row.status !== "activating") {
    throw new ApiError(409, "LOCK_NOT_CONFIRMED", "Confirm the $CURRENT lock before activating access.");
  }
  const addresses = actionContracts();
  if (!addresses.accessManager) {
    throw new ApiError(503, "ACCESS_MANAGER_NOT_CONFIGURED", "Project access tiers are not configured.");
  }
  const wallet = arcWallet(session);
  const { challengeId } = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: addresses.accessManager,
    abiFunctionSignature: "syncAccess(bytes32,bytes32)",
    abiParameters: [
      keccak256(stringToHex(row.projectId ?? "current-project")),
      row.contractActionId,
    ],
    refId: `current-access-${row.id}`.slice(0, 100),
  });
  const metadata = row.metadata as Record<string, unknown>;
  await getDb().update(tokenEconomyActions).set({
    status: "activating",
    metadata: { ...metadata, accessChallengeId: challengeId },
    updatedAt: new Date(),
  }).where(eq(tokenEconomyActions.id, row.id));
  return { actionId, challengeId, status: "activating" };
}

export async function confirmAccessActivation(
  request: Request,
  session: CurrentSession,
  userId: string,
  actionId: string,
  challengeId: string,
) {
  const row = await ownedAction(actionId, userId);
  const metadata = row.metadata as Record<string, unknown>;
  if (metadata.accessChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This access activation does not belong to the lock.");
  }
  const result = await circleChallengeResult(request, session, challengeId);
  if (result.pending) return { ...result, actionId };
  const accessTier = tierForAmount(row.amountAtomic);
  const accessExpiresAt = typeof metadata.unlockAt === "number" ? metadata.unlockAt : null;
  const updated = await getDb().update(tokenEconomyActions).set({
    status: "activated",
    metadata: {
      ...metadata,
      accessTier,
      accessExpiresAt,
      accessTransactionHash: result.transactionHash,
    },
    updatedAt: new Date(),
  }).where(and(
    eq(tokenEconomyActions.id, actionId),
    eq(tokenEconomyActions.status, "activating"),
  )).returning();
  if (updated.length && row.projectId) {
    await queueWebhookEvent(row.projectId, "current.access-activated", {
      actionId: row.id,
      contractActionId: row.contractActionId,
      accessTier,
      accessExpiresAt,
      transactionHash: result.transactionHash,
      network: ARC_TESTNET.network,
    });
    await deliverQueuedWebhooks(10);
  }
  return { ...result, actionId, status: "activated", accessTier, accessExpiresAt };
}
