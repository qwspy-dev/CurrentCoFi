import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { integrationManifest } from "../developer/integration-readiness.js";
import { mcpManifest } from "../developer/mcp-manifest.js";
import { getAuditReadiness } from "../security/audit-readiness.js";
import { getSecurityPosture } from "../security/posture.js";
import { buildGrantApplicationPacket, grantApplicationMarkdown } from "./application-packet.js";
import { getGrantDossier } from "./dossier.js";

type BundleSource = { path: string; mediaType: string; content: string };

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function reviewerBundleDigest(value: unknown) {
  return sha256(stable(value));
}

export function buildReviewerBundle(input: {
  generatedAt: string;
  application: ReturnType<typeof buildGrantApplicationPacket>;
  dossier: Awaited<ReturnType<typeof getGrantDossier>>;
  security: ReturnType<typeof getSecurityPosture>;
  auditReadiness: ReturnType<typeof getAuditReadiness>;
  integration: ReturnType<typeof integrationManifest>;
  mcp: ReturnType<typeof mcpManifest>;
}) {
  const boundary = "This reviewer bundle proves internally and publicly verifiable Arc testnet work. It does not claim external pilots, an independent audit, legal approval, Arc mainnet deployment, an open grant window, or Circle endorsement.";
  const externalGaps = {
    boundary,
    applicantInputs: input.application.applicantInputs,
    externalGates: input.application.externalGates,
    submissionChecklist: input.application.submissionChecklist,
  };
  const reviewerLinks = {
    ...input.application.reviewerLinks,
    bundleManifest: "https://www.currentco.finance/api/v1/grant-bundle",
    bundleDownload: "https://www.currentco.finance/api/v1/grant-bundle/download",
  };
  const readme = [
    "# Current CoFi — Circle reviewer bundle",
    "",
    `Generated: ${input.generatedAt}`,
    "Environment: Arc testnet",
    "",
    `> ${boundary}`,
    "",
    "## Review order",
    "",
    "1. Read `application.md` for the concise submission narrative.",
    "2. Inspect `dossier.json` and `application.json` for digest-addressed evidence.",
    "3. Review `security.json` and `audit-readiness.json` before evaluating production claims.",
    "4. Inspect the builder surfaces in `integration-manifest.json` and `mcp-manifest.json`.",
    "5. Read `external-gaps.json` for every item Current CoFi cannot honestly self-attest.",
    "6. Verify every content file against `checksums.sha256`, then verify `manifest.json` using its declared SHA-256 digest.",
    "",
    "No recipient identity, wallet address, API key, session, private founder detail, or private pilot contact is included.",
    "",
    "Live evidence routes are listed in `reviewer-links.json`.",
  ].join("\n");
  const sources: BundleSource[] = [
    { path: "README.md", mediaType: "text/markdown", content: `${readme}\n` },
    { path: "application.md", mediaType: "text/markdown", content: `${grantApplicationMarkdown(input.application)}\n` },
    { path: "application.json", mediaType: "application/json", content: json(input.application) },
    { path: "dossier.json", mediaType: "application/json", content: json(input.dossier) },
    { path: "security.json", mediaType: "application/json", content: json(input.security) },
    { path: "audit-readiness.json", mediaType: "application/json", content: json(input.auditReadiness) },
    { path: "integration-manifest.json", mediaType: "application/json", content: json(input.integration) },
    { path: "mcp-manifest.json", mediaType: "application/json", content: json(input.mcp) },
    { path: "external-gaps.json", mediaType: "application/json", content: json(externalGaps) },
    { path: "reviewer-links.json", mediaType: "application/json", content: json(reviewerLinks) },
  ];
  const files = sources.map((source) => ({
    path: source.path,
    mediaType: source.mediaType,
    bytes: Buffer.byteLength(source.content),
    sha256: sha256(source.content),
  }));
  const manifestBody = {
    schemaVersion: "current-circle-reviewer-bundle-v1",
    product: "Current CoFi",
    environment: "Arc testnet",
    generatedAt: input.generatedAt,
    boundary,
    applicationDigest: input.application.digest,
    dossierDigest: input.dossier.digest,
    securityDigest: reviewerBundleDigest(input.security),
    auditManifestDigest: input.auditReadiness.manifestDigest,
    integrationDigest: input.integration.digest,
    mcpDigest: input.mcp.digest,
    privacy: input.application.privacy,
    verification: {
      algorithm: "SHA-256",
      instructions: "Hash each content file exactly as stored and compare it with files[].sha256. Then remove bundleDigest from manifest.json, stable-sort object keys recursively, and SHA-256 the resulting UTF-8 JSON.",
    },
    files,
    reviewerLinks,
  };
  const manifest = { ...manifestBody, bundleDigest: reviewerBundleDigest(manifestBody) };
  const checksums = `${files.map((file) => `${file.sha256}  ${file.path}`).join("\n")}\n`;
  const archiveFiles = Object.fromEntries([
    ...sources.map((source) => [source.path, strToU8(source.content)]),
    ["checksums.sha256", strToU8(checksums)],
    ["manifest.json", strToU8(json(manifest))],
  ]);
  return { manifest, archive: zipSync(archiveFiles, { level: 9 }) };
}

export function verifyReviewerBundleManifest(manifest: Record<string, unknown>) {
  const { bundleDigest, ...body } = manifest;
  return typeof bundleDigest === "string" && bundleDigest === reviewerBundleDigest(body);
}

export async function createGrantReviewerBundle() {
  const dossier = await getGrantDossier();
  const application = buildGrantApplicationPacket({ generatedAt: dossier.generatedAt, dossier });
  return buildReviewerBundle({
    generatedAt: dossier.generatedAt,
    application,
    dossier,
    security: getSecurityPosture(),
    auditReadiness: getAuditReadiness(),
    integration: integrationManifest(),
    mcp: mcpManifest(),
  });
}

export type GrantReviewerBundleManifest = Awaited<ReturnType<typeof createGrantReviewerBundle>>["manifest"];
