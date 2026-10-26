import { summarizeBenchmarkData } from "@/lib/benchmark-data";
import template from "@/lib/annual-plan-template.json";

export const PLAN_CATEGORIES = [
  "Nursery",
  "Young Coffee",
  "Matured Coffee",
  "Infilling",
  "Harvesting & Related",
] as const;

export type PlanCategory = (typeof PLAN_CATEGORIES)[number];
export type PlanBasis = "industry_average" | "plus_25" | "plus_50" | "expert_input";
export type BudgetScenario = PlanBasis;

export const BUDGET_SCENARIOS: BudgetScenario[] = [
  "industry_average",
  "plus_25",
  "plus_50",
  "expert_input",
];

export const SCENARIO_LABELS: Record<BudgetScenario, string> = {
  industry_average: "Industry average",
  plus_25: "+25%",
  plus_50: "+50%",
  expert_input: "Expert input",
};

/** Plan months in workbook order (Tikimt = October … Meskerem = September). */
export const PLAN_MONTH_NAMES = [
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Meskerem",
] as const;

/** "Settings" tab of the template. Band percentages are fractions (0.25 = 25%). */
export type AnnualPlanSettings = {
  farmName: string;
  planYearLabel: string;
  band1Pct: number;
  band2Pct: number;
  workingDaysPerMonth: number;
};

export const DEFAULT_SETTINGS: AnnualPlanSettings = {
  farmName: "",
  planYearLabel: "",
  band1Pct: 0.25,
  band2Pct: 0.5,
  workingDaysPerMonth: 26,
};

export type AnnualPlanMetrics = {
  plantationArea: number | null;
  totalSeedlings: number | null;
  nurserySiteArea: number | null;
  germinationSeedbeds: number | null;
  polytubeBeds: number | null;
  totalTrees: number | null;
  grossArea: number | null;
  averageTreesPerHa: number | null;
  totalCoffeeArea: number | null;
  totalMatureTrees: number | null;
  treesToStump: number | null;
  treesToInfill: number | null;
  productiveTrees: number | null;
  grossPlantationArea: number | null;
  averageProductivity: number | null;
  totalCleanCoffeeProduction: number | null;
  redCherryToPick: number | null;
  dryingBeds: number | null;
  dryCherryBags: number | null;
};

export type AnnualPlanActivityInput = {
  /** @deprecated Totals now follow the quantity, as in the template; kept so old saves still load. */
  included?: boolean;
  /** Overrides the metric-linked quantity when set. */
  quantityPerRound: number | null;
  expertManDaysPerUnit: number | null;
  expertWagePerManDay: number | null;
  expertFrequency: number | null;
  /** Share of the annual total per month, Tikimt → Meskerem, as fractions summing to 1. */
  phasing: number[];
};

export type AnnualPlanBudgetData = {
  benchmarkVersion: string;
  settings?: Partial<AnnualPlanSettings>;
  planBasis: Partial<Record<PlanCategory, PlanBasis>>;
  categoryMetrics: Partial<Record<PlanCategory, Partial<AnnualPlanMetrics>>>;
  activityInputs: Record<string, Partial<AnnualPlanActivityInput>>;
};

type FarmRate = {
  costPerUnit: number | null;
  manDaysPerUnit: number | null;
  frequency: number | null;
};

export type BenchmarkActivity = {
  code: string;
  category: PlanCategory;
  subgroup: string;
  activity: string;
  unit: string;
  farms: Record<string, FarmRate>;
};

export type MetricDefinition = {
  category: PlanCategory;
  key: keyof AnnualPlanMetrics;
  label: string;
  unit: string;
  /** Calculated from other metrics in the template — not typed. */
  derived?: (m: Partial<AnnualPlanMetrics>) => number | null;
};

