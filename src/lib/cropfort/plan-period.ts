import { PLAN_MONTHS, PLAN_MONTH_LABELS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";

/**
 * A Core Operations plan covers the whole year or any six of its months.
 * Stored as "annual" or "months:<m>,<m>,…" (budget-year order, Oct → Sep). The older fixed halves,
 * "first_half" (Oct–Mar) and "second_half" (Apr–Sep), still read correctly.
 */
export type PlanPeriod = string;

export type PlanPeriodKind = "annual" | "six_months";

export const SIX_MONTH_COUNT = 6;

/** Month names shown for plan periods — the same English short names as the schedule grid. */
export const PLAN_PERIOD_MONTH_NAMES: Record<PlanMonth, string> = PLAN_MONTH_LABELS;

export const PLAN_PERIOD_KINDS: { id: PlanPeriodKind; label: string }[] = [
  { id: "annual", label: "Full year" },
  { id: "six_months", label: "6 months" },
];

const ordered = (months: Iterable<PlanMonth>) => {
  const set = new Set(months);
  return PLAN_MONTHS.filter((m) => set.has(m));
};

export function monthsForPeriod(period: PlanPeriod | null | undefined): readonly PlanMonth[] {
  if (period === "first_half") return PLAN_MONTHS.slice(0, 6);
  if (period === "second_half") return PLAN_MONTHS.slice(6);
  if (period?.startsWith("months:")) {
    const months = ordered(period.slice(7).split(",").filter((m): m is PlanMonth => (PLAN_MONTHS as readonly string[]).includes(m)));
    if (months.length) return months;
  }
  return PLAN_MONTHS;
}

/** Saved period for a set of months: all twelve is the full year. */
export function periodFromMonths(months: Iterable<PlanMonth>): PlanPeriod {
  const list = ordered(months);
  return list.length === 0 || list.length === PLAN_MONTHS.length ? "annual" : `months:${list.join(",")}`;
}

export function planPeriodOf(plan: { planPeriod?: string | null }): PlanPeriod {
  return monthsForPeriod(plan.planPeriod).length === PLAN_MONTHS.length ? "annual" : (plan.planPeriod as string);
}

export function isAnnualPeriod(period: PlanPeriod | null | undefined) {
  return monthsForPeriod(period).length === PLAN_MONTHS.length;
}

/** "Oct–Mar" for back-to-back months, else "Oct, Dec, …". */
export function monthsLabel(months: readonly PlanMonth[]) {
  if (!months.length) return "";
  const idx = months.map((m) => PLAN_MONTHS.indexOf(m));
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const names = months.map((m) => PLAN_PERIOD_MONTH_NAMES[m]);
  return consecutive && months.length > 1 ? `${names[0]}–${names[names.length - 1]}` : names.join(", ");
}

export function planPeriodLabel(period: PlanPeriod | null | undefined) {
  if (isAnnualPeriod(period)) return "Full year";
  const months = monthsForPeriod(period);
  return `${months.length} months · ${monthsLabel(months)}`;
}

/** Six back-to-back months from `start`, kept inside the budget year. */
export function sixMonthsFrom(start: PlanMonth): PlanMonth[] {
  const i = Math.min(PLAN_MONTHS.indexOf(start), PLAN_MONTHS.length - SIX_MONTH_COUNT);
  return PLAN_MONTHS.slice(i, i + SIX_MONTH_COUNT);
}
