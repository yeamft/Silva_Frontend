import { PLAN_MONTHS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";

/** A Core Operations plan covers the whole year or one half of it. */
export type PlanPeriod = "annual" | "first_half" | "second_half";

export const PLAN_PERIODS: { id: PlanPeriod; label: string; months: readonly PlanMonth[] }[] = [
  { id: "annual", label: "Full year", months: PLAN_MONTHS },
  { id: "first_half", label: "6 months · Tikimt–Megabit", months: PLAN_MONTHS.slice(0, 6) },
  { id: "second_half", label: "6 months · Miyazya–Meskerem", months: PLAN_MONTHS.slice(6) },
];

export function planPeriodOf(plan: { planPeriod?: string | null }): PlanPeriod {
  return plan.planPeriod === "first_half" || plan.planPeriod === "second_half" ? plan.planPeriod : "annual";
}

export function planPeriodLabel(period: PlanPeriod) {
  return PLAN_PERIODS.find((p) => p.id === period)?.label ?? "Full year";
}

export function monthsForPeriod(period: PlanPeriod): readonly PlanMonth[] {
  return PLAN_PERIODS.find((p) => p.id === period)?.months ?? PLAN_MONTHS;
}
