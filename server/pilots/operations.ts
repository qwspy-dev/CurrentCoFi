import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  activationEvents,
  allocations,
  auditEvents,
  claims,
  distributions,
  pilotAttestations,
  pilotApplications,
  pilotEngagements,
  pilotInvitations,
  projectMembers,
  projects,
  tokens,
} from "../db/schema.js";
import { ApiError } from "../http.js";
import { constantTimeEqual, openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";

const PILOT_STATEMENT =
  "I confirm that this organization is participating in the described Current CoFi pilot and that the reported goals and results are accurate to the best of my knowledge.";
const INTEGRATION_MODES = new Set(["hosted-links", "react-embed", "server-sdk", "agent-api"]);
const INTEGRATIONS = new Set([
  "circle-wallets", "gas-sponsorship", "project-token", "usdc",
  "identity-attestations", "referrals", "activation-webhooks", "agent-api",
]);
const APPLICATION_STATUSES = new Set(["submitted", "accepted", "declined"]);

export function pilotReadiness(input: {
  brief: boolean;
  integrations: boolean;
  campaign: boolean;
  funding: boolean;
  claims: boolean;
  activations: boolean;
  attestation: boolean;
}) {
  const completed = Object.values(input).filter(Boolean).length;
  return {
    completed,
    total: 7,
    score: Math.round((completed / 7) * 100),
    lifecycle: input.attestation && input.activations
      ? "complete"
      : input.activations
        ? "measuring"
        : input.funding
          ? "live"
          : input.campaign
            ? "ready"
            : "onboarding",
  } as const;
}

export function pilotApplicationReadiness(input: {
  website: boolean;
  audience: boolean;
  recipients: number;
  integrations: number;
  activationMeasurement: boolean;
}) {
  const checks = [input.website, input.audience, input.recipients >= 25, input.integrations >= 2, input.activationMeasurement];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, score: Math.round((completed / checks.length) * 100) };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function text(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, "INVALID_PILOT", `${field} is required and must be ${max} characters or fewer.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return null;
  return text(value, field, max);
}

function percentageBps(value: unknown, field: string, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new ApiError(400, "INVALID_PILOT", `${field} must be between 0 and 100.`);
  }
  return Math.round(number * 100);
}

function recipientTarget(value: unknown) {
  const number = Number(value ?? 100);
  if (!Number.isInteger(number) || number < 1 || number > 1_000_000) {
    throw new ApiError(400, "INVALID_PILOT", "targetRecipients must be between 1 and 1,000,000.");
  }
  return number;
}

function dateValue(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(400, "INVALID_PILOT", `${field} must be an ISO date.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "INVALID_PILOT", `${field} must be an ISO date.`);
  return date;
}

function integrationList(value: unknown) {
  if (value === undefined) return ["circle-wallets", "gas-sponsorship", "usdc"];
  if (!Array.isArray(value) || value.length > 20) {
    throw new ApiError(400, "INVALID_PILOT", "requestedIntegrations must be an array.");
  }
  return [...new Set(value.map(String).filter((item) => INTEGRATIONS.has(item)))];
}

async function requireProjectAccess(userId: string, projectId: string) {
  const membership = await getDb().query.projectMembers.findFirst({
    where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)),
  });
  if (!membership || !["owner", "admin", "operator"].includes(membership.role)) {
    throw new ApiError(403, "PROJECT_ACCESS_DENIED", "You cannot manage pilots for this project.");
  }
}

async function pilotRow(projectId: string, pilotId: string) {
  const row = await getDb().query.pilotEngagements.findFirst({
    where: and(eq(pilotEngagements.id, pilotId), eq(pilotEngagements.projectId, projectId)),
  });
  if (!row) throw new ApiError(404, "PILOT_NOT_FOUND", "This pilot is unavailable.");
  return row;
}

function invitationExpired(row: typeof pilotInvitations.$inferSelect) {
  return row.status !== "active" || Boolean(row.expiresAt && row.expiresAt.getTime() <= Date.now());
}

