/**
 * Rule Book 09 access desks + Rule Book 03/04 write gates.
 * Maps CropFort roles → who may invent vs enter vs approve vs read.
 */
import type { CropfortRole } from "@/types/cropfort";

/** SPX runs the Platform (admin + issue plans/WOs). */
export function isSpxDesk(role: CropfortRole | string): boolean {
  return role === "spx_validator" || role === "spx_platform_admin";
}

/** Silva — read all; approve plans / out-of-plan only. */
export function isSilvaDesk(role: CropfortRole | string): boolean {
  return role === "farm_owner";
}

/** B-Agro / RFSP — enter field data; cannot change plan/budget. */
export function isBagroDesk(role: CropfortRole | string): boolean {
  return role === "bagro_office" || role === "field_supervisor";
}

/** Chaka Buna — read WOs/weekly/own-block records; no Platform field entry. */
export function isChakaDesk(role: CropfortRole | string): boolean {
  return role === "farm_owner"; // farm_owner is Chaka Buna reviewer in CropFort labels
}

/** Create / edit monthly WO scope and weekly plan composition (SPX only). */
export function canEditPlanScope(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** Silva (and SPX admin) approve out-of-plan / submitted monthly & weekly. */
export function canApproveOutOfPlan(role: CropfortRole | string): boolean {
  return isSilvaDesk(role) || role === "spx_platform_admin";
}

/** SPX may also review weekly operationally; Silva for out-of-plan MWO. */
export function canReviewWeeklyPlan(role: CropfortRole | string): boolean {
  return isSpxDesk(role) || isSilvaDesk(role);
}

/** Issue Direct Instructions (SPX). */
export function canIssueDirectInstruction(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** Enter / create DFRs on the Platform (B-Agro only; SPX admin for support). */
export function canEnterFieldRecords(role: CropfortRole | string): boolean {
  return role === "bagro_office" || role === "spx_platform_admin";
}

/** Site-check DFRs (B-Agro field supervisor). */
export function canSiteCheckRecords(role: CropfortRole | string): boolean {
  return role === "field_supervisor" || role === "bagro_office" || role === "spx_platform_admin";
}

/** Validate DFRs (SPX). */
export function canValidateRecords(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** Chaka Buna / Silva may read but not invent field records. */
export function canReadFieldRecords(role: CropfortRole | string): boolean {
  return true;
}

export function deskLabel(role: CropfortRole | string): string {
  if (isSpxDesk(role)) return "SPX";
  if (role === "bagro_office") return "B-Agro";
  if (role === "field_supervisor") return "B-Agro (field)";
  if (isSilvaDesk(role)) return "Silva / Chaka Buna reviewer";
  return String(role);
}
