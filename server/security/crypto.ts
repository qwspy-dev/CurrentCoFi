import { getServerConfig } from "../config.js";
import { ApiError } from "../http.js";

function signingSecret() {
  const value = getServerConfig().CLAIM_SIGNING_SECRET;
  if (!value) throw new ApiError(503, "CLAIMS_NOT_CONFIGURED", "Secure claim links are not configured yet.");
  return value;
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function applicationKey() {
  const secret = getServerConfig().CURRENT_COFI_INTERNAL_SECRET;
  if (!secret) throw new ApiError(503, "ENCRYPTION_NOT_CONFIGURED", "Secure developer credentials are not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function randomSecret(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function sealSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await applicationKey(),
    new TextEncoder().encode(value),
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function openSecret(value: string) {
  try {
    const [iv, encrypted, ...rest] = value.split(".");
    if (!iv || !encrypted || rest.length) throw new Error("Malformed ciphertext");
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(iv) },
      await applicationKey(),
      fromBase64Url(encrypted),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new ApiError(500, "SECRET_DECRYPTION_FAILED", "A protected integration secret could not be opened.");
  }
}

export async function hmacWithSecret(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

export function constantTimeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

export async function verifyHmac(value: string, signature: string) {
  const expected = await hmac(value);
  return constantTimeEqual(expected, signature);
}

export async function signClaimToken(allocationId: string, secret: string) {
  const payload = `${allocationId}.${secret}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function parseClaimToken(token: string) {
  const [allocationId, secret, signature, ...rest] = token.split(".");
  if (
    rest.length ||
    !allocationId ||
    !/^[0-9a-f-]{36}$/i.test(allocationId) ||
    !secret ||
    !signature ||
    !(await verifyHmac(`${allocationId}.${secret}`, signature))
  ) {
    throw new ApiError(404, "CLAIM_NOT_FOUND", "This claim link is invalid or no longer available.");
  }
  return { allocationId, secret };
}
