import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  getAddress,
  hashTypedData,
  padHex,
  recoverAddress,
  type Hex,
} from "viem";
import type { CurrentSession } from "../auth/session.js";
import {
  createUserContractExecutionChallenge,
  createUserTypedDataChallenge,
  createUserWalletChallenge,
  getUserChallenge,
  listUserWallets,
  type CircleWallet,
} from "../circle/client.js";
import { ARC_TESTNET } from "../config.js";
import { getDb } from "../db/client.js";
import {
  distributions,
  gatewayFundingIntents,
  tokens,
} from "../db/schema.js";
import { deliverQueuedWebhooks, queueWebhookEvent } from "../developer/webhooks.js";
import { ApiError } from "../http.js";
import { arcWallet, circleChallengeResult } from "../campaigns/settlement.js";
import { fundingChains } from "../crosschain/chains.js";

export const GATEWAY_API_BASE = "https://gateway-api-testnet.circle.com";
export const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";
export const GATEWAY_MAX_FEE_ATOMIC = "2010000";

export const gatewayChains = [
  {
    code: ARC_TESTNET.network,
    label: "Arc Testnet",
    domain: ARC_TESTNET.gatewayDomain,
    usdcAddress: ARC_TESTNET.usdcAddress,
    explorer: ARC_TESTNET.explorerUrl,
  },
  ...fundingChains,
] as const;

type GatewayBalance = {
  domain: number;
  balance: string;
};

type GatewayTransferResponse = {
  transferId?: string;
  attestation?: Hex;
  signature?: Hex;
};

function gatewayChain(code: string) {
  const chain = gatewayChains.find((item) => item.code === code);
  if (!chain) throw new ApiError(400, "UNSUPPORTED_GATEWAY_CHAIN", "Choose a supported Gateway testnet.");
  return chain;
}

function bytes32(address: string) {
  return padHex(getAddress(address), { size: 32 });
}

export function buildGatewayBurnTypedData(input: {
  sourceDomain: number;
  sourceToken: string;
  sourceDepositor: string;
  destinationRecipient: string;
  value: string;
  maxFee?: string;
  salt?: Hex;
}) {
  const spec = {
    version: 1,
    sourceDomain: input.sourceDomain,
    destinationDomain: ARC_TESTNET.gatewayDomain,
    sourceContract: bytes32(GATEWAY_WALLET_ADDRESS),
    destinationContract: bytes32(GATEWAY_MINTER_ADDRESS),
    sourceToken: bytes32(input.sourceToken),
    destinationToken: bytes32(ARC_TESTNET.usdcAddress),
    sourceDepositor: bytes32(input.sourceDepositor),
    destinationRecipient: bytes32(input.destinationRecipient),
    sourceSigner: bytes32(input.sourceDepositor),
    destinationCaller: bytes32("0x0000000000000000000000000000000000000000"),
    value: input.value,
    salt: input.salt ?? `0x${randomBytes(32).toString("hex")}`,
    hookData: "0x",
  };
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ] as const,
      TransferSpec: [
        { name: "version", type: "uint32" },
        { name: "sourceDomain", type: "uint32" },
        { name: "destinationDomain", type: "uint32" },
        { name: "sourceContract", type: "bytes32" },
        { name: "destinationContract", type: "bytes32" },
        { name: "sourceToken", type: "bytes32" },
        { name: "destinationToken", type: "bytes32" },
        { name: "sourceDepositor", type: "bytes32" },
        { name: "destinationRecipient", type: "bytes32" },
        { name: "sourceSigner", type: "bytes32" },
        { name: "destinationCaller", type: "bytes32" },
        { name: "value", type: "uint256" },
        { name: "salt", type: "bytes32" },
        { name: "hookData", type: "bytes" },
      ] as const,
      BurnIntent: [
        { name: "maxBlockHeight", type: "uint256" },
        { name: "maxFee", type: "uint256" },
        { name: "spec", type: "TransferSpec" },
      ] as const,
    },
    domain: { name: "GatewayWallet", version: "1" } as const,
    primaryType: "BurnIntent" as const,
    message: {
      maxBlockHeight: ((BigInt(1) << BigInt(256)) - BigInt(1)).toString(),
      maxFee: input.maxFee ?? GATEWAY_MAX_FEE_ATOMIC,
      spec,
    },
  };
}

