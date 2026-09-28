/** Core Operations annual plan (frontend types; persisted via /api/v1/programme-plans). */

import type { PlanMonth } from "@/lib/cropfort/ethiopian-year";

export type CoreOpsPlanStatus = "draft" | "finalized" | "submitted";
export type ActivityScope = "block" | "off_block";
export type MonthIntensity = "none" | "peak" | "active" | "light";
export type ScheduleStatus = "not_scheduled" | "scheduled";
export type AfpPromotionStatus = "auto_approved" | "pending_silva" | "approved" | "returned";
export type CoreOpsStep = "setup" | "activities" | "calendar" | "review";

export type AgreedRateSnapshot = {
  rateCardId: string;
  unitRateEtb: number;
  costKind: string;
  normMdPerUnit: number | null;
  approvedAt: string | null;
};

export type BlockAllocation = {
  blockId: string;
  blockCode: string;
  qty: number;
};

export type CoreOpsActivity = {
  id: string;
  category: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  uom: string;
  scope: ActivityScope;
  included: boolean;
  /** Annual planned quantity (primary field). */
  plannedQty: number;
  /** Optional per-block split; sum should match plannedQty when used. */
  blockAllocations: BlockAllocation[];
  agreedRate: AgreedRateSnapshot | null;
  plannedCost: number;
  intensities: Record<PlanMonth, MonthIntensity>;
  /** Operating manual on the Platform (RB09.3) — required before submit. */
  manualsRef: string;
  /** Core / Project / Intervention (RB10). */
  serviceType: "core_ops" | "project" | "intervention";
};

export type AfpPromotion = {
  id: string;
  planId: string;
  totalEtb: number;
  band: "A" | "B" | "C" | "D";
  status: AfpPromotionStatus;
  createdAt: string;
  note: string;
};

export type CoreOpsPlan = {
  id: string;
  /** Programme plan title (not workspace / farm area). */
  name?: string;
  code?: string;
  description?: string;
  /** Global planning cycle label e.g. "2027 Programme". */
  planningCycleLabel?: string;
  farmEstateId: string;
  farmName: string;
  budgetYearGc: number;
  budgetYearLabel: string;
  /** Program band set id (Schedule 3) used for AFE routing. */
  programBandSetId: string | null;
  totalHa: number;
  vendorLabel: string;
  notes: string;
  status: CoreOpsPlanStatus;
  statusRaw?: string;
  /** Block ids applicable to this plan (default: all for farm). */
  applicableBlockIds: string[];
  activityIds: string[];
  activities: Record<string, CoreOpsActivity>;
  promotions: AfpPromotion[];
  plannedCostEtb?: number;
  includedCount?: number;
  scheduledCount?: number;
  ratesOkCount?: number;
  totalLines?: number;
  archivedAt?: string | null;
  updatedAt: string;
};

export type EligibleRateActivity = {
  activityId: string;
  activityCode: string;
  activityName: string;
  category: string;
  uom: string;
  costKind: string;
  rateCardId: string;
  unitRateEtb: number;
  normMdPerUnit: number | null;
  farmEstateId: string;
  farmEstateName: string | null;
  approvedAt: string | null;
};

export type PlanBlockOption = {
  id: string;
  code: string;
  name: string;
  farmAreaId: string | null;
};

export type PlanCompletion = {
  eligibleCount: number;
  includedCount: number;
  ratesOkCount: number;
  ratesNeededCount: number;
  scheduledCount: number;
  missingQtyCount: number;
  unresolvedRateCount: number;
  unscheduledCount: number;
  budgetEtb: number;
};

export type ReviewIssue = {
  id: string;
  severity: "block" | "warn";
  message: string;
  step: CoreOpsStep;
  activityId?: string;
};
