import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { auditEvents, projectInvitations, projectMembers, projects, users, userWorkspacePreferences } from "../db/schema.js";
import { ApiError } from "../http.js";
import { constantTimeEqual, randomSecret, sha256 } from "../security/crypto.js";

export type WorkspaceRole = "owner" | "admin" | "operator" | "analyst" | "developer";
const INVITABLE_ROLES = new Set<WorkspaceRole>(["admin", "operator", "analyst", "developer"]);

export function workspaceRoleCapabilities(role: WorkspaceRole) {
  return {
    manageMembers: role === "owner" || role === "admin",
    operateFunds: role === "owner" || role === "admin" || role === "operator",
    reviewWorkspace: true,
    useDeveloperTools: role === "owner" || role === "admin" || role === "developer",
  };
}

function normalizedEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "INVALID_INVITATION_EMAIL", "Enter a valid teammate email address.");
  return email;
}

function maskedEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
}

async function membership(userId: string, projectId: string) {
  const row = await getDb().query.projectMembers.findFirst({ where: and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)) });
  if (!row) throw new ApiError(403, "WORKSPACE_ACCESS_DENIED", "You are not a member of this workspace.");
  return row;
}

async function administrator(userId: string, projectId: string) {
  const row = await membership(userId, projectId);
  if (!workspaceRoleCapabilities(row.role).manageMembers) throw new ApiError(403, "WORKSPACE_ADMIN_REQUIRED", "An owner or admin is required for this action.");
  return row;
}

async function emailDigest(projectId: string, email: string) {
  return sha256(`current-workspace:${projectId}:${email}`);
}

function invitationState(row: typeof projectInvitations.$inferSelect) {
  if (row.status === "pending" && row.expiresAt.getTime() <= Date.now()) return "expired";
  return row.status;
}

function presentInvitation(row: typeof projectInvitations.$inferSelect) {
  return { id: row.id, maskedEmail: row.maskedEmail, role: row.role, status: invitationState(row), expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString(), acceptedAt: row.acceptedAt?.toISOString() ?? null };
}

export async function listWorkspace(userId: string, activeProjectId: string) {
  const db = getDb();
  const activeMembership = await membership(userId, activeProjectId);
  const memberships = await db.select({ projectId: projectMembers.projectId, role: projectMembers.role, name: projects.name, slug: projects.slug, logoUrl: projects.logoUrl })
    .from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId)).where(eq(projectMembers.userId, userId)).orderBy(projects.name);
  const members = await db.select({ userId: projectMembers.userId, role: projectMembers.role, createdAt: projectMembers.createdAt, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(eq(projectMembers.projectId, activeProjectId)).orderBy(projectMembers.createdAt);
  const invitations = workspaceRoleCapabilities(activeMembership.role).manageMembers
    ? await db.select().from(projectInvitations).where(eq(projectInvitations.projectId, activeProjectId)).orderBy(desc(projectInvitations.createdAt)).limit(50)
    : [];
  await db.insert(userWorkspacePreferences).values({ userId, activeProjectId }).onConflictDoUpdate({ target: userWorkspacePreferences.userId, set: { activeProjectId, updatedAt: new Date() } });
  return {
    activeProjectId,
    currentRole: activeMembership.role,
    canManage: workspaceRoleCapabilities(activeMembership.role).manageMembers,
    capabilities: workspaceRoleCapabilities(activeMembership.role),
    workspaces: memberships.map((row) => ({ id: row.projectId, name: row.name, slug: row.slug, logoUrl: row.logoUrl, role: row.role, active: row.projectId === activeProjectId })),
    members: members.map((row) => ({ userId: row.userId, displayName: row.displayName ?? row.username, username: row.username, avatarUrl: row.avatarUrl, role: row.role, joinedAt: row.createdAt.toISOString(), isCurrentUser: row.userId === userId })),
    invitations: invitations.map(presentInvitation),
  };
}

export async function switchWorkspace(userId: string, projectId: string) {
  await membership(userId, projectId);
  await getDb().insert(userWorkspacePreferences).values({ userId, activeProjectId: projectId }).onConflictDoUpdate({ target: userWorkspacePreferences.userId, set: { activeProjectId: projectId, updatedAt: new Date() } });
  return { activeProjectId: projectId, switched: true };
}

export async function createWorkspaceInvitation(input: { userId: string; projectId: string; email: unknown; role: unknown; origin: string }) {
  await administrator(input.userId, input.projectId);
  const email = normalizedEmail(input.email);
  const role = String(input.role ?? "operator") as WorkspaceRole;
  if (!INVITABLE_ROLES.has(role)) throw new ApiError(400, "INVALID_WORKSPACE_ROLE", "Choose admin, operator, analyst, or developer.");
  const emailHash = await emailDigest(input.projectId, email);
  await getDb().update(projectInvitations).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(projectInvitations.projectId, input.projectId), eq(projectInvitations.emailHash, emailHash), eq(projectInvitations.status, "pending")));
  const secret = randomSecret(32);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const [row] = await getDb().insert(projectInvitations).values({ id, projectId: input.projectId, invitedByUserId: input.userId, emailHash, maskedEmail: maskedEmail(email), tokenHash: await sha256(secret), role, expiresAt }).returning();
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "workspace.invitation-created", resourceType: "project-invitation", resourceId: row.id, metadata: { role, maskedEmail: row.maskedEmail, expiresAt: expiresAt.toISOString() } });
  return { invitation: presentInvitation(row), inviteUrl: `${input.origin}/?workspaceInvite=${encodeURIComponent(`${id}.${secret}`)}#/members` };
}

