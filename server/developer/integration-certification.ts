import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { projects } from "../db/schema.js";
import { ApiError } from "../http.js";
import { hmac, sha256, verifyHmac } from "../security/crypto.js";
import { integrationManifest, integrationReadiness } from "./integration-readiness.js";

export const INTEGRATION_CERTIFICATE_SCHEMA = "current-integration-certificate-v1";

type CertificatePayload = {
  schemaVersion: typeof INTEGRATION_CERTIFICATE_SCHEMA;
  subject: { projectRef: string; projectName: string };
  issuer: { name: "Current CoFi"; network: "Arc testnet" };
  status: "progress" | "integration-verified" | "grant-ready";
  score: number;
  completed: number;
  total: number;
  checks: Array<{ id: string; label: string; weight: number; count: number; complete: boolean }>;
  manifestDigest: string;
  issuedAt: string;
  expiresAt: string;
};

function encode(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function decode(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }

function certificateStatus(score: number): CertificatePayload["status"] {
  if (score >= 90) return "grant-ready";
  if (score >= 65) return "integration-verified";
  return "progress";
}

export async function issueIntegrationCertificate(projectId: string) {
  const [project, readiness, projectRef] = await Promise.all([
    getDb().query.projects.findFirst({ where: eq(projects.id, projectId) }),
    integrationReadiness(projectId),
    sha256(`current-project:${projectId}`),
  ]);
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "The project does not exist.");
  const issuedAt = new Date();
  const payload: CertificatePayload = {
    schemaVersion: INTEGRATION_CERTIFICATE_SCHEMA,
    subject: { projectRef, projectName: project.name },
    issuer: { name: "Current CoFi", network: "Arc testnet" },
    status: certificateStatus(readiness.score),
    score: readiness.score,
    completed: readiness.completed,
    total: readiness.total,
    checks: readiness.checks.map(({ id, label, weight, count, complete }) => ({ id, label, weight, count, complete })),
    manifestDigest: integrationManifest().digest,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
  };
  const encoded = encode(JSON.stringify(payload));
  const signature = await hmac(`integration-certificate.${encoded}`);
  const token = `${encoded}.${signature}`;
  return { token, certificate: payload, digest: await sha256(JSON.stringify(payload)) };
}

export async function verifyIntegrationCertificate(token: string) {
  if (!token || token.length > 12_000) throw new ApiError(400, "CERTIFICATE_REQUIRED", "A valid integration certificate is required.");
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length || !(await verifyHmac(`integration-certificate.${encoded}`, signature))) {
    throw new ApiError(404, "CERTIFICATE_INVALID", "This integration certificate is invalid or has been altered.");
  }
  let certificate: CertificatePayload;
  try { certificate = JSON.parse(decode(encoded)) as CertificatePayload; }
  catch { throw new ApiError(404, "CERTIFICATE_INVALID", "This integration certificate is malformed."); }
  if (certificate.schemaVersion !== INTEGRATION_CERTIFICATE_SCHEMA || certificate.issuer?.name !== "Current CoFi") {
    throw new ApiError(404, "CERTIFICATE_INVALID", "This integration certificate uses an unsupported schema.");
  }
  const expiresAt = Date.parse(certificate.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new ApiError(404, "CERTIFICATE_INVALID", "This integration certificate has an invalid expiry.");
  return {
    certificate,
    digest: await sha256(JSON.stringify(certificate)),
    verification: { signatureValid: true, expired: expiresAt <= Date.now(), manifestCurrent: certificate.manifestDigest === integrationManifest().digest, verifiedAt: new Date().toISOString() },
  };
}
