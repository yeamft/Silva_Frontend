/**
 * Monthly work orders — `/api/v1/monthly-work-orders`.
 */
import { apiFetch } from "@/lib/api/http";
import type { MonthlyWorkOrder, ProcessLoop } from "@/types/agronomic-cycle";

export type MonthlyWorkOrderDto = MonthlyWorkOrder;

export function listMonthlyWorkOrders(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<MonthlyWorkOrderDto[]>(`/monthly-work-orders${qs ? `?${qs}` : ""}`);
}

export function createMonthlyWorkOrder(input: {
  ethiopianMonth: string;
  yearGc: number;
  code?: string;
  farmId?: string | null;
  farmName?: string;
  sourcePlanId?: string | null;
  outOfPlanReason?: string;
  loop?: string;
  lastMonthInsights?: string;
  structuredInsights?: unknown;
  recommendedAdjustments?: unknown[];
  note?: string;
  lines: MonthlyWorkOrder["lines"];
}) {
  return apiFetch<MonthlyWorkOrderDto>("/monthly-work-orders", {
    method: "POST",
    body: {
      ...input,
      lines: input.lines.map(({ id: _id, ...rest }) => rest),
    },
  });
}

export function submitMonthlyWorkOrder(id: string) {
  return apiFetch<MonthlyWorkOrderDto>(`/monthly-work-orders/${id}/submit`, { method: "POST" });
}

export function decideMonthlyWorkOrder(
  id: string,
  decision: "approve" | "return",
  comment?: string,
) {
  return apiFetch<MonthlyWorkOrderDto>(`/monthly-work-orders/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}

export function activateMonthlyWorkOrder(id: string) {
  return apiFetch<MonthlyWorkOrderDto>(`/monthly-work-orders/${id}/activate`, { method: "POST" });
}

export function setMonthlyWorkOrderLoop(id: string, loop: ProcessLoop | string) {
  return apiFetch<MonthlyWorkOrderDto>(`/monthly-work-orders/${id}/loop`, {
    method: "POST",
    body: { loop },
  });
}

export function addMonthlyOutOfPlanLine(
  id: string,
  input: {
    activityName: string;
    activityCode?: string;
    activityId?: string;
    blockId?: string;
    blockCode?: string;
    plannedQty: number;
    unit?: string;
    etb: number;
    manualsRef?: string;
    reason: string;
  },
) {
  return apiFetch<MonthlyWorkOrderDto>(`/monthly-work-orders/${id}/out-of-plan-lines`, {
    method: "POST",
    body: input,
  });
}