function serialize(row: typeof gatewayFundingIntents.$inferSelect) {
  const source = gatewayChain(row.sourceChain);
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    source: {
      ...source,
      transactionUrl: row.depositTransactionHash
        ? `${source.explorer}/tx/${row.depositTransactionHash}`
        : null,
    },
    destination: {
      code: ARC_TESTNET.network,
      domain: ARC_TESTNET.gatewayDomain,
      explorer: ARC_TESTNET.explorerUrl,
      transactionUrl: row.mintTransactionHash
        ? `${ARC_TESTNET.explorerUrl}/tx/${row.mintTransactionHash}`
        : null,
    },
    stages: [
      { id: "operator", label: "Gateway EOA ready", complete: Boolean(row.sourceWalletId) },
      { id: "deposit", label: "Unified balance funded", complete: Boolean(row.depositTransactionHash) },
      { id: "transfer", label: "Gateway intent attested", complete: Boolean(row.transferId || (row.evidence as Record<string, unknown>).attestation) },
      { id: "arc", label: "USDC minted on Arc", complete: Boolean(row.mintTransactionHash) },
      { id: "vault", label: "Campaign vault funded", complete: row.status === "complete" },
    ],
  };
}

async function ownedUsdcCampaign(distributionId: string, userId: string) {
  const [row] = await getDb().select({
    id: distributions.id,
    projectId: distributions.projectId,
    status: distributions.status,
    amountAtomic: distributions.totalAmountAtomic,
    fundingTxHash: distributions.fundingTxHash,
    tokenAddress: tokens.contractAddress,
    symbol: tokens.symbol,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(eq(distributions.id, distributionId), eq(distributions.creatorUserId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "This campaign was not found.");
  if (row.tokenAddress.toLowerCase() !== ARC_TESTNET.usdcAddress.toLowerCase() && row.symbol.toUpperCase() !== "USDC") {
    throw new ApiError(409, "USDC_GATEWAY_REQUIRED", "Gateway funding currently supports USDC campaigns.");
  }
  return row;
}

async function ownedIntent(intentId: string, userId?: string) {
  if (!userId) throw new ApiError(401, "NOT_AUTHENTICATED", "Sign in to continue.");
  const [row] = await getDb().select({
    intent: gatewayFundingIntents,
    fundingTxHash: distributions.fundingTxHash,
  }).from(gatewayFundingIntents)
    .innerJoin(distributions, eq(distributions.id, gatewayFundingIntents.distributionId))
    .where(and(eq(gatewayFundingIntents.id, intentId), eq(gatewayFundingIntents.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "GATEWAY_INTENT_NOT_FOUND", "This Gateway funding intent was not found.");
  return { ...row.intent, fundingTxHash: row.fundingTxHash };
}

async function gatewayBalances(wallets: CircleWallet[]) {
  const eoaWallets = wallets.filter((wallet) =>
    wallet.accountType === "EOA" && gatewayChains.some((chain) => chain.code === wallet.blockchain)
  );
  if (!eoaWallets.length) return { total: "0", balances: [], wallets: [] };
  const sources = eoaWallets.map((wallet) => ({
    domain: gatewayChain(wallet.blockchain).domain,
    depositor: wallet.address,
  }));
  const response = await fetch(`${GATEWAY_API_BASE}/v1/balances`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "USDC", sources }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    return {
      total: "0",
      balances: [],
      wallets: eoaWallets,
      unavailable: true,
      reason: "Gateway balance service is temporarily unavailable.",
    };
  }
  const payload = await response.json() as { balances?: GatewayBalance[] };
  const balances = (payload.balances ?? []).map((balance) => {
    const chain = gatewayChains.find((item) => item.domain === balance.domain);
    return { ...balance, chain: chain?.code ?? `DOMAIN-${balance.domain}`, label: chain?.label ?? `Domain ${balance.domain}` };
  });
  const total = balances.reduce((sum, balance) => sum + Number(balance.balance), 0);
  return { total: total.toFixed(6), balances, wallets: eoaWallets };
}

export function gatewayCatalog() {
  return {
    sourceChains: gatewayChains,
    destination: {
      code: ARC_TESTNET.network,
      domain: ARC_TESTNET.gatewayDomain,
      usdcAddress: ARC_TESTNET.usdcAddress,
    },
    contracts: {
      wallet: GATEWAY_WALLET_ADDRESS,
      minter: GATEWAY_MINTER_ADDRESS,
    },
    transport: "Circle Gateway Unified Balance + Direct Mint",
    signerRequirement: "EOA",
    maxFeeAtomic: GATEWAY_MAX_FEE_ATOMIC,
  };
}

export async function gatewayFundingState(userId: string, wallets: CircleWallet[]) {
  const rows = await getDb().select().from(gatewayFundingIntents)
    .where(eq(gatewayFundingIntents.userId, userId))
    .orderBy(desc(gatewayFundingIntents.createdAt))
    .limit(50);
  return {
    catalog: gatewayCatalog(),
    unifiedBalance: await gatewayBalances(wallets),
    intents: rows.map(serialize),
  };
}

export async function listProjectGatewayFunding(projectId: string) {
  const rows = await getDb().select().from(gatewayFundingIntents)
    .where(eq(gatewayFundingIntents.projectId, projectId))
    .orderBy(desc(gatewayFundingIntents.createdAt))
    .limit(100);
  return { catalog: gatewayCatalog(), intents: rows.map(serialize) };
}

export async function createGatewayFundingIntent(
  userId: string,
  session: CurrentSession,
  distributionId: string,
  sourceChainCode: string,
  idempotencyKey: string,
) {
  const campaign = await ownedUsdcCampaign(distributionId, userId);
  if (campaign.status !== "awaiting_funding") {
    throw new ApiError(409, "CAMPAIGN_NOT_FUNDABLE", "Choose a USDC campaign that is awaiting funding.");
  }
  const source = gatewayChain(sourceChainCode);
  const destination = arcWallet(session);
  const [row] = await getDb().insert(gatewayFundingIntents).values({
    projectId: campaign.projectId,
    distributionId,
    userId,
    sourceChain: source.code,
    sourceDomain: source.domain,
    sourceUsdcAddress: source.usdcAddress.toLowerCase(),
    destinationAddress: destination.address.toLowerCase(),
    amountAtomic: campaign.amountAtomic,
    maxFeeAtomic: GATEWAY_MAX_FEE_ATOMIC,
    idempotencyKey,
    evidence: {
      circleRoute: "Gateway Unified Balance + Direct Mint",
      signerRequirement: "EOA",
      destinationWalletType: destination.accountType,
      createdAt: new Date().toISOString(),
    },
  }).onConflictDoNothing().returning();
  const intent = row ?? await getDb().query.gatewayFundingIntents.findFirst({
    where: and(
      eq(gatewayFundingIntents.projectId, campaign.projectId),
      eq(gatewayFundingIntents.idempotencyKey, idempotencyKey),
    ),
  });
  if (!intent) throw new ApiError(409, "GATEWAY_INTENT_CONFLICT", "This Gateway route could not be created.");
  await queueWebhookEvent(campaign.projectId, "gateway.funding.created", {
    intentId: intent.id,
    distributionId,
    sourceChain: source.code,
    destinationChain: ARC_TESTNET.network,
    amountAtomic: campaign.amountAtomic,
  });
  await deliverQueuedWebhooks(10);
  return serialize(intent);
}

export async function prepareGatewayWallet(
  request: Request,
  session: CurrentSession,
  intentId: string,
  challengeId?: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const existing = session.wallets.find((wallet) =>
    wallet.blockchain === intent.sourceChain && wallet.accountType === "EOA"
  );
  if (existing) {
    const [updated] = await getDb().update(gatewayFundingIntents).set({
      sourceWalletId: existing.id,
      sourceWalletAddress: existing.address.toLowerCase(),
      status: "wallet_ready",
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
    return { complete: true, wallet: existing, wallets: session.wallets, intent: serialize(updated) };
  }
  if (!challengeId) {
    const challenge = await createUserWalletChallenge(request, session.userToken, intent.sourceChain, "EOA");
    await getDb().update(gatewayFundingIntents).set({
      walletChallengeId: challenge.challengeId,
      status: "wallet_authorizing",
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id));
    return { complete: false, challengeId: challenge.challengeId };
  }
  if (intent.walletChallengeId !== challengeId) {
    throw new ApiError(403, "CHALLENGE_MISMATCH", "This EOA wallet action does not belong to the Gateway route.");
  }
  const result = await getUserChallenge(request, session.userToken, challengeId);
  if (result.status !== "COMPLETE" && result.status !== "COMPLETED") {
    return { pending: true, challengeStatus: result.status };
  }
  const wallets = await listUserWallets(request, session.userToken);
  const wallet = wallets.find((item) =>
    item.blockchain === intent.sourceChain && item.accountType === "EOA"
  );
  if (!wallet) return { pending: true, challengeStatus: result.status };
  const [updated] = await getDb().update(gatewayFundingIntents).set({
    sourceWalletId: wallet.id,
    sourceWalletAddress: wallet.address.toLowerCase(),
    status: "wallet_ready",
    updatedAt: new Date(),
  }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
  return { complete: true, wallet, wallets, intent: serialize(updated) };
}

export async function prepareGatewayDeposit(
  request: Request,
  session: CurrentSession,
  intentId: string,
  action: "approve" | "deposit",
  challengeId?: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const wallet = session.wallets.find((item) =>
    item.id === intent.sourceWalletId && item.accountType === "EOA"
  );
  if (!wallet) throw new ApiError(409, "GATEWAY_EOA_REQUIRED", "Create the Gateway EOA operator wallet first.");
  if (challengeId) {
    const expected = action === "approve" ? intent.approvalChallengeId : intent.depositChallengeId;
    if (expected !== challengeId) {
      throw new ApiError(403, "CHALLENGE_MISMATCH", "This deposit action does not belong to the Gateway route.");
    }
    const result = await circleChallengeResult(request, session, challengeId);
    if (result.pending) return result;
    const [updated] = await getDb().update(gatewayFundingIntents).set({
      status: action === "approve" ? "approved" : "deposited",
      ...(action === "deposit" ? { depositTransactionHash: result.transactionHash } : {}),
      evidence: {
        ...(intent.evidence as Record<string, unknown>),
        [`${action}TransactionHash`]: result.transactionHash,
      },
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
    if (action === "deposit") {
      await queueWebhookEvent(intent.projectId, "gateway.funding.deposited", {
        intentId: intent.id,
        distributionId: intent.distributionId,
        sourceChain: intent.sourceChain,
        transactionHash: result.transactionHash,
      });
      await deliverQueuedWebhooks(10);
    }
    return { ...result, intent: serialize(updated) };
  }
  const depositAtomic = (BigInt(intent.amountAtomic) + BigInt(intent.maxFeeAtomic)).toString();
  const challenge = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: wallet.id,
    contractAddress: action === "approve" ? intent.sourceUsdcAddress : GATEWAY_WALLET_ADDRESS,
    abiFunctionSignature: action === "approve" ? "approve(address,uint256)" : "deposit(address,uint256)",
    abiParameters: action === "approve"
      ? [GATEWAY_WALLET_ADDRESS, depositAtomic]
      : [intent.sourceUsdcAddress, depositAtomic],
    refId: `gateway-${action}-${intent.id}`.slice(0, 100),
  });
  await getDb().update(gatewayFundingIntents).set({
    status: action === "approve" ? "approving" : "deposit_authorizing",
    ...(action === "approve"
      ? { approvalChallengeId: challenge.challengeId }
      : { depositChallengeId: challenge.challengeId }),
    updatedAt: new Date(),
  }).where(eq(gatewayFundingIntents.id, intent.id));
  return { complete: false, action, challengeId: challenge.challengeId };
}

export async function prepareGatewaySignature(
  request: Request,
  session: CurrentSession,
  intentId: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const wallet = session.wallets.find((item) =>
    item.id === intent.sourceWalletId && item.accountType === "EOA"
  );
  if (!wallet || !intent.sourceWalletAddress) {
    throw new ApiError(409, "GATEWAY_EOA_REQUIRED", "Create the Gateway EOA operator wallet first.");
  }
  if (!intent.depositTransactionHash) {
    throw new ApiError(409, "GATEWAY_DEPOSIT_REQUIRED", "Complete the Gateway deposit before signing the transfer.");
  }
  const typedData = buildGatewayBurnTypedData({
    sourceDomain: intent.sourceDomain,
    sourceToken: intent.sourceUsdcAddress,
    sourceDepositor: wallet.address,
    destinationRecipient: intent.destinationAddress,
    value: intent.amountAtomic,
    maxFee: intent.maxFeeAtomic,
  });
  const challenge = await createUserTypedDataChallenge(request, session.userToken, {
    walletId: wallet.id,
    data: typedData,
    memo: `Move ${Number(intent.amountAtomic) / 1_000_000} USDC from Gateway to Arc`,
  });
  await getDb().update(gatewayFundingIntents).set({
    signChallengeId: challenge.challengeId,
    typedData,
    status: "signature_authorizing",
    updatedAt: new Date(),
  }).where(eq(gatewayFundingIntents.id, intent.id));
  return { complete: false, action: "sign", challengeId: challenge.challengeId };
}

export async function submitGatewayTransfer(userId: string, intentId: string, signature: string) {
  const intent = await ownedIntent(intentId, userId);
  if (!intent.typedData || !intent.sourceWalletAddress) {
    throw new ApiError(409, "GATEWAY_SIGNATURE_NOT_PREPARED", "Prepare the Gateway transfer signature first.");
  }
  const typedData = intent.typedData as ReturnType<typeof buildGatewayBurnTypedData>;
  const recovered = await recoverAddress({
    hash: hashTypedData(typedData as unknown as Parameters<typeof hashTypedData>[0]),
    signature: signature as Hex,
  });
  if (recovered.toLowerCase() !== intent.sourceWalletAddress.toLowerCase()) {
    throw new ApiError(403, "INVALID_GATEWAY_SIGNATURE", "The transfer signature does not match the Gateway EOA.");
  }
  const response = await fetch(`${GATEWAY_API_BASE}/v1/transfer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([{ burnIntent: typedData.message, signature }]),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const message = await response.text();
    await getDb().update(gatewayFundingIntents).set({
      failureCode: `GATEWAY_${response.status}`,
      evidence: { ...(intent.evidence as Record<string, unknown>), gatewayError: message.slice(0, 500) },
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id));
    throw new ApiError(502, "GATEWAY_TRANSFER_REJECTED", "Circle Gateway rejected this transfer intent.");
  }
  const payload = await response.json() as GatewayTransferResponse;
  if (!payload.attestation || !payload.signature) {
    throw new ApiError(502, "GATEWAY_ATTESTATION_MISSING", "Circle Gateway did not return a mint attestation.");
  }
  const [updated] = await getDb().update(gatewayFundingIntents).set({
    transferId: payload.transferId ?? `direct-${intent.id}`,
    status: "attested",
    evidence: {
      ...(intent.evidence as Record<string, unknown>),
      attestation: payload.attestation,
      operatorSignature: payload.signature,
      signedBy: recovered.toLowerCase(),
      attestedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
  await queueWebhookEvent(intent.projectId, "gateway.funding.attested", {
    intentId: intent.id,
    distributionId: intent.distributionId,
    transferId: updated.transferId,
  });
  await deliverQueuedWebhooks(10);
  return serialize(updated);
}

export async function prepareGatewayMint(
  request: Request,
  session: CurrentSession,
  intentId: string,
  challengeId?: string,
) {
  const intent = await ownedIntent(intentId, session.accountId);
  const evidence = intent.evidence as Record<string, unknown>;
  if (challengeId) {
    if (intent.mintChallengeId !== challengeId) {
      throw new ApiError(403, "CHALLENGE_MISMATCH", "This mint action does not belong to the Gateway route.");
    }
    const result = await circleChallengeResult(request, session, challengeId);
    if (result.pending) return result;
    const [updated] = await getDb().update(gatewayFundingIntents).set({
      mintTransactionHash: result.transactionHash,
      status: "arc_arrived",
      evidence: { ...evidence, mintTransactionHash: result.transactionHash },
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
    await queueWebhookEvent(intent.projectId, "gateway.funding.arc-arrived", {
      intentId: intent.id,
      distributionId: intent.distributionId,
      transactionHash: result.transactionHash,
    });
    await deliverQueuedWebhooks(10);
    return { ...result, intent: serialize(updated) };
  }
  const attestation = evidence.attestation;
  const operatorSignature = evidence.operatorSignature;
  if (typeof attestation !== "string" || typeof operatorSignature !== "string") {
    throw new ApiError(409, "GATEWAY_ATTESTATION_REQUIRED", "Submit the signed Gateway intent before minting on Arc.");
  }
  const destination = arcWallet(session);
  const challenge = await createUserContractExecutionChallenge(request, session.userToken, {
    walletId: destination.id,
    contractAddress: GATEWAY_MINTER_ADDRESS,
    abiFunctionSignature: "gatewayMint(bytes,bytes)",
    abiParameters: [attestation, operatorSignature],
    refId: `gateway-mint-${intent.id}`.slice(0, 100),
  });
  await getDb().update(gatewayFundingIntents).set({
    mintChallengeId: challenge.challengeId,
    status: "mint_authorizing",
    updatedAt: new Date(),
  }).where(eq(gatewayFundingIntents.id, intent.id));
  return { complete: false, action: "mint", challengeId: challenge.challengeId };
}

export async function syncGatewayFunding(userId: string, intentId: string) {
  const intent = await ownedIntent(intentId, userId);
  if (intent.status === "complete") return serialize(intent);
  if (intent.mintTransactionHash && intent.fundingTxHash) {
    const [updated] = await getDb().update(gatewayFundingIntents).set({
      campaignFundingTransactionHash: intent.fundingTxHash,
      status: "complete",
      updatedAt: new Date(),
    }).where(eq(gatewayFundingIntents.id, intent.id)).returning();
    await queueWebhookEvent(intent.projectId, "gateway.funding.campaign-funded", {
      intentId: intent.id,
      distributionId: intent.distributionId,
      transactionHash: intent.fundingTxHash,
    });
    await deliverQueuedWebhooks(10);
    return serialize(updated);
  }
  return serialize(intent);
}
