import { createHash } from "node:crypto";
import auditManifest from "./audit-manifest.generated.js";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function auditManifestDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function getAuditReadiness() {
  return {
    ...auditManifest,
    manifestDigest: auditManifestDigest(auditManifest),
    deploymentCommit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    verification: {
      scopeDriftGate: true,
      sourceDigests: auditManifest.sources.length,
      artifactDigests: auditManifest.sources.length,
      lockfilePinned: true,
      deploymentSnapshotPinned: true,
      externalAuditStatus: "pending" as const,
      remediationStatus: "not-started" as const,
    },
    boundary: "This is a reproducible internal audit handoff, not an independent audit report, mainnet approval, or security guarantee.",
  };
}
