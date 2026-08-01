import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { webhookDeliveries, webhookEndpoints } from "../db/schema.js";
import { ApiError } from "../http.js";
import { hmacWithSecret, openSecret, randomSecret, sealSecret, sha256 } from "../security/crypto.js";

export const webhookEventTypes = [
  "campaign.created",
  "campaign.funded",
  "identity.verified",
  "claim.completed",
  "activation.completed",
  "referral.attributed",
  "quality.assessed",
  "campaign.cancelled",
  "campaign.refunded",
  "crosschain.funding.created",
  "crosschain.funding.source-confirmed",
  "crosschain.funding.arc-arrived",
  "crosschain.funding.campaign-funded",
  "gateway.funding.created",
  "gateway.funding.deposited",
  "gateway.funding.attested",
  "gateway.funding.arc-arrived",
  "gateway.funding.campaign-funded",
  "agent.settlement-ready",
  "agent.settlement-approved",
  "agent.settled",
  "current.locked",
  "current.access-activated",
  "fee.routed",
  "integration.test",
] as const;

function normalizeEvents(value: string[]) {
  const supported = new Set<string>(webhookEventTypes);
  const events = [...new Set(value)];
  if (!events.length || events.some((event) => !supported.has(event))) {
    throw new ApiError(400, "INVALID_WEBHOOK_EVENTS", "Choose at least one supported webhook event.");
  }
  return events;
}

function validateWebhookUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, "INVALID_WEBHOOK_URL", "Webhook endpoints must be valid HTTPS URLs.");
  }
  const hostname = url.hostname.toLowerCase();
  const forbidden = hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname);
  if (url.protocol !== "https:" || forbidden || url.username || url.password) {
    throw new ApiError(400, "INVALID_WEBHOOK_URL", "Webhook endpoints must use a public HTTPS URL.");
  }
  return url.toString();
}

export async function listWebhookState(projectId: string) {
  const endpoints = await getDb().select({
    id: webhookEndpoints.id,
    url: webhookEndpoints.url,
    events: webhookEndpoints.events,
    enabled: webhookEndpoints.enabled,
    createdAt: webhookEndpoints.createdAt,
    updatedAt: webhookEndpoints.updatedAt,
  }).from(webhookEndpoints).where(eq(webhookEndpoints.projectId, projectId)).orderBy(desc(webhookEndpoints.createdAt));
  const endpointIds = endpoints.map((endpoint) => endpoint.id);
  const deliveries = endpointIds.length ? await getDb().select({
    id: webhookDeliveries.id,
    endpointId: webhookDeliveries.endpointId,
    eventType: webhookDeliveries.eventType,
    eventId: webhookDeliveries.eventId,
    status: webhookDeliveries.status,
    attempts: webhookDeliveries.attempts,
    responseStatus: webhookDeliveries.responseStatus,
    responseError: webhookDeliveries.responseError,
    createdAt: webhookDeliveries.createdAt,
    updatedAt: webhookDeliveries.updatedAt,
  }).from(webhookDeliveries)
    .where(inArray(webhookDeliveries.endpointId, endpointIds))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(100) : [];
  return {
    endpoints: endpoints.map((endpoint) => ({
      ...endpoint,
      createdAt: endpoint.createdAt.toISOString(),
      updatedAt: endpoint.updatedAt.toISOString(),
    })),
    deliveries: deliveries.map((delivery) => ({
      ...delivery,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    })),
  };
}

export async function createWebhookEndpoint(projectId: string, urlValue: string, eventValues: string[]) {
  const url = validateWebhookUrl(urlValue);
  const events = normalizeEvents(eventValues);
  const secret = `whsec_${randomSecret(32)}`;
  const [created] = await getDb().insert(webhookEndpoints).values({
    projectId,
    url,
    secretHash: await sha256(secret),
    secretCiphertext: await sealSecret(secret),
    events,
  }).returning({
    id: webhookEndpoints.id,
    createdAt: webhookEndpoints.createdAt,
  });
  return {
    id: created.id,
    url,
    events,
    enabled: true,
    secret,
    createdAt: created.createdAt.toISOString(),
    warning: "The webhook signing secret is shown once. Store it securely.",
  };
}

