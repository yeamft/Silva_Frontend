/**
 * Cropfort weekly plans — `/api/v1/weekly-plans`.
 */
import { apiFetch } from "@/lib/api/http";
import type { ProcessLoop, WeeklyPlan, WeeklyPlanLine } from "@/types/agronomic-cycle";

export type WeeklyPlanDto = WeeklyPlan & {
  programId?: string;
  returnedComment?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  activatedAt?: string | null;
  createdByUserId?: string;
  createdByName?: string | null;
};

export function listWeeklyPlans(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<WeeklyPlanDto[]>(`/weekly-plans${qs ? `?${qs}` : ""}`);
}

export function getWeeklyPlan(id: string) {
  return apiFetch<WeeklyPlanDto>(`/weekly-plans/${id}`);
}

export function createWeeklyPlan(input: {
  weekLabel: string;
  code?: string;
  monthlyWoId?: string | null;
  monthlyWoCode?: string | null;
  note?: string;
  loop?: string;
  directInstructionIds?: string[];
  lines: Omit<WeeklyPlanLine, "id">[];
}) {
  return apiFetch<WeeklyPlanDto>("/weekly-plans", { method: "POST", body: input });
}

export function submitWeeklyPlan(id: string) {
  return apiFetch<WeeklyPlanDto>(`/weekly-plans/${id}/submit`, { method: "POST" });
}

export function decideWeeklyPlan(
  id: string,
  decision: "approve" | "return",
  comment?: string,
) {
  return apiFetch<WeeklyPlanDto>(`/weekly-plans/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}

export function activateWeeklyPlan(id: string) {
  return apiFetch<WeeklyPlanDto>(`/weekly-plans/${id}/activate`, { method: "POST" });
}

export function setWeeklyPlanLoop(id: string, loop: ProcessLoop | string) {
  return apiFetch<WeeklyPlanDto>(`/weekly-plans/${id}/loop`, {
    method: "POST",
    body: { loop },
  });
}
