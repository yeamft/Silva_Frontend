import { PLAN_MONTHS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";
import type { CoreOpsActivity, MonthIntensity } from "@/types/core-ops";

export type MonthShares = Partial<Record<PlanMonth, number>>;

/** Same weights the backend uses for older plan lines that have no percentages. */
const INTENSITY_SHARE: Record<MonthIntensity, number> = { none: 0, light: 0.1, active: 0.25, peak: 0.4 };

type Scheduled = Pick<CoreOpsActivity, "intensities"> & { monthShares?: MonthShares };

export function scheduledMonths(intensities: Record<PlanMonth, MonthIntensity>): PlanMonth[] {
  return PLAN_MONTHS.filter((m) => intensities[m] && intensities[m] !== "none");
}

/** 100% split evenly in whole numbers; the first months take the remainder (3 months → 34 / 33 / 33). */
export function evenShares(months: PlanMonth[]): MonthShares {
  if (!months.length) return {};
  const base = Math.floor(100 / months.length);
  let extra = 100 - base * months.length;
  const out: MonthShares = {};
  for (const m of months) {
    out[m] = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
  }
  return out;
}

/** Percent total over the scheduled months, rounded to 2 decimals. */
export function sharesTotal(act: Scheduled): number {
  const shares = act.monthShares ?? {};
  const sum = scheduledMonths(act.intensities).reduce((s, m) => s + (shares[m] ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * New schedule for a line. When the scheduled months change, the percentages are split evenly
 * again across the new months; otherwise the planner's percentages are kept.
 */
export function withSchedule<T extends Scheduled>(act: T, intensities: Record<PlanMonth, MonthIntensity>): T {
  const before = scheduledMonths(act.intensities).join(",");
  const months = scheduledMonths(intensities);
  const monthShares = before === months.join(",") && act.monthShares ? act.monthShares : evenShares(months);
  return { ...act, intensities, monthShares };
}

/** Fraction of the line's annual amount that falls in `month`. */
export function monthShareOf(act: Scheduled, month: PlanMonth): number {
  const intensity = act.intensities?.[month] ?? "none";
  if (intensity === "none") return 0;
  const total = sharesTotal(act);
  if (total > 0) return (act.monthShares?.[month] ?? 0) / total;
  const weightTotal = PLAN_MONTHS.reduce((s, m) => s + INTENSITY_SHARE[act.intensities?.[m] ?? "none"], 0);
  return weightTotal ? INTENSITY_SHARE[intensity] / weightTotal : 0;
}