function presentInvitation(row: typeof pilotInvitations.$inferSelect, applicationCount = 0) {
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    name: row.name,
    summary: row.summary,
    status: invitationExpired(row) ? "closed" : row.status,
    integrationMode: row.integrationMode,
    requestedIntegrations: row.requestedIntegrations as string[],
    targetRecipients: row.targetRecipients,
    maxApplications: row.maxApplications,
    applicationCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function presentApplication(row: typeof pilotApplications.$inferSelect, includeContact = false) {
  const invitation = await getDb().query.pilotInvitations.findFirst({ where: eq(pilotInvitations.id, row.invitationId) });
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    invitation: invitation ? { publicSlug: invitation.publicSlug, name: invitation.name } : null,
    organizationName: row.organizationName,
    websiteUrl: row.websiteUrl,
    applicantName: row.applicantName,
    applicantRole: row.applicantRole,
    contact: includeContact ? await openSecret(row.contactCiphertext) : undefined,
    useCase: row.useCase,
    audienceDescription: row.audienceDescription,
    expectedRecipients: row.expectedRecipients,
    integrationMode: row.integrationMode,
    requestedIntegrations: row.requestedIntegrations as string[],
    readiness: row.readiness,
    status: row.status,
    reviewNotes: row.reviewNotes,
    pilotId: row.pilotId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function campaignProof(distributionId: string | null) {
  if (!distributionId) return null;
  const db = getDb();
  const row = await db.select({
    id: distributions.id,
    name: distributions.name,
    status: distributions.status,
    recipientCount: distributions.recipientCount,
    fundingTxHash: distributions.fundingTxHash,
    merkleRoot: distributions.merkleRoot,
    asset: tokens.symbol,
  }).from(distributions)
    .innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(eq(distributions.id, distributionId))
    .limit(1);
  if (!row[0]) return null;
  const [claimRows, activationRows] = await Promise.all([
    db.select({ total: count() }).from(claims)
      .innerJoin(allocations, eq(allocations.id, claims.allocationId))
      .where(and(eq(allocations.distributionId, distributionId), eq(claims.status, "confirmed"))),
    db.select({ total: count() }).from(activationEvents)
      .where(eq(activationEvents.distributionId, distributionId)),
  ]);
  const claimsTotal = Number(claimRows[0]?.total ?? 0);
  const activationsTotal = Number(activationRows[0]?.total ?? 0);
  return {
    ...row[0],
    claims: claimsTotal,
    activations: activationsTotal,
    claimRate: row[0].recipientCount
      ? Math.round((claimsTotal / row[0].recipientCount) * 10_000) / 100
      : 0,
    activationRate: claimsTotal
      ? Math.round((activationsTotal / claimsTotal) * 10_000) / 100
      : 0,
  };
}

async function presentPilot(row: typeof pilotEngagements.$inferSelect) {
  const [campaign, attestation] = await Promise.all([
    campaignProof(row.distributionId),
    getDb().query.pilotAttestations.findFirst({
      where: eq(pilotAttestations.pilotId, row.id),
    }),
  ]);
  const integrations = row.requestedIntegrations as string[];
  const milestones = [
    { id: "brief", label: "Pilot brief approved", passed: Boolean(row.partnerName && row.useCase), evidence: row.useCase },
    { id: "integration", label: "Integration scope selected", passed: integrations.length > 0, evidence: integrations.join(", ") || "Not selected" },
    { id: "campaign", label: "Campaign linked", passed: Boolean(campaign), evidence: campaign?.name ?? "No campaign linked" },
    { id: "funding", label: "Arc funding anchored", passed: Boolean(campaign?.fundingTxHash), evidence: campaign?.fundingTxHash ?? "Funding transaction pending" },
    { id: "claims", label: "Walletless claims settled", passed: Boolean(campaign?.claims), evidence: `${campaign?.claims ?? 0} confirmed claim${campaign?.claims === 1 ? "" : "s"}` },
    { id: "activation", label: "Post-claim activation proven", passed: Boolean(campaign?.activations), evidence: `${campaign?.activations ?? 0} activation${campaign?.activations === 1 ? "" : "s"}` },
    { id: "attestation", label: "Partner attestation signed", passed: Boolean(attestation), evidence: attestation ? `${attestation.signerName}, ${attestation.signerRole}` : "Awaiting partner confirmation" },
  ];
  const readiness = pilotReadiness({
    brief: milestones[0].passed,
    integrations: milestones[1].passed,
    campaign: milestones[2].passed,
    funding: milestones[3].passed,
    claims: milestones[4].passed,
    activations: milestones[5].passed,
    attestation: milestones[6].passed,
  });
  const targetMet = Boolean(
    campaign &&
    campaign.claimRate >= row.targetClaimRateBps / 100 &&
    campaign.activationRate >= row.targetActivationRateBps / 100,
  );
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    partnerName: row.partnerName,
    partnerWebsite: row.partnerWebsite,
    useCase: row.useCase,
    status: readiness.lifecycle,
    integrationMode: row.integrationMode,
    requestedIntegrations: integrations,
    targets: {
      recipients: row.targetRecipients,
      claimRate: row.targetClaimRateBps / 100,
      activationRate: row.targetActivationRateBps / 100,
    },
    successCriteria: row.successCriteria,
    notes: row.notes,
    readinessScore: readiness.score,
    targetMet,
    milestones,
    campaign,
    attestation: attestation ? {
      signerName: attestation.signerName,
      signerRole: attestation.signerRole,
      statement: attestation.statement,
      digest: attestation.digest,
      attestedAt: attestation.attestedAt.toISOString(),
    } : null,
    startsAt: row.startsAt?.toISOString() ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPilot(input: {
  projectId: string;
  ownerUserId?: string;
  actorKeyId?: string;
  body: Record<string, unknown>;
}) {
  const partnerName = text(input.body.partnerName, "partnerName", 100);
  const partnerWebsite = optionalText(input.body.partnerWebsite, "partnerWebsite", 500);
  if (partnerWebsite) {
    try {
      const url = new URL(partnerWebsite);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      throw new ApiError(400, "INVALID_PILOT", "partnerWebsite must be a valid HTTP URL.");
    }
  }
  const useCase = text(input.body.useCase, "useCase", 1_000);
  const integrationMode = String(input.body.integrationMode ?? "hosted-links");
  if (!INTEGRATION_MODES.has(integrationMode)) {
    throw new ApiError(400, "INVALID_PILOT", "integrationMode is unsupported.");
  }
  const dueAt = dateValue(input.body.dueAt, "dueAt");
  const [pilot] = await getDb().insert(pilotEngagements).values({
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    publicSlug: `pilot_${randomSecret(18)}`,
    partnerName,
    partnerWebsite,
    useCase,
    integrationMode,
    targetRecipients: recipientTarget(input.body.targetRecipients),
    targetClaimRateBps: percentageBps(input.body.targetClaimRate, "targetClaimRate", 5_000),
    targetActivationRateBps: percentageBps(input.body.targetActivationRate, "targetActivationRate", 2_500),
    requestedIntegrations: integrationList(input.body.requestedIntegrations),
    successCriteria: input.body.successCriteria && typeof input.body.successCriteria === "object"
      ? input.body.successCriteria as Record<string, unknown>
      : {},
    notes: optionalText(input.body.notes, "notes", 4_000),
    startsAt: new Date(),
    dueAt,
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user",
    actorId: input.actorKeyId ?? input.ownerUserId,
    projectId: input.projectId,
    action: "pilot.created",
    resourceType: "pilot",
    resourceId: pilot.id,
    metadata: { partnerName, integrationMode },
  });
  return presentPilot(pilot);
}

export async function updatePilot(input: {
  projectId: string;
  userId?: string;
  actorKeyId?: string;
  pilotId: string;
  body: Record<string, unknown>;
}) {
  const current = await pilotRow(input.projectId, input.pilotId);
  const updates: Partial<typeof pilotEngagements.$inferInsert> = { updatedAt: new Date() };
  if ("distributionId" in input.body) {
    const distributionId = optionalText(input.body.distributionId, "distributionId", 36);
    if (distributionId) {
      const campaign = await getDb().query.distributions.findFirst({
        where: and(eq(distributions.id, distributionId), eq(distributions.projectId, input.projectId)),
      });
      if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "The selected campaign is unavailable.");
    }
    updates.distributionId = distributionId;
  }
  if ("notes" in input.body) updates.notes = optionalText(input.body.notes, "notes", 4_000);
  if ("dueAt" in input.body) updates.dueAt = dateValue(input.body.dueAt, "dueAt");
  if ("requestedIntegrations" in input.body) updates.requestedIntegrations = integrationList(input.body.requestedIntegrations);
  const [pilot] = await getDb().update(pilotEngagements).set(updates)
    .where(eq(pilotEngagements.id, current.id)).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user",
    actorId: input.actorKeyId ?? input.userId,
    projectId: input.projectId,
    action: "pilot.updated",
    resourceType: "pilot",
    resourceId: pilot.id,
    metadata: { distributionId: pilot.distributionId },
  });
  return presentPilot(pilot);
}

