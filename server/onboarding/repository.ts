import { and, count, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys, distributions, pilotEngagements, projectMembers, projects, tokens, users, wallets, webhookEndpoints } from "../db/schema.js";
import { ARC_TESTNET } from "../config.js";
import { ApiError } from "../http.js";

export type SetupCheck = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  required: boolean;
};

export function readinessFromFacts(facts: {
  hasName: boolean;
  hasDescription: boolean;
  hasWebsite: boolean;
  hasWallet: boolean;
  hasProjectToken: boolean;
  campaignCount: number;
  apiKeyCount: number;
  webhookCount: number;
  pilotCount: number;
}) {
  const checks: SetupCheck[] = [
    { id: "identity", label: "Project identity", detail: "A public name, description, and HTTPS website are published.", complete: facts.hasName && facts.hasDescription && facts.hasWebsite, required: true },
    { id: "wallet", label: "Arc wallet", detail: "A user-controlled Circle wallet is available for approvals and settlement.", complete: facts.hasWallet, required: true },
    { id: "token", label: "Project token", detail: "An Arc project token has been inspected onchain. USDC remains available by default.", complete: facts.hasProjectToken, required: false },
    { id: "campaign", label: "Test campaign", detail: "At least one funded or draft distribution proves the activation flow.", complete: facts.campaignCount > 0, required: false },
    { id: "developer", label: "Developer access", detail: "A scoped API key is ready for an integration or AI agent.", complete: facts.apiKeyCount > 0, required: false },
    { id: "webhook", label: "Lifecycle webhooks", detail: "A signed endpoint can receive claim and activation events.", complete: facts.webhookCount > 0, required: false },
    { id: "pilot", label: "Pilot evidence", detail: "A named pilot is tracked for the Circle grant evidence room.", complete: facts.pilotCount > 0, required: false },
  ];
  const score = Math.round((checks.filter((item) => item.complete).length / checks.length) * 100);
  return {
    score,
    stage: score === 100 ? "grant-evidence-ready" : score >= 57 ? "testnet-operating" : score >= 29 ? "foundation-ready" : "setup-required",
    requiredComplete: checks.filter((item) => item.required).every((item) => item.complete),
    completed: checks.filter((item) => item.complete).length,
    total: checks.length,
    checks,
  };
}

export async function projectSetupWorkspace(projectId: string, userId: string) {
  const db = getDb();
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "This project does not exist.");
  const membership = await db.query.projectMembers.findFirst({ where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)) });
  if (!membership) throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot configure this project.");
  const [owner] = await db.select({ id: users.id, displayName: users.displayName, username: users.username })
    .from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "owner"))).limit(1);
  const projectTokens = await db.select().from(tokens).where(and(
    eq(tokens.projectId, projectId),
    eq(tokens.chainCode, ARC_TESTNET.network),
    ne(tokens.contractAddress, ARC_TESTNET.usdcAddress.toLowerCase()),
  ));
  const [[walletsResult], [campaignsResult], [keysResult], [webhooksResult], [pilotsResult]] = await Promise.all([
    db.select({ total: count() }).from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.chainCode, ARC_TESTNET.network))),
    db.select({ total: count() }).from(distributions).where(eq(distributions.projectId, projectId)),
    db.select({ total: count() }).from(apiKeys).where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt))),
    db.select({ total: count() }).from(webhookEndpoints).where(eq(webhookEndpoints.projectId, projectId)),
    db.select({ total: count() }).from(pilotEngagements).where(eq(pilotEngagements.projectId, projectId)),
  ]);
  const facts = {
    hasName: Boolean(project.name && !project.name.endsWith("'s Current")),
    hasDescription: Boolean(project.description && project.description !== "Personal Current CoFi workspace"),
    hasWebsite: Boolean(project.websiteUrl),
    hasWallet: Number(walletsResult?.total ?? 0) > 0,
    hasProjectToken: projectTokens.length > 0,
    campaignCount: Number(campaignsResult?.total ?? 0),
    apiKeyCount: Number(keysResult?.total ?? 0),
    webhookCount: Number(webhooksResult?.total ?? 0),
    pilotCount: Number(pilotsResult?.total ?? 0),
  };
  return {
    project: { id: project.id, slug: project.slug, name: project.name, description: project.description, logoUrl: project.logoUrl, websiteUrl: project.websiteUrl, network: ARC_TESTNET.network },
    owner: owner ? { displayName: owner.displayName ?? owner.username, username: owner.username, role: "owner" as const } : null,
    tokens: projectTokens.map((token) => ({ address: token.contractAddress, symbol: token.symbol, name: token.name, decimals: token.decimals, verified: token.verified, trust: token.metadata.trust ?? null })),
    counts: { campaigns: facts.campaignCount, apiKeys: facts.apiKeyCount, webhooks: facts.webhookCount, pilots: facts.pilotCount },
    readiness: readinessFromFacts(facts),
  };
}
