import {
  PLAN_MONTHS,
  PLAN_MONTH_LABELS,
  type PlanMonth,
} from "@/lib/cropfort/ethiopian-year";
import type { CoreOpsActivity, CoreOpsPlan, MonthIntensity } from "@/types/core-ops";
import { scheduleLabel, scheduleStatusOf } from "@/store/coreOpsPlanStore";

export function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${Math.round(n).toLocaleString()}`;
}

export function intensityLetter(i: MonthIntensity): string {
  if (i === "peak") return "P";
  if (i === "active") return "A";
  if (i === "light") return "L";
  return "·";
}

export function intensityClass(i: MonthIntensity): string {
  if (i === "peak") return "bg-primary text-primary-foreground";
  if (i === "active") return "bg-primary/25 text-foreground";
  if (i === "light") return "bg-muted text-muted-foreground";
  return "bg-transparent text-muted-foreground/40";
}

export function includedActivities(plan: CoreOpsPlan | null): CoreOpsActivity[] {
  if (!plan) return [];
  return plan.activityIds
    .map((id) => plan.activities[id])
    .filter((a): a is CoreOpsActivity => Boolean(a?.included));
}

/** Active months for intensity-weighted man-day split. */
function activeMonthWeights(act: CoreOpsActivity): Record<PlanMonth, number> {
  const weights: Record<PlanMonth, number> = {
    oct: 0,
    nov: 0,
    dec: 0,
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
  };
  for (const m of PLAN_MONTHS) {
    const i = act.intensities[m];
    if (i === "peak") weights[m] = 3;
    else if (i === "active") weights[m] = 2;
    else if (i === "light") weights[m] = 1;
  }
  return weights;
}

/** Labor man-days by month: qty × norm, split across scheduled months by intensity. */
export function manDaysByMonth(activities: CoreOpsActivity[]): Record<PlanMonth, number> {
  const totals: Record<PlanMonth, number> = {
    oct: 0,
    nov: 0,
    dec: 0,
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
  };
  for (const act of activities) {
    if (act.agreedRate?.costKind !== "labor") continue;
    const norm = act.agreedRate.normMdPerUnit ?? 0;
    if (norm <= 0 || act.plannedQty <= 0) continue;
    const totalMd = act.plannedQty * norm;
    const weights = activeMonthWeights(act);
    const sumW = PLAN_MONTHS.reduce((s, m) => s + weights[m], 0);
    if (sumW === 0) {
      // Unscheduled: park under first month for visibility
      totals.oct += totalMd;
      continue;
    }
    for (const m of PLAN_MONTHS) {
      if (weights[m] > 0) totals[m] += (totalMd * weights[m]) / sumW;
    }
  }
  for (const m of PLAN_MONTHS) {
    totals[m] = Math.round(totals[m] * 10) / 10;
  }
  return totals;
}

export function categoryBudget(activities: CoreOpsActivity[]) {
  const map = new Map<string, { category: string; etb: number; count: number }>();
  for (const act of activities) {
    const cur = map.get(act.category) ?? { category: act.category, etb: 0, count: 0 };
    cur.etb += act.plannedCost;
    cur.count += 1;
    map.set(act.category, cur);
  }
  return [...map.values()]
    .map((r) => ({ ...r, etb: Math.round(r.etb * 100) / 100 }))
    .sort((a, b) => b.etb - a.etb);
}

export { PLAN_MONTHS, PLAN_MONTH_LABELS, scheduleLabel, scheduleStatusOf };
export type { PlanMonth };
