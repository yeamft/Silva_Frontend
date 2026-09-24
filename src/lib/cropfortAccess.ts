import type { CropfortRole } from "@/types/cropfort";

/** UI gating only. Real authorization must be enforced on the API. */
export function canViewRateCard(role: CropfortRole): boolean {
  return role === "spx_validator" || role === "farm_owner" || role === "spx_platform_admin";
}

/** SPX maker — draft, edit, submit benchmark / rate proposals. */
export function canEditRateCard(role: CropfortRole): boolean {
  return role === "spx_validator" || role === "spx_platform_admin";
}

/** Alias: SPX proposes rates (Maker). */
export function canProposeRateCard(role: CropfortRole): boolean {
  return canEditRateCard(role);
}

/**
 * Chaka Buna reviewer (checker) — approve / return submitted surveys and rate proposals.
 * Maps to farm_owner in current RBAC (owning-company / Silva approver), not SPX.
 */
export function canDecideRateCard(role: CropfortRole): boolean {
  return role === "farm_owner";
}

/** Alias: Chaka Buna reviewer approves rates (Checker). */
export function canApproveAsAssetOwner(role: CropfortRole): boolean {
  return canDecideRateCard(role);
}

/** Benchmark surveys + Archive — SPX only (asset owner sees Rate cards inbox only). */
export function canViewBenchmarkSurveys(role: CropfortRole): boolean {
  return canProposeRateCard(role);
}

export function canViewRateCardArchive(role: CropfortRole): boolean {
  return canProposeRateCard(role);
}

/** Create / rename / deactivate rate categories (SPX only). */
export function canManageRateCardCategories(role: CropfortRole): boolean {
  return canEditRateCard(role);
}

/** Labor / equipment / materials catalogs — SPX only (not farm_owner). */
export function canManageCatalogs(role: CropfortRole): boolean {
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
