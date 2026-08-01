import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  CLAIM_SIGNING_SECRET: "integration-certificate-test-secret-000000000000",
});

const [{ hmac }, { integrationManifest }, { INTEGRATION_CERTIFICATE_SCHEMA, verifyIntegrationCertificate }] = await Promise.all([
  import("../server/security/crypto.js"),
  import("../server/developer/integration-readiness.js"),
  import("../server/developer/integration-certification.js"),
]);

const certificate = {
  schemaVersion: INTEGRATION_CERTIFICATE_SCHEMA,
  subject: { projectRef: "public_project_reference", projectName: "Certified Test Project" },
  issuer: { name: "Current CoFi", network: "Arc testnet" },
  status: "integration-verified",
  score: 70, completed: 7, total: 10,
  checks: [{ id: "api-key", label: "Create a scoped API key", weight: 10, count: 1, complete: true }],
  manifestDigest: integrationManifest().digest,
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};
const encoded = Buffer.from(JSON.stringify(certificate), "utf8").toString("base64url");
const token = `${encoded}.${await hmac(`integration-certificate.${encoded}`)}`;
const verified = await verifyIntegrationCertificate(token);
assert.equal(verified.verification.signatureValid, true);
assert.equal(verified.verification.expired, false);
assert.equal(verified.verification.manifestCurrent, true);
assert.equal(verified.certificate.subject.projectName, "Certified Test Project");
await assert.rejects(() => verifyIntegrationCertificate(`${encoded}x.${token.split(".")[1]}`), /invalid or has been altered/i);

console.log("Portable integration certificate signing, expiry, manifest binding, and tamper rejection passed.");