export async function listProjectPilots(projectId: string) {
  const rows = await getDb().select().from(pilotEngagements)
    .where(eq(pilotEngagements.projectId, projectId))
    .orderBy(desc(pilotEngagements.createdAt))
    .limit(100);
  return Promise.all(rows.map(presentPilot));
}

export async function listUserPilots(userId: string) {
  const memberships = await getDb().select({ projectId: projectMembers.projectId })
    .from(projectMembers).where(eq(projectMembers.userId, userId));
  const groups = await Promise.all(memberships.map(({ projectId }) => listProjectPilots(projectId)));
  return groups.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createUserPilot(input: {
  userId: string;
  projectId: string;
  body: Record<string, unknown>;
}) {
  await requireProjectAccess(input.userId, input.projectId);
  return createPilot({ projectId: input.projectId, ownerUserId: input.userId, body: input.body });
}

export async function updateUserPilot(input: {
  userId: string;
  projectId: string;
  pilotId: string;
  body: Record<string, unknown>;
}) {
  await requireProjectAccess(input.userId, input.projectId);
  return updatePilot({ ...input });
}

export async function createPilotInvitation(input: {
  userId?: string;
  actorKeyId?: string;
  projectId: string;
  body: Record<string, unknown>;
}) {
  if (input.userId) await requireProjectAccess(input.userId, input.projectId);
  if (!input.userId && !input.actorKeyId) throw new ApiError(401, "PILOT_ACTOR_REQUIRED", "A user or developer key is required.");
  const integrationMode = String(input.body.integrationMode ?? "hosted-links");
  if (!INTEGRATION_MODES.has(integrationMode)) throw new ApiError(400, "INVALID_INVITATION", "integrationMode is unsupported.");
  const maxApplications = Number(input.body.maxApplications ?? 25);
  if (!Number.isInteger(maxApplications) || maxApplications < 1 || maxApplications > 1_000) {
    throw new ApiError(400, "INVALID_INVITATION", "maxApplications must be between 1 and 1,000.");
  }
  const expiresAt = dateValue(input.body.expiresAt, "expiresAt");
  if (expiresAt && expiresAt.getTime() <= Date.now()) throw new ApiError(400, "INVALID_INVITATION", "expiresAt must be in the future.");
  const [row] = await getDb().insert(pilotInvitations).values({
    projectId: input.projectId,
    createdByUserId: input.userId,
    publicSlug: `invite_${randomSecret(18)}`,
    name: text(input.body.name, "name", 120),
    summary: text(input.body.summary, "summary", 1_500),
    integrationMode,
    requestedIntegrations: integrationList(input.body.requestedIntegrations),
    targetRecipients: recipientTarget(input.body.targetRecipients),
    maxApplications,
    expiresAt,
  }).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId, projectId: input.projectId,
    action: "pilot.invitation-created", resourceType: "pilot-invitation", resourceId: row.id,
    metadata: { publicSlug: row.publicSlug, maxApplications },
  });
  return presentInvitation(row, 0);
}

