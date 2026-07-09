import type { Tenant } from "@prisma/client";

// Studio-configurable class vocabulary (video spec X9), kept in the
// policies JSON blob. Legacy enum-style difficulty values still render.
export const DEFAULT_FORMATS = ["Mat", "Reformer", "Barre", "Private"];
export const DEFAULT_LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];
const LEGACY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"];

type Pol = { classFormats?: string[]; difficultyLevels?: string[] };

export function classFormats(tenant: Pick<Tenant, "policies">): string[] {
  const v = ((tenant.policies ?? {}) as Pol).classFormats;
  return Array.isArray(v) && v.length > 0 ? v : DEFAULT_FORMATS;
}

export function difficultyLevels(tenant: Pick<Tenant, "policies">): string[] {
  const v = ((tenant.policies ?? {}) as Pol).difficultyLevels;
  return Array.isArray(v) && v.length > 0 ? v : DEFAULT_LEVELS;
}

export function isValidDifficulty(tenant: Pick<Tenant, "policies">, value: string): boolean {
  return difficultyLevels(tenant).includes(value) || LEGACY_LEVELS.includes(value);
}

// Human label for either a legacy enum value or a studio-defined one.
export function difficultyLabel(value: string): string {
  if (LEGACY_LEVELS.includes(value)) {
    const s = value.toLowerCase().replace("_", " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return value;
}
