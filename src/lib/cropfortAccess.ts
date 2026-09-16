import type { CropfortRole } from "@/types/cropfort";

/** UI gating only. Real authorization must be enforced on the API. */
export function canViewRateCard(role: CropfortRole): boolean {
  return role === "spx_validator" || role === "farm_owner" || role === "spx_platform_admin";
}

export function canEditRateCard(role: CropfortRole): boolean {
  return role === "spx_validator" || role === "spx_platform_admin";
}

export function canDecideRateCard(role: CropfortRole): boolean {
  return role === "farm_owner";
}

/** Create / rename / deactivate rate categories (SPX only). */
export function canManageRateCardCategories(role: CropfortRole): boolean {
  return canEditRateCard(role);
}

export function canManageUsers(role: CropfortRole): boolean {
  return role === "spx_platform_admin";
}

export function canViewOrgMap(role: CropfortRole): boolean {
  return role === "spx_platform_admin" || role === "spx_validator";
}

export function canManageOrgMap(role: CropfortRole): boolean {
  return role === "spx_platform_admin";
}

export function canManagePrograms(role: CropfortRole): boolean {
  return role === "spx_platform_admin";
}