export async function revokeWorkspaceInvitation(userId: string, projectId: string, invitationId: string) {
  await administrator(userId, projectId);
  const [row] = await getDb().update(projectInvitations).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(projectInvitations.id, invitationId), eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending"))).returning();
  if (!row) throw new ApiError(404, "INVITATION_NOT_FOUND", "This pending invitation is unavailable.");
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: userId, projectId, action: "workspace.invitation-revoked", resourceType: "project-invitation", resourceId: row.id, metadata: {} });
  return presentInvitation(row);
}

export async function updateWorkspaceMember(input: { userId: string; projectId: string; memberUserId: string; action: "role" | "remove"; role?: unknown }) {
  const actor = await administrator(input.userId, input.projectId);
  const target = await membership(input.memberUserId, input.projectId);
  if (target.role === "owner") throw new ApiError(409, "OWNER_IMMUTABLE", "Workspace ownership cannot be changed or removed here.");
  if (input.memberUserId === input.userId) throw new ApiError(409, "SELF_MEMBERSHIP_CHANGE", "Use another workspace administrator to change your own access.");
  if (actor.role === "admin" && target.role === "admin") throw new ApiError(403, "OWNER_REQUIRED", "Only the owner can change another admin.");
  if (input.action === "remove") {
    await getDb().delete(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, input.memberUserId)));
    await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "workspace.member-removed", resourceType: "project-member", resourceId: input.memberUserId, metadata: { previousRole: target.role } });
    return { removed: true };
  }
  const role = String(input.role ?? "") as WorkspaceRole;
  if (!INVITABLE_ROLES.has(role)) throw new ApiError(400, "INVALID_WORKSPACE_ROLE", "Choose admin, operator, analyst, or developer.");
  if (actor.role === "admin" && role === "admin") throw new ApiError(403, "OWNER_REQUIRED", "Only the owner can appoint another admin.");
  await getDb().update(projectMembers).set({ role }).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, input.memberUserId)));
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "workspace.member-role-updated", resourceType: "project-member", resourceId: input.memberUserId, metadata: { previousRole: target.role, role } });
  return { userId: input.memberUserId, role };
}

function parseInviteToken(value: string) {
  const [id, secret, ...rest] = value.split(".");
  if (rest.length || !/^[0-9a-f-]{36}$/i.test(id ?? "") || !secret || secret.length < 32) throw new ApiError(404, "INVITATION_NOT_FOUND", "This workspace invitation is invalid or unavailable.");
  return { id, secret };
}

export async function publicWorkspaceInvitation(token: string) {
  const { id, secret } = parseInviteToken(token);
  const row = await getDb().query.projectInvitations.findFirst({ where: eq(projectInvitations.id, id) });
  if (!row || !constantTimeEqual(await sha256(secret), row.tokenHash) || invitationState(row) !== "pending") throw new ApiError(404, "INVITATION_NOT_FOUND", "This workspace invitation is invalid, expired, or unavailable.");
  const project = await getDb().query.projects.findFirst({ where: eq(projects.id, row.projectId) });
  if (!project) throw new ApiError(404, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.");
  return { project: { id: project.id, name: project.name, logoUrl: project.logoUrl, websiteUrl: project.websiteUrl }, invitation: presentInvitation(row), acceptance: { requiresSignIn: true, requiresMatchingEmail: true } };
}

export async function acceptWorkspaceInvitation(input: { userId: string; email?: string; token: string }) {
  if (!input.email) throw new ApiError(409, "VERIFIED_EMAIL_REQUIRED", "Sign in with the invited email address to join this workspace.");
  const { id, secret } = parseInviteToken(input.token);
  const row = await getDb().query.projectInvitations.findFirst({ where: eq(projectInvitations.id, id) });
  if (!row || !constantTimeEqual(await sha256(secret), row.tokenHash) || invitationState(row) !== "pending") throw new ApiError(404, "INVITATION_NOT_FOUND", "This workspace invitation is invalid, expired, or unavailable.");
  if (!constantTimeEqual(await emailDigest(row.projectId, input.email.trim().toLowerCase()), row.emailHash)) throw new ApiError(403, "INVITATION_EMAIL_MISMATCH", "Sign in with the email address this invitation was created for.");
  const existingMembership = await getDb().query.projectMembers.findFirst({ where: and(eq(projectMembers.projectId, row.projectId), eq(projectMembers.userId, input.userId)) });
  if (existingMembership) throw new ApiError(409, "ALREADY_A_MEMBER", "This Current account already belongs to the workspace.");
  const [accepted] = await getDb().update(projectInvitations).set({ status: "accepted", acceptedByUserId: input.userId, acceptedAt: new Date(), updatedAt: new Date() }).where(and(eq(projectInvitations.id, row.id), eq(projectInvitations.status, "pending"))).returning();
  if (!accepted) throw new ApiError(409, "INVITATION_ALREADY_USED", "This invitation was already accepted or revoked.");
  await getDb().insert(projectMembers).values({ projectId: row.projectId, userId: input.userId, role: row.role }).onConflictDoUpdate({ target: [projectMembers.projectId, projectMembers.userId], set: { role: row.role } });
  await switchWorkspace(input.userId, row.projectId);
  await getDb().insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: row.projectId, action: "workspace.invitation-accepted", resourceType: "project-invitation", resourceId: row.id, metadata: { role: row.role } });
  return { accepted: true, activeProjectId: row.projectId, role: row.role };
}