export async function listPilotPipeline(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId);
  return listProjectPilotPipeline(projectId);
}

export async function listProjectPilotPipeline(projectId: string) {
  const [invites, applications] = await Promise.all([
    getDb().select().from(pilotInvitations).where(eq(pilotInvitations.projectId, projectId)).orderBy(desc(pilotInvitations.createdAt)).limit(100),
    getDb().select().from(pilotApplications).where(eq(pilotApplications.projectId, projectId)).orderBy(desc(pilotApplications.createdAt)).limit(200),
  ]);
  const counts = new Map<string, number>();
  for (const application of applications) counts.set(application.invitationId, (counts.get(application.invitationId) ?? 0) + 1);
  return {
    invitations: invites.map((row) => presentInvitation(row, counts.get(row.id) ?? 0)),
    applications: await Promise.all(applications.map((row) => presentApplication(row, true))),
  };
}

export async function getPublicPilotInvitation(publicSlug: string) {
  const row = await getDb().query.pilotInvitations.findFirst({ where: eq(pilotInvitations.publicSlug, publicSlug) });
  if (!row || invitationExpired(row)) throw new ApiError(404, "PILOT_INVITATION_NOT_FOUND", "This pilot application is closed or unavailable.");
  const [project, applications] = await Promise.all([
    getDb().query.projects.findFirst({ where: eq(projects.id, row.projectId) }),
    getDb().select({ total: count() }).from(pilotApplications).where(eq(pilotApplications.invitationId, row.id)),
  ]);
  const applicationCount = Number(applications[0]?.total ?? 0);
  if (applicationCount >= row.maxApplications) throw new ApiError(409, "PILOT_INVITATION_FULL", "This pilot intake has reached its application limit.");
  return { project: { name: project?.name ?? "Current CoFi", websiteUrl: project?.websiteUrl ?? null }, invitation: presentInvitation(row, applicationCount) };
}

