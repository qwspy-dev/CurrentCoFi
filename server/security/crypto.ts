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

export function randomSecret(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
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
  if (expected.length !== signature.length) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
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
