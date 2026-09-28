import { apiFetch } from "@/lib/api/http";
import type { CoreOpsPlan } from "@/types/core-ops";

export type PlanScenarioDto = {
  id: string;
  name: string;
  note: string;
  savedAt: string;
  snapshot: CoreOpsPlan;
  includedCount: number;
  budgetEtb: number;
  scheduledCount: number;
  createdAt: string;
  updatedAt: string;
};

export function listPlanScenarios() {
  return apiFetch<PlanScenarioDto[]>("/plan-scenarios");
}

export function createPlanScenario(input: {
  name: string;
  note?: string;
  snapshot: CoreOpsPlan;
  includedCount?: number;
  budgetEtb?: number;
  scheduledCount?: number;
}) {
  return apiFetch<PlanScenarioDto>("/plan-scenarios", { method: "POST", body: input });
}

export function renamePlanScenario(id: string, name: string) {
  return apiFetch<PlanScenarioDto>(`/plan-scenarios/${id}`, {
    method: "PATCH",
    body: { name },
  });
}

export function deletePlanScenario(id: string) {
  return apiFetch<{ ok: boolean }>(`/plan-scenarios/${id}`, { method: "DELETE" });
}
