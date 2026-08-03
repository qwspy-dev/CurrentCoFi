import { and, eq } from "drizzle-orm";
import { createClaimLink } from "../../../server/claims/links.js";
import { getDb } from "../../../server/db/client.js";
import { projectMembers, projects, users, wallets } from "../../../server/db/schema.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";

function expiration(value: unknown) {
  const hours = Number(value ?? 168);
  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    throw new ApiError(400, "INVALID_EXPIRATION", "Expiration must be between one hour and 30 days.");
  }
  return Math.round(hours);
}

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "claims:write");
  const raw = await request.text();
  if (raw.length > 16_384) throw new ApiError(413, "BODY_TOO_LARGE", "Asset-link payloads are limited to 16 KB.");
  await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The asset-link payload must be valid JSON."); }
  const owner = await getDb().select({ userId: projectMembers.userId, displayName: users.displayName, projectName: projects.name })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projectMembers.projectId, key.projectId), eq(projectMembers.role, "owner")))
    .limit(1);
  if (!owner[0]) throw new ApiError(409, "PROJECT_OWNER_REQUIRED", "The project needs an owner before creating asset links.");
  const wallet = await getDb().query.wallets.findFirst({ where: and(eq(wallets.userId, owner[0].userId), eq(wallets.chainCode, "ARC-TESTNET")) });
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "The project owner needs an active Arc wallet.");
  return ok(request, await createClaimLink({
    userId: owner[0].userId,
    displayName: owner[0].displayName || owner[0].projectName,
    projectId: key.projectId,
    amount: requiredString(body, "amount", 50),
    tokenAddress: typeof body.tokenAddress === "string" ? body.tokenAddress : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    expiresInHours: expiration(body.expiresInHours),
    refundAddress: wallet.address,
    origin: new URL(request.url).origin,
  }), 201);
}, ["POST"]);
