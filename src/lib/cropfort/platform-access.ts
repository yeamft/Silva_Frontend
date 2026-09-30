/**
 * Rule Book 09 access desks + Rule Book 03/04 write gates.
 * Maps CropFort roles → who may invent vs enter vs approve vs read.
 */
import type { CropfortRole } from "@/types/cropfort";

/** SPX runs the Platform (admin + issue plans/WOs). */
export function isSpxDesk(role: CropfortRole | string): boolean {
  return role === "spx_validator" || role === "spx_platform_admin";
}

/** Silva / asset owner — read all; approve plans / AFEs / out-of-plan; never create plans. */
export function isSilvaDesk(role: CropfortRole | string): boolean {
  return role === "farm_owner";
}

/** B-Agro / RFSP — enter field data; cannot change plan/budget. */
export function isBagroDesk(role: CropfortRole | string): boolean {
  return role === "bagro_office" || role === "field_supervisor";
}

/** Create / edit programme, monthly WO scope, and weekly plan composition (SPX only). */
export function canEditPlanScope(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** Alias — programme Core Ops invent / edit / submit. */
export function canCreateProgrammePlan(role: CropfortRole | string): boolean {
  return canEditPlanScope(role);
}

/** Silva / asset owner decide submitted AFP, AFE, monthly, weekly. */
export function canApproveOutOfPlan(role: CropfortRole | string): boolean {
  return isSilvaDesk(role);
}

/** Approve operational queues (AFP / AFE / monthly / weekly). */
export function canApproveOperations(role: CropfortRole | string): boolean {
  return isSilvaDesk(role);
}

/** Weekly plan approve/return — Silva / asset owner only (SPX creates & submits). */
export function canReviewWeeklyPlan(role: CropfortRole | string): boolean {
  return isSilvaDesk(role);
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

/** UI shell mode — SPX keeps the platform chrome; vendor/Silva get distinct desks. */
export type DeskMode = "spx" | "vendor" | "silva";

export function getDeskMode(role: CropfortRole | string): DeskMode {
  if (isSpxDesk(role)) return "spx";
  if (isSilvaDesk(role) || role === "farm_owner_viewer") return "silva";
  if (isBagroDesk(role)) return "vendor";
  return "spx";
}

export function deskLabel(role: CropfortRole | string): string {
  if (isSpxDesk(role)) return "SPX";
  if (role === "bagro_office") return "B-Agro";
  if (role === "field_supervisor") return "B-Agro (field)";
  if (isSilvaDesk(role) || role === "farm_owner_viewer") return "Silva / asset owner";
  return String(role);
}
