import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getServerConfig } from "../config.js";
import { getDb } from "../db/client.js";
import { allocations, auditEvents, campaignDeliveries, distributions, tokens } from "../db/schema.js";
import { ApiError } from "../http.js";
import { openSecret } from "../security/crypto.js";
import { formatAtomic, projectAccess } from "./repository.js";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

export function campaignClaimEmail(input: { campaignName: string; amount: string; asset: string; claimUrl: string; expiresAt: Date | null }) {
  const campaign = escapeHtml(input.campaignName);
  const amount = escapeHtml(input.amount);
  const asset = escapeHtml(input.asset);
  const url = escapeHtml(input.claimUrl);
  const expiry = input.expiresAt ? input.expiresAt.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }) : "the campaign closes";
  return {
    subject: `${input.campaignName}: your ${input.asset} claim is ready`,
    html: `<!doctype html><html><body style="margin:0;background:#f4fafa;color:#061b2b;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:48px 24px"><div style="font-weight:800;letter-spacing:-.03em;font-size:20px;color:#0868b7">Current CoFi</div><div style="margin-top:28px;background:#fff;border:1px solid #cdebea;border-radius:20px;padding:36px"><div style="font-size:12px;letter-spacing:.12em;color:#0868b7;font-weight:700">PRIVATE WALLETLESS CLAIM</div><h1 style="font-size:34px;line-height:1.05;letter-spacing:-.04em;margin:18px 0">A current from ${campaign} reached you.</h1><p style="font-size:16px;line-height:1.6;color:#45616b">Claim <strong>${amount} ${asset}</strong>. You do not need an existing wallet or gas; Current creates your embedded wallet after you sign in.</p><a href="${url}" style="display:inline-block;margin-top:14px;padding:16px 24px;border-radius:999px;background:#0868b7;color:#fff;text-decoration:none;font-weight:700">Claim ${amount} ${asset}</a><p style="margin-top:24px;font-size:12px;line-height:1.55;color:#718a91">This private link expires ${escapeHtml(expiry)}. Do not forward it. Current will never ask for a seed phrase or payment to claim.</p></div><p style="font-size:11px;line-height:1.5;color:#718a91;margin-top:18px">This operational email was requested by ${campaign}. Delivery status is recorded separately from onchain claim settlement.</p></div></body></html>`,
  };
}