export async function submitPilotApplication(publicSlug: string, body: Record<string, unknown>) {
  const invitation = await getDb().query.pilotInvitations.findFirst({ where: eq(pilotInvitations.publicSlug, publicSlug) });
  if (!invitation || invitationExpired(invitation)) throw new ApiError(404, "PILOT_INVITATION_NOT_FOUND", "This pilot application is closed or unavailable.");
  if (body.website === "current-cofi-pilot") throw new ApiError(400, "AUTOMATED_SUBMISSION_REJECTED", "The application could not be accepted.");
  const [{ total }] = await getDb().select({ total: count() }).from(pilotApplications).where(eq(pilotApplications.invitationId, invitation.id));
  if (Number(total) >= invitation.maxApplications) throw new ApiError(409, "PILOT_INVITATION_FULL", "This pilot intake has reached its application limit.");
  const contact = text(body.contact, "contact", 320).toLowerCase();
  const contactHash = await sha256(`${invitation.id}:${contact}`);
  const websiteUrl = optionalText(body.websiteUrl, "websiteUrl", 500);
  if (websiteUrl) {
    try { const url = new URL(websiteUrl); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
    catch { throw new ApiError(400, "INVALID_APPLICATION", "websiteUrl must be a valid HTTP URL."); }
  }
  const requestedIntegrations = integrationList(body.requestedIntegrations ?? invitation.requestedIntegrations);
  const expectedRecipients = recipientTarget(body.expectedRecipients ?? invitation.targetRecipients);
  const useCase = text(body.useCase, "useCase", 2_000);
  const audienceDescription = text(body.audienceDescription, "audienceDescription", 1_500);
  const readiness = pilotApplicationReadiness({
    website: Boolean(websiteUrl), audience: audienceDescription.length >= 40,
    recipients: expectedRecipients, integrations: requestedIntegrations.length,
    activationMeasurement: /activat|retain|return|conversion|event|purchase|play/i.test(useCase),
  });
  const statusSecret = randomSecret(32);
  try {
    const [row] = await getDb().insert(pilotApplications).values({
      invitationId: invitation.id, projectId: invitation.projectId,
      publicSlug: `application_${randomSecret(18)}`,
      organizationName: text(body.organizationName, "organizationName", 120),
      websiteUrl,
      applicantName: text(body.applicantName, "applicantName", 120),
      applicantRole: text(body.applicantRole, "applicantRole", 120),
      contactHash, contactCiphertext: await sealSecret(contact), statusSecretHash: await sha256(statusSecret),
      useCase, audienceDescription, expectedRecipients,
      integrationMode: invitation.integrationMode,
      requestedIntegrations, readiness,
    }).returning();
    await getDb().insert(auditEvents).values({
      actorType: "pilot-applicant", actorId: contactHash.slice(0, 20), projectId: invitation.projectId,
      action: "pilot.application-submitted", resourceType: "pilot-application", resourceId: row.id,
      metadata: { invitationId: invitation.id, readinessScore: readiness.score },
    });
    return { application: await presentApplication(row), statusSecret };
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) throw new ApiError(409, "APPLICATION_ALREADY_EXISTS", "This contact already submitted an application for the pilot.");
    throw error;
  }
}

export async function getPilotApplicationStatus(publicSlug: string, secret: string) {
  const row = await getDb().query.pilotApplications.findFirst({ where: eq(pilotApplications.publicSlug, publicSlug) });
  if (!row || !constantTimeEqual(await sha256(secret), row.statusSecretHash)) throw new ApiError(404, "APPLICATION_NOT_FOUND", "The application reference or secret is invalid.");
  return presentApplication(row);
}

