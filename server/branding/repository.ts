import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { projects } from "../db/schema.js";
import { ApiError } from "../http.js";

export type ProjectBrand = {
  primaryColor: string;
  accentColor: string;
  successColor: string;
  surface: "midnight" | "tide" | "light";
  headline: string;
  claimCta: string;
  poweredByCurrent: true;
};

const defaults: ProjectBrand = {
  primaryColor: "#0868B7",
  accentColor: "#22E4D5",
  successColor: "#00A94F",
  surface: "midnight",
  headline: "A funded current is waiting for you.",
  claimCta: "Claim your tokens",
  poweredByCurrent: true,
};

function string(value: unknown, fallback: string, maximum: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maximum) : fallback;
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function safeHttpsUrl(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 1_000) throw new ApiError(400, "INVALID_BRAND_URL", `${field} must be a valid HTTPS URL.`);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("unsafe");
    return url.toString();
  } catch {
    throw new ApiError(400, "INVALID_BRAND_URL", `${field} must be a valid HTTPS URL.`);
  }
}

export function projectBrand(settings: Record<string, unknown> | null | undefined): ProjectBrand {
  const source = settings?.brand && typeof settings.brand === "object" && !Array.isArray(settings.brand)
    ? settings.brand as Record<string, unknown>
    : {};
  return {
    primaryColor: color(source.primaryColor, defaults.primaryColor),
    accentColor: color(source.accentColor, defaults.accentColor),
    successColor: color(source.successColor, defaults.successColor),
    surface: source.surface === "tide" || source.surface === "light" ? source.surface : "midnight",
    headline: string(source.headline, defaults.headline, 120),
    claimCta: string(source.claimCta, defaults.claimCta, 40),
    poweredByCurrent: true,
  };
}

export function publicProjectBrand(project: typeof projects.$inferSelect) {
  return {
    name: project.name,
    description: project.description,
    logoUrl: project.logoUrl,
    websiteUrl: project.websiteUrl,
    brand: projectBrand(project.settings),
  };
}

export async function readProjectBrand(projectId: string) {
  const project = await getDb().query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "This project does not exist.");
  return publicProjectBrand(project);
}

export async function updateProjectBrand(projectId: string, body: Record<string, unknown>) {
  const current = await getDb().query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!current) throw new ApiError(404, "PROJECT_NOT_FOUND", "This project does not exist.");
  const requested = body.brand && typeof body.brand === "object" && !Array.isArray(body.brand)
    ? body.brand as Record<string, unknown>
    : {};
  for (const field of ["primaryColor", "accentColor", "successColor"] as const) {
    if (requested[field] !== undefined && !/^#[0-9a-f]{6}$/i.test(String(requested[field]))) {
      throw new ApiError(400, "INVALID_BRAND_COLOR", `${field} must use six-digit hexadecimal notation.`);
    }
  }
  if (requested.surface !== undefined && !["midnight", "tide", "light"].includes(String(requested.surface))) {
    throw new ApiError(400, "INVALID_BRAND_SURFACE", "Choose midnight, tide, or light for the hosted surface.");
  }
  const brand = projectBrand({ brand: { ...projectBrand(current.settings), ...requested } });
  const name = string(body.name, current.name, 80);
  const description = body.description === null ? null : string(body.description, current.description ?? "", 500) || null;
  const logoUrl = Object.hasOwn(body, "logoUrl") ? safeHttpsUrl(body.logoUrl, "logoUrl") : current.logoUrl;
  const websiteUrl = Object.hasOwn(body, "websiteUrl") ? safeHttpsUrl(body.websiteUrl, "websiteUrl") : current.websiteUrl;
  const [updated] = await getDb().update(projects).set({
    name,
    description,
    logoUrl,
    websiteUrl,
    settings: { ...current.settings, brand },
    updatedAt: new Date(),
  }).where(eq(projects.id, projectId)).returning();
  return publicProjectBrand(updated);
}
