import { fmtEtb } from "@/lib/cropfort/planning-helpers";
import type { FieldTicket, WorkOrder } from "@/store/cropfortOpsStore";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import type { CoreOpsPlan } from "@/types/core-ops";
import type { DailyFieldRecord, WeeklyPlan } from "@/types/agronomic-cycle";

export type PerformanceSnapshot = {
  planEtb: number;
  committedEtb: number;
  actualEtb: number;
  forecastEtb: number;
  varianceEtb: number;
  variancePct: number;
  spendPct: number;
  woOpen: number;
  woComplete: number;
  woProgressAvg: number;
  ticketsOpen: number;
  ticketsClosed: number;
  ticketClosePct: number;
  dfrPending: number;
  dfrValidated: number;
  dfrAvgVariancePct: number;
  weeklyActive: number;
  weeklySubmitted: number;
  attentionCount: number;
};

export function computePerformanceSnapshot(input: {
  plan: CoreOpsPlan | null;
  planBudgetEtb: number;
  committedEtb: number;
  workOrders: WorkOrder[];
  tickets: FieldTicket[];
  dfrs: DailyFieldRecord[];
  weekly: WeeklyPlan[];
}): PerformanceSnapshot {
  const { planBudgetEtb, committedEtb, workOrders, tickets, dfrs, weekly } = input;
  const actualEtb = Math.round(
    workOrders.reduce((s, w) => s + (w.etb || 0) * ((w.progress || 0) / 100), 0),
  );
  const planEtb = Math.round(planBudgetEtb);
  const forecastEtb = Math.round(
    (planEtb - actualEtb + Math.max(0, planEtb - committedEtb)) / 2 + actualEtb,
  );
  const varianceEtb = actualEtb - planEtb;
  const variancePct = planEtb > 0 ? Math.round((varianceEtb / planEtb) * 1000) / 10 : 0;
  const spendPct = planEtb > 0 ? Math.min(100, Math.round((actualEtb / planEtb) * 100)) : 0;

  const woOpen = workOrders.filter((w) => w.status !== "complete").length;
  const woComplete = workOrders.filter((w) => w.status === "complete").length;
  const woProgressAvg = workOrders.length
    ? Math.round(workOrders.reduce((s, w) => s + w.progress, 0) / workOrders.length)
    : 0;

  const ticketsClosed = tickets.filter((t) => t.status === "validated").length;
  const ticketsOpen = tickets.length - ticketsClosed;
  const ticketClosePct = tickets.length
    ? Math.round((ticketsClosed / tickets.length) * 100)
    : 0;

  const dfrPending = dfrs.filter(
    (r) => r.status === "submitted" || r.status === "site_checked",
  ).length;
  const dfrValidated = dfrs.filter((r) => r.status === "validated").length;
  const dfrWithVar = dfrs.filter((r) => r.status !== "draft");
  const dfrAvgVariancePct = dfrWithVar.length
    ? Math.round(
        (dfrWithVar.reduce((s, r) => s + Math.abs(r.variancePct), 0) / dfrWithVar.length) * 10,
      ) / 10
    : 0;

  const weeklyActive = weekly.filter((w) => w.status === "active").length;
  const weeklySubmitted = weekly.filter((w) => w.status === "submitted").length;
  const attentionCount =
    workOrders.filter((w) => w.attention !== "none").length +
    tickets.filter((t) => t.status === "returned" || ticketWaitingOn(t.status) === "asset_owner")
      .length;

  return {
    planEtb,
    committedEtb: Math.round(committedEtb),
    actualEtb,
    forecastEtb,
    varianceEtb,
    variancePct,
    spendPct,
    woOpen,
    woComplete,
    woProgressAvg,
    ticketsOpen,
    ticketsClosed,
    ticketClosePct,
    dfrPending,
    dfrValidated,
    dfrAvgVariancePct,
    weeklyActive,
    weeklySubmitted,
    attentionCount,
  };
}

export type VarianceRow = {
  id: string;
  label: string;
  meta: string;
  planned: number;
  committed: number;
  actual: number;
  variance: number;
  variancePct: number;
};

/** Activity-level variance from work orders grouped by activity name. */
export function activityVarianceRows(
  workOrders: WorkOrder[],
  tickets: FieldTicket[],
): VarianceRow[] {
  const map = new Map<
    string,
    { planned: number; actual: number; committed: number; codes: string[] }
  >();

  for (const wo of workOrders) {
    const key = wo.activity || wo.title;
    const cur = map.get(key) ?? { planned: 0, actual: 0, committed: 0, codes: [] };
    cur.planned += wo.etb;
    cur.actual += Math.round(wo.etb * (wo.progress / 100));
    if (wo.status !== "draft") cur.committed += wo.etb;
    cur.codes.push(wo.code);
    map.set(key, cur);
  }

  for (const t of tickets) {
    if (t.status !== "validated") continue;
    // validated ticket spend already reflected via WO progress; skip double-count
  }

  return [...map.entries()]
    .map(([label, v]) => {
      const variance = v.actual - v.planned;
      const variancePct =
        v.planned > 0 ? Math.round((variance / v.planned) * 1000) / 10 : 0;
      return {
        id: label,
        label,
        meta: `${v.codes.length} WO(s)`,
        planned: v.planned,
        committed: v.committed,
        actual: v.actual,
        variance,
        variancePct,
      };
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

export type BlockProgressRow = {
  block: string;
  avg: number;
  spend: number;
  planned: number;
  tickets: number;
  status: "complete" | "on_track" | "at_risk" | "overdue";
};

export { fmtEtb };