const ratio = (a: number | null | undefined, b: number | null | undefined) =>
  a != null && b ? a / b : null;

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { category: "Nursery", key: "plantationArea", label: "Plantation area", unit: "ha" },
  { category: "Nursery", key: "totalSeedlings", label: "Total seedlings", unit: "no." },
  { category: "Nursery", key: "nurserySiteArea", label: "Nursery site area", unit: "ha" },
  { category: "Nursery", key: "germinationSeedbeds", label: "Germination seedbeds", unit: "bed" },
  { category: "Nursery", key: "polytubeBeds", label: "Polytube beds", unit: "bed" },
  { category: "Young Coffee", key: "totalTrees", label: "Total trees (net area)", unit: "no." },
  { category: "Young Coffee", key: "grossArea", label: "Gross area", unit: "ha" },
  {
    category: "Young Coffee",
    key: "averageTreesPerHa",
    label: "Average trees per ha",
    unit: "trees/ha",
    derived: (m) => ratio(m.totalTrees, m.grossArea),
  },
  { category: "Matured Coffee", key: "totalCoffeeArea", label: "Total coffee area", unit: "ha" },
  { category: "Matured Coffee", key: "totalMatureTrees", label: "Total mature trees (net area)", unit: "no." },
  {
    category: "Matured Coffee",
    key: "averageTreesPerHa",
    label: "Average trees per ha",
    unit: "trees/ha",
    derived: (m) => ratio(m.totalMatureTrees, m.totalCoffeeArea),
  },
  { category: "Matured Coffee", key: "treesToStump", label: "Trees to stump", unit: "no." },
  { category: "Infilling", key: "totalCoffeeArea", label: "Total coffee area", unit: "ha" },
  { category: "Infilling", key: "treesToInfill", label: "Trees to infill", unit: "no." },
  {
    category: "Infilling",
    key: "averageTreesPerHa",
    label: "Average trees per ha",
    unit: "trees/ha",
    derived: (m) => ratio(m.treesToInfill, m.totalCoffeeArea),
  },
  { category: "Harvesting & Related", key: "productiveTrees", label: "Productive trees", unit: "no." },
  { category: "Harvesting & Related", key: "grossPlantationArea", label: "Gross plantation area", unit: "ha" },
  { category: "Harvesting & Related", key: "averageProductivity", label: "Average productivity", unit: "qt clean coffee/ha" },
  {
    category: "Harvesting & Related",
    key: "totalCleanCoffeeProduction",
    label: "Total clean coffee production",
    unit: "qt",
    derived: (m) =>
      m.averageProductivity != null && m.grossPlantationArea != null
        ? m.averageProductivity * m.grossPlantationArea
        : null,
  },
  { category: "Harvesting & Related", key: "redCherryToPick", label: "Red cherry to pick", unit: "kg" },
  { category: "Harvesting & Related", key: "dryingBeds", label: "Drying beds", unit: "bed" },
  { category: "Harvesting & Related", key: "dryCherryBags", label: "Dry cherry bags", unit: "bag" },
];

type TemplateActivity = { category: string; metricLabel: string | null; phasing: number[] };
const TEMPLATE = template.activities as Record<string, TemplateActivity>;

/** Metric that feeds an activity's quantity in the template, if any. */
export function linkedMetric(code: string): MetricDefinition | null {
  const t = TEMPLATE[code];
  if (!t?.metricLabel) return null;
  return (
    METRIC_DEFINITIONS.find((m) => m.category === t.category && t.metricLabel!.startsWith(m.label)) ?? null
  );
}

/** Template's default phasing (B-Agro seasonal timing) for an activity. */
export function defaultPhasing(code: string): number[] {
  return TEMPLATE[code]?.phasing ?? new Array(12).fill(0);
}

