import { and, eq } from "drizzle-orm";
import { getDb } from "../../../server/db/client.js";
import { projectMembers, wallets } from "../../../server/db/schema.js";
import { authenticateDeveloperKey, requireDeveloperPermission, verifySignedDeveloperRequest } from "../../../server/developer/keys.js";
import { ApiError, ok, requiredString, withApi } from "../../../server/http.js";
import { createSocialPayment, type SocialPaymentKind } from "../../../server/payments/social.js";

export default withApi(async (request) => {
  const key = await authenticateDeveloperKey(request);
  requireDeveloperPermission(key, "campaigns:write");
  const raw = await request.text();
  if (raw.length > 32_768) throw new ApiError(413, "BODY_TOO_LARGE", "Social payment payloads are limited to 32 KB.");
  await verifySignedDeveloperRequest(request, key, raw);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw || "{}"); } catch { throw new ApiError(400, "INVALID_JSON", "The social payment payload must be valid JSON."); }
  const owner = await getDb().query.projectMembers.findFirst({ where: and(eq(projectMembers.projectId, key.projectId), eq(projectMembers.role, "owner")) });
  if (!owner) throw new ApiError(409, "PROJECT_OWNER_REQUIRED", "The project needs an owner before creating social payment links.");
  const wallet = await getDb().query.wallets.findFirst({ where: and(eq(wallets.userId, owner.userId), eq(wallets.chainCode, "ARC-TESTNET")) });
  if (!wallet) throw new ApiError(409, "ARC_WALLET_REQUIRED", "The project owner needs an active Arc wallet.");
  const kind = requiredString(body, "kind", 20) as SocialPaymentKind;
  if (kind === "send") throw new ApiError(400, "USERNAME_SEND_REQUIRES_SESSION", "Direct username sends require the sending user's wallet session. Use request, tip, or split through the server SDK.");
  const shares = Array.isArray(body.shares) ? body.shares.map((value) => {
    const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return { label: typeof item.label === "string" ? item.label : undefined, amount: typeof item.amount === "string" ? item.amount : "" };
  }) : undefined;
  return ok(request, await createSocialPayment({ userId: owner.userId, creatorAddress: wallet.address, projectId: key.projectId, kind, title: requiredString(body, "title", 100), note: typeof body.note === "string" ? body.note : undefined, amount: typeof body.amount === "string" ? body.amount : undefined, tokenAddress: typeof body.tokenAddress === "string" && body.tokenAddress.trim() ? body.tokenAddress.trim() : undefined, shares, expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined, origin: new URL(request.url).origin }), 201);
}, ["POST"]);
