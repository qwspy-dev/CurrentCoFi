import { and, eq } from "drizzle-orm";
import type { CurrentSession } from "../auth/session.js";
import { getDb } from "../db/client.js";
import { identities, projectMembers, projects, users, wallets } from "../db/schema.js";
import { sha256 } from "../security/crypto.js";

function usernameBase(displayName: string) {
  const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return base || "current-user";
}

export async function persistSessionAccount(session: CurrentSession) {
  const db = getDb();
  const providerSubjectHash = await sha256(`${session.provider}:${session.circleUserId}`);
  let identity = await db.query.identities.findFirst({
    where: and(
      eq(identities.provider, session.provider),
      eq(identities.providerSubjectHash, providerSubjectHash),
    ),
  });

  let userId = identity?.userId;
  if (!userId) {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 7);
    const [user] = await db.insert(users).values({
      username: `${usernameBase(session.displayName)}-${suffix}`,
      displayName: session.displayName,
    }).returning();
    userId = user.id;
    const [createdIdentity] = await db.insert(identities).values({
      userId,
      provider: session.provider,
      providerSubjectHash,
      verifiedAt: new Date(),
      metadata: session.email ? { emailHash: await sha256(session.email) } : {},
    }).onConflictDoNothing().returning();
    identity = createdIdentity ?? await db.query.identities.findFirst({
      where: and(
        eq(identities.provider, session.provider),
        eq(identities.providerSubjectHash, providerSubjectHash),
      ),
    });
    userId = identity?.userId ?? userId;
  } else {
    await db.update(users).set({ displayName: session.displayName, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  for (const wallet of session.wallets) {
    await db.insert(wallets).values({
      userId,
      circleWalletId: wallet.id,
      address: wallet.address.toLowerCase(),
      chainCode: wallet.blockchain,
      walletType: wallet.accountType,
      status: wallet.state.toLowerCase(),
    }).onConflictDoUpdate({
      target: [wallets.chainCode, wallets.address],
      set: {
        userId,
        circleWalletId: wallet.id,
        walletType: wallet.accountType,
        status: wallet.state.toLowerCase(),
        updatedAt: new Date(),
      },
    });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return { userId, username: user?.username ?? "current-user" };
}

export async function getOrCreatePersonalProject(userId: string, displayName: string) {
  const db = getDb();
  const membership = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.userId, userId), eq(projectMembers.role, "owner")),
  });
  if (membership) {
    const project = await db.query.projects.findFirst({ where: eq(projects.id, membership.projectId) });
    if (project) return project;
  }
  const slug = `personal-${userId.slice(0, 8)}`;
  const [project] = await db.insert(projects).values({
    slug,
    name: `${displayName}'s Current`,
    description: "Personal Current CoFi workspace",
    settings: { type: "personal" },
  }).onConflictDoUpdate({
    target: projects.slug,
    set: { updatedAt: new Date() },
  }).returning();
  await db.insert(projectMembers).values({ projectId: project.id, userId, role: "owner" }).onConflictDoNothing();
  return project;
}