export async function reviewPilotApplication(input: {
  userId?: string; actorKeyId?: string; projectId: string; applicationId: string; status: string; reviewNotes?: unknown;
}) {
  if (input.userId) await requireProjectAccess(input.userId, input.projectId);
  if (!input.userId && !input.actorKeyId) throw new ApiError(401, "PILOT_ACTOR_REQUIRED", "A user or developer key is required.");
  if (!APPLICATION_STATUSES.has(input.status) || input.status === "submitted") throw new ApiError(400, "INVALID_REVIEW", "Use accepted or declined.");
  const row = await getDb().query.pilotApplications.findFirst({ where: and(eq(pilotApplications.id, input.applicationId), eq(pilotApplications.projectId, input.projectId)) });
  if (!row) throw new ApiError(404, "APPLICATION_NOT_FOUND", "This pilot application is unavailable.");
  if (row.status !== "submitted") throw new ApiError(409, "APPLICATION_ALREADY_REVIEWED", "This application has already been reviewed.");
  let pilotId: string | null = null;
  if (input.status === "accepted") {
    const pilot = await createPilot({ projectId: input.projectId, ownerUserId: input.userId, actorKeyId: input.actorKeyId, body: {
      partnerName: row.organizationName, partnerWebsite: row.websiteUrl ?? undefined, useCase: row.useCase,
      integrationMode: row.integrationMode, targetRecipients: row.expectedRecipients,
      requestedIntegrations: row.requestedIntegrations,
      successCriteria: { audience: row.audienceDescription, applicationReadiness: row.readiness },
    }});
    pilotId = pilot.id;
  }
  const now = new Date();
  const [updated] = await getDb().update(pilotApplications).set({
    status: input.status, pilotId, reviewNotes: optionalText(input.reviewNotes, "reviewNotes", 2_000),
    reviewedByUserId: input.userId, reviewedAt: now,
    acceptedAt: input.status === "accepted" ? now : null, updatedAt: now,
  }).where(eq(pilotApplications.id, row.id)).returning();
  await getDb().insert(auditEvents).values({
    actorType: input.actorKeyId ? "api-key" : "user", actorId: input.actorKeyId ?? input.userId, projectId: input.projectId,
    action: `pilot.application-${input.status}`, resourceType: "pilot-application", resourceId: row.id,
    metadata: { pilotId },
  });
  return presentApplication(updated, true);
}

export async function getPublicPilot(publicSlug: string) {
  const row = await getDb().query.pilotEngagements.findFirst({
    where: eq(pilotEngagements.publicSlug, publicSlug),
  });
  if (!row) throw new ApiError(404, "PILOT_NOT_FOUND", "This pilot invitation is unavailable.");
  const project = await getDb().query.projects.findFirst({ where: eq(projects.id, row.projectId) });
  return {
    project: { name: project?.name ?? "Current CoFi", websiteUrl: project?.websiteUrl ?? null },
    pilot: await presentPilot(row),
    attestationStatement: PILOT_STATEMENT,
  };
}

export async function attestPublicPilot(publicSlug: string, body: Record<string, unknown>) {
  if (body.agreed !== true) {
    throw new ApiError(400, "ATTESTATION_REQUIRED", "The partner confirmation must be accepted.");
  }
  const row = await getDb().query.pilotEngagements.findFirst({
    where: eq(pilotEngagements.publicSlug, publicSlug),
  });
  if (!row) throw new ApiError(404, "PILOT_NOT_FOUND", "This pilot invitation is unavailable.");
  const existing = await getDb().query.pilotAttestations.findFirst({
    where: eq(pilotAttestations.pilotId, row.id),
  });
  if (existing) throw new ApiError(409, "PILOT_ALREADY_ATTESTED", "This pilot has already been confirmed.");
  const signerName = text(body.signerName, "signerName", 100);
  const signerRole = text(body.signerRole, "signerRole", 100);
  const statement = typeof body.statement === "string" && body.statement.trim()
    ? text(body.statement, "statement", 2_000)
    : PILOT_STATEMENT;
  const attestedAt = new Date();
  const proof = {
    pilotId: row.id,
    partnerName: row.partnerName,
    signerName,
    signerRole,
    statement,
    attestedAt: attestedAt.toISOString(),
  };
  const digest = await sha256(JSON.stringify(stable(proof)));
  const [attestation] = await getDb().insert(pilotAttestations).values({
    pilotId: row.id,
    signerName,
    signerRole,
    statement,
    digest,
    proof,
    attestedAt,
  }).returning();
  await getDb().update(pilotEngagements).set({
    status: "complete",
    completedAt: attestedAt,
    updatedAt: attestedAt,
  }).where(eq(pilotEngagements.id, row.id));
  await getDb().insert(auditEvents).values({
    actorType: "pilot-partner",
    actorId: digest.slice(0, 20),
    projectId: row.projectId,
    action: "pilot.attested",
    resourceType: "pilot",
    resourceId: row.id,
    metadata: { digest, signerRole },
  });
  return {
    id: attestation.id,
    digest,
    signerName,
    signerRole,
    attestedAt: attestation.attestedAt.toISOString(),
  };
}