export async function dispatchCampaignEmail(input: { userId: string; projectId: string; deliveryId: string }) {
  await projectAccess(input.userId, input.projectId);
  const config = getServerConfig();
  if (!config.RESEND_API_KEY || !config.CURRENT_DELIVERY_FROM_EMAIL) throw new ApiError(503, "EMAIL_DELIVERY_NOT_CONFIGURED", "Automated email delivery is ready but needs a verified sender domain and provider key.");
  const db = getDb();
  const rows = await db.select({ delivery: campaignDeliveries, distribution: distributions, allocation: allocations, token: tokens })
    .from(campaignDeliveries).innerJoin(distributions, eq(distributions.id, campaignDeliveries.distributionId))
    .innerJoin(allocations, eq(allocations.id, campaignDeliveries.allocationId)).innerJoin(tokens, eq(tokens.id, distributions.tokenId))
    .where(and(eq(campaignDeliveries.id, input.deliveryId), eq(campaignDeliveries.projectId, input.projectId))).limit(1);
  const row = rows[0];
  if (!row) throw new ApiError(404, "DELIVERY_NOT_FOUND", "This campaign delivery does not exist.");
  if (row.delivery.identityType !== "email" || !row.delivery.recipientCiphertext) throw new ApiError(409, "EMAIL_DESTINATION_UNAVAILABLE", "This record does not contain an encrypted email destination.");
  if (["accepted", "delivered", "claimed"].includes(row.delivery.status)) return { id: row.delivery.id, status: row.delivery.status, providerMessageId: row.delivery.providerMessageId, deduplicated: true };
  const [to, claimUrl] = await Promise.all([openSecret(row.delivery.recipientCiphertext), openSecret(row.delivery.claimUrlCiphertext)]);
  const content = campaignClaimEmail({ campaignName: row.distribution.name, amount: formatAtomic(row.allocation.amountAtomic, row.token.decimals), asset: row.token.symbol, claimUrl, expiresAt: row.allocation.expiresAt });
  const attempt = row.delivery.attemptCount + 1;
  const locked = await db.update(campaignDeliveries).set({ status: "sending", channel: "email", attemptCount: attempt, lastAttemptAt: new Date(), failureCode: null, failedAt: null, updatedAt: new Date() }).where(and(eq(campaignDeliveries.id, row.delivery.id), eq(campaignDeliveries.status, row.delivery.status))).returning({ id: campaignDeliveries.id });
  if (!locked.length) throw new ApiError(409, "DELIVERY_ALREADY_PROCESSING", "This delivery changed while the request was starting. Refresh before retrying.");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `current-campaign-${row.delivery.id}-attempt-${attempt}` }, body: JSON.stringify({ from: config.CURRENT_DELIVERY_FROM_EMAIL, to: [to], subject: content.subject, html: content.html, tags: [{ name: "delivery_id", value: row.delivery.id }, { name: "campaign_id", value: row.distribution.id }] }) });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !result.id) {
    const code = result.name?.slice(0, 80) || `provider_${response.status}`;
    await db.update(campaignDeliveries).set({ status: "failed", failedAt: new Date(), failureCode: code, updatedAt: new Date(), metadata: { ...row.delivery.metadata, providerError: result.message?.slice(0, 300) ?? "Provider rejected the request." } }).where(eq(campaignDeliveries.id, row.delivery.id));
    throw new ApiError(502, "EMAIL_PROVIDER_REJECTED", "The email provider rejected this delivery. It remains safe to retry.");
  }
  await db.update(campaignDeliveries).set({ status: "accepted", sentAt: new Date(), providerMessageId: result.id, updatedAt: new Date(), metadata: { ...row.delivery.metadata, provider: "resend", acceptedAt: new Date().toISOString() } }).where(eq(campaignDeliveries.id, row.delivery.id));
  await db.insert(auditEvents).values({ actorType: "user", actorId: input.userId, projectId: input.projectId, action: "campaign.email_accepted", resourceType: "campaign_delivery", resourceId: row.delivery.id, metadata: { distributionId: row.distribution.id, provider: "resend", attempt } });
  return { id: row.delivery.id, status: "accepted", providerMessageId: result.id, attemptCount: attempt, deduplicated: false };
}

function verifySignature(rawBody: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id"); const timestamp = headers.get("svix-timestamp"); const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(" ").some((part) => { const encoded = part.startsWith("v1,") ? part.slice(3) : ""; if (!encoded) return false; const actual = Buffer.from(encoded, "base64"); return actual.length === expected.length && timingSafeEqual(actual, expected); });
}

export async function applyResendWebhook(rawBody: string, headers: Headers) {
  const config = getServerConfig();
  if (!config.RESEND_WEBHOOK_SECRET) throw new ApiError(503, "EMAIL_WEBHOOK_NOT_CONFIGURED", "Email webhook verification is not configured.");
  if (!verifySignature(rawBody, headers, config.RESEND_WEBHOOK_SECRET)) throw new ApiError(401, "INVALID_EMAIL_WEBHOOK", "The email provider signature is invalid or expired.");
  const event = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string } };
  const messageId = event.data?.email_id;
  const states: Record<string, string> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.suppressed": "suppressed", "email.delivery_delayed": "delayed" };
  const status = event.type ? states[event.type] : undefined;
  if (!messageId || !status) return { received: true, ignored: true };
  const now = new Date();
  const [delivery] = await getDb().update(campaignDeliveries).set({ status, deliveredAt: status === "delivered" ? now : null, failedAt: ["bounced", "complained", "suppressed"].includes(status) ? now : null, failureCode: ["bounced", "complained", "suppressed"].includes(status) ? status : null, updatedAt: now }).where(eq(campaignDeliveries.providerMessageId, messageId)).returning();
  if (delivery) await getDb().insert(auditEvents).values({ actorType: "system", actorId: "resend", projectId: delivery.projectId, action: `campaign.email_${status}`, resourceType: "campaign_delivery", resourceId: delivery.id, metadata: { provider: "resend", eventType: event.type } });
  return { received: true, matched: Boolean(delivery), status };
}