export function resolveSettings(data: AnnualPlanBudgetData): AnnualPlanSettings {
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

/** Category metrics with the template's calculated metrics filled in. */
export function resolveMetrics(
  data: AnnualPlanBudgetData,
  category: PlanCategory,
): Partial<AnnualPlanMetrics> {
  const typed = data.categoryMetrics[category] ?? {};
  const resolved: Partial<AnnualPlanMetrics> = { ...typed };
  for (const def of METRIC_DEFINITIONS) {
    if (def.category === category && def.derived) resolved[def.key] = def.derived(typed);
  }
  return resolved;
}

const INDUSTRY_FARMS = ["Telli", "Gawi", "Chetu"];

/** Template rule: frequency is a whole number of rounds, at least one — MAX(1, ROUND(avg)). */
function roundFrequency(average: number | null) {
  return average == null ? 1 : Math.max(1, Math.round(average));
}

function summarizeRates(farms: Record<string, FarmRate>) {
  const summary = summarizeBenchmarkData(
    Object.entries(farms).map(([name, values]) => ({
      name,
      includeInIndustryAverage: false,
      ...values,
    })),
  );
  return { ...summary, frequency: roundFrequency(summary.frequency) };
}

export function defaultAnnualPlanBudget(benchmarkVersion = ""): AnnualPlanBudgetData {
  return {
    benchmarkVersion,
    settings: {},
    planBasis: {},
    categoryMetrics: {},
    activityInputs: {},
  };
}

export function summarizeAnnualBudget(
  data: AnnualPlanBudgetData,
  activities: BenchmarkActivity[],
) {
  const settings = resolveSettings(data);
  const metricsByCategory = Object.fromEntries(
    PLAN_CATEGORIES.map((category) => [category, resolveMetrics(data, category)]),
  ) as Record<PlanCategory, Partial<AnnualPlanMetrics>>;

  return activities.map((activity) => {
    const industryFarms = Object.fromEntries(
      INDUSTRY_FARMS.map((name) => [name, activity.farms[name]]),
    ) as Record<string, FarmRate>;
    const industry = summarizeRates(industryFarms);
    const sixFarm = summarizeRates(activity.farms);
    const hasIndustryRate = industry.costPerUnit != null;
    const input = data.activityInputs[activity.code] || {};

    // Quantity per round: typed value wins, otherwise the linked category metric
    const metric = linkedMetric(activity.code);
    const metricValue = metric ? metricsByCategory[activity.category]?.[metric.key] ?? null : null;
    const quantity = input.quantityPerRound ?? metricValue ?? 0;
    const quantitySource: "typed" | "metric" | "none" =
      input.quantityPerRound != null ? "typed" : metricValue != null ? "metric" : "none";

    const expert = {
      manDaysPerUnit:
        input.expertManDaysPerUnit ?? (hasIndustryRate ? industry.manDaysPerUnit : sixFarm.manDaysPerUnit),
      wagePerManDay:
        input.expertWagePerManDay ?? (hasIndustryRate ? industry.wagePerManDay : sixFarm.wagePerManDay),
      frequency: input.expertFrequency ?? (hasIndustryRate ? industry.frequency : sixFarm.costPerUnit != null ? sixFarm.frequency : 1),
    };
    const buildScenario = (
      manDaysPerUnit: number | null,
      wagePerManDay: number | null,
      frequency: number | null,
    ) => {
      const costPerUnit =
        manDaysPerUnit != null && wagePerManDay != null ? manDaysPerUnit * wagePerManDay : null;
      return {
        costPerUnit,
        manDaysPerUnit,
        wagePerManDay,
        frequency,
        totalManDays: frequency == null || manDaysPerUnit == null ? null : quantity * frequency * manDaysPerUnit,
        totalBudget: frequency == null || costPerUnit == null ? null : quantity * frequency * costPerUnit,
      };
    };
    const band = (pct: number) =>
      buildScenario(
        industry.manDaysPerUnit,
        industry.wagePerManDay == null ? null : industry.wagePerManDay * (1 + pct),
        industry.frequency,
      );
    const scenarios = {
      industry_average: buildScenario(industry.manDaysPerUnit, industry.wagePerManDay, industry.frequency),
      plus_25: band(settings.band1Pct),
      plus_50: band(settings.band2Pct),
      expert_input: buildScenario(expert.manDaysPerUnit, expert.wagePerManDay, expert.frequency),
    } satisfies Record<BudgetScenario, ReturnType<typeof buildScenario>>;

    const preferredBasis = data.planBasis[activity.category] || "industry_average";
    const selectedBasis: BudgetScenario =
      preferredBasis !== "expert_input" && !hasIndustryRate ? "expert_input" : preferredBasis;
    const selected = scenarios[selectedBasis];

    const phasing = input.phasing?.length === 12 ? input.phasing : defaultPhasing(activity.code);
    const phasingTotal = phasing.reduce((sum, v) => sum + (v || 0), 0);
    const counts = quantity > 0;

    return {
      activity,
      quantityPerRound: quantity,
      quantitySource,
      linkedMetric: metric,
      industryFarmsWithRate: industry.farmsWithRate,
      sixFarmFallbackAvailable: sixFarm.costPerUnit != null,
      hasIndustryRate,
      scenarios,
      selectedBasis,
      selected,
      /** Counts in totals when it has a quantity — the template has no separate include switch. */
      counts,
      missingRate: counts && selected.totalBudget == null,
      phasing,
      phasingTotal,
      phasingOk: !counts || Math.abs(phasingTotal - 1) < 0.0005,
      monthly: phasing.map((share) => ({
        manDays: (selected.totalManDays ?? 0) * (share || 0),
        cost: (selected.totalBudget ?? 0) * (share || 0),
      })),
    };
  });
}

export type AnnualBudgetRow = ReturnType<typeof summarizeAnnualBudget>[number];

/** Summary tab: plan totals per category plus each scenario's budget for comparison. */
export function summarizeCategories(rows: AnnualBudgetRow[], data: AnnualPlanBudgetData) {
  const categories = PLAN_CATEGORIES.map((category) => {
    const counted = rows.filter((r) => r.activity.category === category && r.counts);
    const sum = (pick: (r: AnnualBudgetRow) => number | null) =>
      counted.reduce((total, r) => total + (pick(r) ?? 0), 0);
    return {
      category,
      basis: data.planBasis[category] || ("industry_average" as PlanBasis),
      activityCount: counted.length,
      missingRates: counted.filter((r) => r.missingRate).length,
      planManDays: sum((r) => r.selected.totalManDays),
      planBudget: sum((r) => r.selected.totalBudget),
      scenarioBudgets: Object.fromEntries(
        BUDGET_SCENARIOS.map((scenario) => [
          scenario,
          // No industry rate → that activity always prices from Expert input
          sum((r) => r.scenarios[r.hasIndustryRate ? scenario : "expert_input"].totalBudget),
        ]),
      ) as Record<BudgetScenario, number>,
    };
  });
  const total = {
    planManDays: categories.reduce((s, c) => s + c.planManDays, 0),
    planBudget: categories.reduce((s, c) => s + c.planBudget, 0),
    scenarioBudgets: Object.fromEntries(
      BUDGET_SCENARIOS.map((scenario) => [scenario, categories.reduce((s, c) => s + c.scenarioBudgets[scenario], 0)]),
    ) as Record<BudgetScenario, number>,
  };
  return { categories, total };
}

/** Monthly tab: plan man-days and cost per month, and workers needed at the set working days. */
export function summarizeMonthly(rows: AnnualBudgetRow[], data: AnnualPlanBudgetData) {
  const { workingDaysPerMonth } = resolveSettings(data);
  return PLAN_MONTH_NAMES.map((name, index) => {
    const counted = rows.filter((r) => r.counts);
    const manDays = counted.reduce((s, r) => s + r.monthly[index].manDays, 0);
    const cost = counted.reduce((s, r) => s + r.monthly[index].cost, 0);
    return { name, manDays, cost, workers: workingDaysPerMonth > 0 ? manDays / workingDaysPerMonth : 0 };
  });
}