export async function setWebhookEndpointEnabled(projectId: string, endpointId: string, enabled: boolean) {
  const rows = await getDb().update(webhookEndpoints).set({ enabled, updatedAt: new Date() })
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.projectId, projectId)))
    .returning({ id: webhookEndpoints.id });
  if (!rows.length) throw new ApiError(404, "WEBHOOK_NOT_FOUND", "This webhook endpoint does not exist.");
  return { id: rows[0].id, enabled };
}

export async function queueWebhookEvent(
  projectId: string,
  eventType: typeof webhookEventTypes[number],
  data: Record<string, unknown>,
) {
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload = { id: eventId, type: eventType, createdAt, data };
  const endpoints = await getDb().select({ id: webhookEndpoints.id, events: webhookEndpoints.events })
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookEndpoints.enabled, true)));
  const subscribed = endpoints.filter((endpoint) => endpoint.events.includes(eventType));
  if (subscribed.length) {
    await getDb().insert(webhookDeliveries).values(subscribed.map((endpoint) => ({
      endpointId: endpoint.id,
      eventType,
      eventId,
      payload,
      nextAttemptAt: new Date(),
    }))).onConflictDoNothing();
  }
  return { eventId, queued: subscribed.length };
}

const retryDelays = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000];

export async function deliverWebhook(deliveryId: string) {
  const [row] = await getDb().select({
    deliveryId: webhookDeliveries.id,
    endpointId: webhookEndpoints.id,
    url: webhookEndpoints.url,
    secretCiphertext: webhookEndpoints.secretCiphertext,
    enabled: webhookEndpoints.enabled,
    eventType: webhookDeliveries.eventType,
    eventId: webhookDeliveries.eventId,
    payload: webhookDeliveries.payload,
    attempts: webhookDeliveries.attempts,
  }).from(webhookDeliveries)
    .innerJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);
  if (!row || !row.enabled) return { delivered: false, skipped: true };
  const body = JSON.stringify(row.payload);
  const timestamp = Date.now().toString();
  const signature = await hmacWithSecret(await openSecret(row.secretCiphertext), `${timestamp}.${body}`);
  const attempt = row.attempts + 1;
  try {
    const response = await fetch(row.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Current-CoFi-Webhooks/1.0",
        "x-current-delivery": row.eventId,
        "x-current-event": row.eventType,
        "x-current-timestamp": timestamp,
        "x-current-signature": signature,
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Endpoint returned HTTP ${response.status}`);
    await getDb().update(webhookDeliveries).set({
      status: "delivered",
      attempts: attempt,
      responseStatus: response.status,
      responseError: null,
      nextAttemptAt: null,
      updatedAt: new Date(),
    }).where(eq(webhookDeliveries.id, deliveryId));
    return { delivered: true, responseStatus: response.status };
  } catch (error) {
    const terminal = attempt >= retryDelays.length;
    await getDb().update(webhookDeliveries).set({
      status: terminal ? "failed" : "retrying",
      attempts: attempt,
      responseStatus: null,
      responseError: (error instanceof Error ? error.message : "Webhook delivery failed").slice(0, 500),
      nextAttemptAt: terminal ? null : new Date(Date.now() + retryDelays[attempt - 1]),
      updatedAt: new Date(),
    }).where(eq(webhookDeliveries.id, deliveryId));
    return { delivered: false, terminal };
  }
}

export async function deliverQueuedWebhooks(limit = 25) {
  const rows = await getDb().select({ id: webhookDeliveries.id }).from(webhookDeliveries)
    .where(and(
      inArray(webhookDeliveries.status, ["pending", "retrying"]),
      or(isNull(webhookDeliveries.nextAttemptAt), lte(webhookDeliveries.nextAttemptAt, new Date())),
    ))
    .orderBy(webhookDeliveries.createdAt)
    .limit(Math.min(Math.max(limit, 1), 100));
  const results = [];
  for (const row of rows) results.push(await deliverWebhook(row.id));
  return { processed: rows.length, delivered: results.filter((result) => result.delivered).length };
}
