/**
 * Programme plans (Core Ops) — `/api/v1/programme-plans`.
 * Multiple named plans per workspace / farm area / budget year.
 */
import { apiFetch } from "@/lib/api/http";
import type { CoreOpsActivity, CoreOpsPlan, CoreOpsPlanStatus } from "@/types/core-ops";
import type { PlanMonth } from "@/lib/cropfort/ethiopian-year";
import type { MonthIntensity } from "@/types/core-ops";

export type ProgrammePlanDto = CoreOpsPlan & {
  statusRaw?: string;
  plannedCostEtb?: number;
  resolvedBand?: "A" | "B" | "C" | "D" | null;
  approvalRequirement?: string | null;
  returnedComment?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  includedCount?: number;
  scheduledCount?: number;
  ratesOkCount?: number;
  totalLines?: number;
};

export type ProgrammeReadiness = {
  canSubmit: boolean;
  blockers: { code: string; message: string; activityIds?: string[] }[];
  warnings: { code: string; message: string }[];
  metrics: {
    totalActivityLines: number;
    includedLines: number;
    missingRates: number;
    validRates: number;
    unscheduledActivities: number;
    scheduledActivities: number;
    missingQty: number;
    missingManuals: number;
    totalPlannedCost: number;
    band: "A" | "B" | "C" | "D";
    approvalLevel: string;
    approvalRequirement: string;
    thresholdExceeded: boolean;
  };
};

export type ProgrammeSubmitResult = {
  plan: ProgrammePlanDto;
  readiness: ProgrammeReadiness;
  band: {
    band: "A" | "B" | "C" | "D";
    thresholdExceeded: boolean;
    approvalLevel: string;
    approvalRequirement: string;
  };
  promotion: {
    id: string;
    planId: string;
    totalEtb: number;
    band: "A" | "B" | "C" | "D";
    status: "auto_approved" | "pending_silva";
    createdAt: string;
    note: string;
  };
};

function linesFromPlan(plan: CoreOpsPlan) {
  return plan.activityIds
    .map((id) => plan.activities[id])
    .filter(Boolean)
    .map((a: CoreOpsActivity) => ({
      id: a.id,
      activityId: a.activityId,
      activityCode: a.activityCode,
      activityName: a.activityName,
      category: a.category,
      uom: a.uom,
      scope: a.scope,
      included: a.included,
      plannedQty: a.plannedQty,
      agreedRate: a.agreedRate,
      intensities: a.intensities,
      blockAllocations: a.blockAllocations,
      manualsRef: a.manualsRef,
      serviceType: a.serviceType,
    }));
}

export function listProgrammePlans(params?: {
  farmEstateId?: string;
  planYear?: number;
  status?: string;
  q?: string;
  includeArchived?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.farmEstateId) q.set("farmEstateId", params.farmEstateId);
  if (params?.planYear) q.set("planYear", String(params.planYear));
  if (params?.status) q.set("status", params.status);
  if (params?.q) q.set("q", params.q);
  if (params?.includeArchived) q.set("includeArchived", "1");
  const qs = q.toString();
  return apiFetch<ProgrammePlanDto[]>(`/programme-plans${qs ? `?${qs}` : ""}`);
}

export function createProgrammePlan(input: {
  name: string;
  farmEstateId: string;
  planYear: number;
  planningCycleLabel?: string;
  budgetYearLabel?: string;
  description?: string;
  notes?: string;
  vendorLabel?: string;
  code?: string;
  applicableBlockIds?: string[];
}) {
  return apiFetch<ProgrammePlanDto>("/programme-plans", {
    method: "POST",
    body: input,
  });
}

/** @deprecated Prefer createProgrammePlan — kept for legacy ensurePlan paths. */
export function getOrCreateProgrammePlan(farmEstateId: string, planYear: number) {
  const q = new URLSearchParams({
    farmEstateId,
    planYear: String(planYear),
  });
  return apiFetch<ProgrammePlanDto>(`/programme-plans/current?${q}`);
}

export function getProgrammePlan(id: string) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}`);
}

export function upsertProgrammePlan(
  id: string,
  plan: CoreOpsPlan,
  status?: CoreOpsPlanStatus,
) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}`, {
    method: "PUT",
    body: {
      name: plan.name,
      description: plan.description,
      planningCycleLabel: plan.planningCycleLabel,
      notes: plan.notes,
      vendorLabel: plan.vendorLabel,
      budgetYearLabel: plan.budgetYearLabel,
      programBandSetId: plan.programBandSetId,
      totalHa: plan.totalHa,
      applicableBlockIds: plan.applicableBlockIds,
      status: status ?? plan.status,
      lines: linesFromPlan(plan),
    },
  });
}

export function patchProgrammeSchedule(
  id: string,
  lines: {
    id: string;
    intensities?: Record<PlanMonth, MonthIntensity>;
    from?: PlanMonth;
    to?: PlanMonth;
    intensity?: MonthIntensity;
  }[],
) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}/schedule`, {
    method: "PATCH",
    body: { lines },
  });
}

export function getProgrammeReadiness(id: string) {
  return apiFetch<ProgrammeReadiness>(`/programme-plans/${id}/readiness`);
}

export function submitProgrammePlan(id: string) {
  return apiFetch<ProgrammeSubmitResult>(`/programme-plans/${id}/submit`, {
    method: "POST",
  });
}

export function decideProgrammePlan(
  id: string,
  decision: "approve" | "return",
  comment?: string,
) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}

export function duplicateProgrammePlan(id: string) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}/duplicate`, {
    method: "POST",
  });
}

export function archiveProgrammePlan(id: string) {
  return apiFetch<ProgrammePlanDto>(`/programme-plans/${id}/archive`, {
    method: "POST",
  });
}
