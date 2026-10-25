import { summarizeBenchmarkData } from "@/lib/benchmark-data";

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
  included?: boolean;
  quantityPerRound: number | null;
  expertManDaysPerUnit: number | null;
  expertWagePerManDay: number | null;
  expertFrequency: number | null;
};

export type AnnualPlanBudgetData = {
  benchmarkVersion: string;
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

export const METRIC_DEFINITIONS: {
  category: PlanCategory;
  key: keyof AnnualPlanMetrics;
  label: string;
  unit: string;
}[] = [
  { category: "Nursery", key: "plantationArea", label: "Plantation area", unit: "ha" },
  { category: "Nursery", key: "totalSeedlings", label: "Total seedlings", unit: "no." },
  { category: "Nursery", key: "nurserySiteArea", label: "Nursery site area", unit: "ha" },
  { category: "Nursery", key: "germinationSeedbeds", label: "Germination seedbeds", unit: "bed" },
  { category: "Nursery", key: "polytubeBeds", label: "Polytube beds", unit: "bed" },
  { category: "Young Coffee", key: "totalTrees", label: "Total trees (net area)", unit: "no." },
  { category: "Young Coffee", key: "grossArea", label: "Gross area", unit: "ha" },
  { category: "Young Coffee", key: "averageTreesPerHa", label: "Average trees per ha", unit: "trees/ha" },
  { category: "Matured Coffee", key: "totalCoffeeArea", label: "Total coffee area", unit: "ha" },
  { category: "Matured Coffee", key: "totalMatureTrees", label: "Total mature trees (net area)", unit: "no." },
  { category: "Matured Coffee", key: "averageTreesPerHa", label: "Average trees per ha", unit: "trees/ha" },
  { category: "Matured Coffee", key: "treesToStump", label: "Trees to stump", unit: "no." },
  { category: "Infilling", key: "totalCoffeeArea", label: "Total coffee area", unit: "ha" },
  { category: "Infilling", key: "treesToInfill", label: "Trees to infill", unit: "no." },
  { category: "Infilling", key: "averageTreesPerHa", label: "Average trees per ha", unit: "trees/ha" },
  { category: "Harvesting & Related", key: "productiveTrees", label: "Productive trees", unit: "no." },
  { category: "Harvesting & Related", key: "grossPlantationArea", label: "Gross plantation area", unit: "ha" },
  { category: "Harvesting & Related", key: "averageProductivity", label: "Average productivity", unit: "qt clean coffee/ha" },
  { category: "Harvesting & Related", key: "totalCleanCoffeeProduction", label: "Total clean coffee production", unit: "qt" },
  { category: "Harvesting & Related", key: "redCherryToPick", label: "Red cherry to pick", unit: "kg" },
  { category: "Harvesting & Related", key: "dryingBeds", label: "Drying beds", unit: "bed" },
  { category: "Harvesting & Related", key: "dryCherryBags", label: "Dry cherry bags", unit: "bag" },
];

const INDUSTRY_FARMS = ["Telli", "Gawi", "Chetu"];

function summarizeRates(farms: Record<string, FarmRate>) {
  return summarizeBenchmarkData(
    Object.entries(farms).map(([name, values]) => ({
      name,
      includeInIndustryAverage: false,
      ...values,
    })),
  );
}

export function defaultAnnualPlanBudget(benchmarkVersion = ""): AnnualPlanBudgetData {
  return {
    benchmarkVersion,
    planBasis: {},
    categoryMetrics: {},
    activityInputs: {},
  };
}

export function summarizeAnnualBudget(
  data: AnnualPlanBudgetData,
  activities: BenchmarkActivity[],
) {
  return activities.map((activity) => {
    const industryFarms = Object.fromEntries(
      INDUSTRY_FARMS.map((name) => [name, activity.farms[name]]),
    ) as Record<string, FarmRate>;
    const industry = summarizeRates(industryFarms);
    const sixFarm = summarizeRates(activity.farms);
    const input = data.activityInputs[activity.code] || {};
    const expert = {
      manDaysPerUnit:
        input.expertManDaysPerUnit ??
        (industry.costPerUnit != null ? industry.manDaysPerUnit : sixFarm.manDaysPerUnit),
      wagePerManDay:
        input.expertWagePerManDay ??
        (industry.costPerUnit != null ? industry.wagePerManDay : sixFarm.wagePerManDay),
      frequency:
        input.expertFrequency ??
        (industry.costPerUnit != null ? industry.frequency : sixFarm.frequency),
    };
    const expertCost =
      expert.manDaysPerUnit != null && expert.wagePerManDay != null
        ? expert.manDaysPerUnit * expert.wagePerManDay
        : null;
    const quantity = input.quantityPerRound ?? 0;
    const buildScenario = (
      costPerUnit: number | null,
      manDaysPerUnit: number | null,
      wagePerManDay: number | null,
      frequency: number | null,
    ) => ({
      costPerUnit,
      manDaysPerUnit,
      wagePerManDay,
      frequency,
      totalManDays:
        frequency == null || manDaysPerUnit == null
          ? null
          : quantity * frequency * manDaysPerUnit,
      totalBudget:
        frequency == null || costPerUnit == null
          ? null
          : quantity * frequency * costPerUnit,
    });
    const scenarios = {
      industry_average: buildScenario(
        industry.costPerUnit,
        industry.manDaysPerUnit,
        industry.wagePerManDay,
        industry.frequency,
      ),
      plus_25: buildScenario(
        industry.costPerUnit == null ? null : industry.costPerUnit * 1.25,
        industry.manDaysPerUnit,
        industry.wagePerManDay == null ? null : industry.wagePerManDay * 1.25,
        industry.frequency,
      ),
      plus_50: buildScenario(
        industry.costPerUnit == null ? null : industry.costPerUnit * 1.5,
        industry.manDaysPerUnit,
        industry.wagePerManDay == null ? null : industry.wagePerManDay * 1.5,
        industry.frequency,
      ),
      expert_input: buildScenario(
        expertCost,
        expert.manDaysPerUnit,
        expert.wagePerManDay,
        expert.frequency,
      ),
    } satisfies Record<BudgetScenario, ReturnType<typeof buildScenario>>;
    const preferredBasis = data.planBasis[activity.category] || "industry_average";
    const selectedBasis =
      preferredBasis !== "expert_input" && industry.costPerUnit == null
        ? "expert_input"
        : preferredBasis;
    return {
      activity,
      included: input.included ?? false,
      quantityPerRound: input.quantityPerRound ?? null,
      industryFarmsWithRate: industry.farmsWithRate,
      sixFarmFallbackAvailable: sixFarm.costPerUnit != null,
      hasIndustryRate: industry.costPerUnit != null,
      scenarios,
      selectedBasis,
      selected: scenarios[selectedBasis],
    };
  });
}