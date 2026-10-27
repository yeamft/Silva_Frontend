import { describe, expect, it } from "vitest";
import {
  defaultAnnualPlanBudget,
  resolveMetrics,
  summarizeAnnualBudget,
  summarizeCategories,
  summarizeMonthly,
  summarizeMonthlyPlan,
  monthlyTasks,
  toQuarters,
  type BenchmarkActivity,
} from "@/lib/annual-plan-budget";

const activities: BenchmarkActivity[] = [
  {
    code: "NU-01",
    category: "Nursery",
    subgroup: "Site preparation",
    activity: "Land clearing",
    unit: "ha",
    farms: {
      Telli: { costPerUnit: 4000, manDaysPerUnit: 20, frequency: 1 },
      Gawi: { costPerUnit: 4000, manDaysPerUnit: 20, frequency: 1 },
      Chetu: { costPerUnit: 3000, manDaysPerUnit: 20, frequency: 1 },
      Ephrata: { costPerUnit: 3000, manDaysPerUnit: 20, frequency: 1 },
      Kamisse: { costPerUnit: 2600, manDaysPerUnit: 20, frequency: 1 },
      Shakisso: { costPerUnit: 4000, manDaysPerUnit: 20, frequency: 1 },
    },
  },
  {
    code: "NU-29",
    category: "Nursery",
    subgroup: "Seedling care",
    activity: "Loading seedlings for dispatch",
    unit: "day",
    farms: {
      Telli: { costPerUnit: null, manDaysPerUnit: null, frequency: null },
      Gawi: { costPerUnit: null, manDaysPerUnit: null, frequency: null },
      Chetu: { costPerUnit: null, manDaysPerUnit: null, frequency: null },
      Ephrata: { costPerUnit: 200, manDaysPerUnit: 0.5, frequency: 2 },
      Kamisse: { costPerUnit: null, manDaysPerUnit: null, frequency: null },
      Shakisso: { costPerUnit: null, manDaysPerUnit: null, frequency: null },
    },
  },
  {
    code: "NU-33",
    category: "Nursery",
    subgroup: "Pest management",
    activity: "Nursery pest & disease inspection",
    unit: "bed",
    farms: Object.fromEntries(
      ["Telli", "Gawi", "Chetu", "Ephrata", "Kamisse", "Shakisso"].map((name) => [
        name,
        { costPerUnit: null, manDaysPerUnit: null, frequency: null },
      ]),
    ),
  },
];

describe("annual plan benchmark budgets", () => {
  it("applies wage bands while keeping industry man-days unchanged", () => {
    const data = defaultAnnualPlanBudget();
    data.planBasis.Nursery = "plus_25";
    data.activityInputs["NU-01"] = { quantityPerRound: 10 };

    const row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-01");

    expect(row?.industryFarmsWithRate).toBe(3);
    expect(row?.scenarios.plus_25.manDaysPerUnit).toBe(row?.scenarios.industry_average.manDaysPerUnit);
    expect(row?.scenarios.plus_25.wagePerManDay).toBeCloseTo(
      (row?.scenarios.industry_average.wagePerManDay ?? 0) * 1.25,
    );
    expect(row?.selectedBasis).toBe("plus_25");
    expect(row?.scenarios.plus_25.totalBudget).toBeCloseTo(
      (row?.scenarios.industry_average.totalBudget ?? 0) * 1.25,
    );
  });

  it("prefills Expert input from the six-farm average when no industry rate exists", () => {
    const data = defaultAnnualPlanBudget();
    data.activityInputs["NU-29"] = { quantityPerRound: 10 };

    const row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-29");

    expect(row?.industryFarmsWithRate).toBe(0);
    expect(row?.sixFarmFallbackAvailable).toBe(true);
    expect(row?.selectedBasis).toBe("expert_input");
    expect(row?.scenarios.expert_input.manDaysPerUnit).toBeGreaterThan(0);
    expect(row?.scenarios.expert_input.totalBudget).toBeGreaterThan(0);
  });

  it("leaves no-rate activities without a benchmark prefill", () => {
    const data = defaultAnnualPlanBudget();
    const row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-33");

    expect(row?.hasIndustryRate).toBe(false);
    expect(row?.sixFarmFallbackAvailable).toBe(false);
    expect(row?.scenarios.expert_input.costPerUnit).toBeNull();
    expect(row?.selectedBasis).toBe("expert_input");
  });

  it("uses only the supplied benchmark set", () => {
    expect(summarizeAnnualBudget(defaultAnnualPlanBudget(), activities)).toHaveLength(3);
  });

  it("rounds benchmark frequency to whole rounds, at least one, as the template does", () => {
    const rounds = (freqs: (number | null)[]): BenchmarkActivity => ({
      code: "NU-14",
      category: "Nursery",
      subgroup: "Seedbed & sowing",
      activity: "Mulch material preparation & transport",
      unit: "load",
      farms: Object.fromEntries(
        ["Telli", "Gawi", "Chetu", "Ephrata", "Kamisse", "Shakisso"].map((name, i) => [
          name,
          { costPerUnit: freqs[i] == null ? null : 100, manDaysPerUnit: 1, frequency: freqs[i] },
        ]),
      ),
    });
    const data = defaultAnnualPlanBudget();
    // Telli 1, Gawi 5, Chetu 1 → 2.33 → 2 (the workbook shows 2, not 2.33)
    expect(summarizeAnnualBudget(data, [rounds([1, 5, 1, 1, 5, 3])])[0].scenarios.industry_average.frequency).toBe(2);
    // No industry farms, six-farm 2.5 → 3 for the Expert input pre-fill
    expect(summarizeAnnualBudget(data, [rounds([null, null, null, 2, 3, null])])[0].scenarios.expert_input.frequency).toBe(3);
  });

  it("takes the wage bands from Settings", () => {
    const data = defaultAnnualPlanBudget();
    data.settings = { band1Pct: 0.1, band2Pct: 0.2 };
    const row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-01")!;
    expect(row.scenarios.plus_25.wagePerManDay).toBeCloseTo((row.scenarios.industry_average.wagePerManDay ?? 0) * 1.1);
    expect(row.scenarios.plus_50.wagePerManDay).toBeCloseTo((row.scenarios.industry_average.wagePerManDay ?? 0) * 1.2);
  });

  it("fills the quantity from the linked category metric unless one is typed", () => {
    const data = defaultAnnualPlanBudget();
    data.categoryMetrics.Nursery = { nurserySiteArea: 2 };
    let row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-01")!;
    expect(row.linkedMetric?.key).toBe("nurserySiteArea");
    expect(row.quantitySource).toBe("metric");
    expect(row.selected.totalBudget).toBeCloseTo(2 * 1 * (11000 / 3));

    data.activityInputs["NU-01"] = { quantityPerRound: 5 };
    row = summarizeAnnualBudget(data, activities).find((item) => item.activity.code === "NU-01")!;
    expect(row.quantitySource).toBe("typed");
    expect(row.quantityPerRound).toBe(5);
  });

  it("calculates the template's derived metrics", () => {
    const data = defaultAnnualPlanBudget();
    data.categoryMetrics["Young Coffee"] = { totalTrees: 5000, grossArea: 2 };
    data.categoryMetrics["Harvesting & Related"] = { grossPlantationArea: 10, averageProductivity: 6 };
    expect(resolveMetrics(data, "Young Coffee").averageTreesPerHa).toBe(2500);
    expect(resolveMetrics(data, "Harvesting & Related").totalCleanCoffeeProduction).toBe(60);
  });

  it("counts every activity with a quantity and phases it across the months", () => {
    const data = defaultAnnualPlanBudget();
    data.activityInputs["NU-01"] = { quantityPerRound: 1 };
    const rows = summarizeAnnualBudget(data, activities);
    const nu01 = rows.find((item) => item.activity.code === "NU-01")!;
    expect(nu01.counts).toBe(true);
    expect(nu01.phasingOk).toBe(true);

    const months = summarizeMonthly(rows, data);
    // Template phases land clearing 100% in Hidar
    expect(months[1].cost).toBeCloseTo(nu01.selected.totalBudget ?? 0);
    expect(months[1].workers).toBeCloseTo((nu01.selected.totalManDays ?? 0) / 26);
  });

  it("rolls the plan up by category and month, and turns each month into tasks", () => {
    const data = defaultAnnualPlanBudget();
    data.activityInputs["NU-01"] = { quantityPerRound: 2, phasing: [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const rows = summarizeAnnualBudget(data, activities);
    const nu01 = rows.find((item) => item.activity.code === "NU-01")!;
    const annual = nu01.selected.totalBudget ?? 0;

    const plan = summarizeMonthlyPlan(rows, data);
    const nursery = plan.categories.find((c) => c.category === "Nursery")!;
    expect(nursery.annualCost).toBeCloseTo(annual);
    expect(nursery.cost[0]).toBeCloseTo(annual / 2);
    expect(plan.cumulativeCost[11]).toBeCloseTo(plan.annualCost);
    expect(toQuarters(plan.totalCost)[0]).toBeCloseTo(annual);

    const tikimt = monthlyTasks(rows, data, 0);
    expect(tikimt).toHaveLength(1);
    expect(tikimt[0]).toMatchObject({ code: "NU-01", sharePct: 50 });
    expect(tikimt[0].quantity).toBeCloseTo(2 * (nu01.selected.frequency ?? 1) * 0.5);
    expect(tikimt[0].workers).toBeCloseTo(tikimt[0].manDays / 26);
    expect(monthlyTasks(rows, data, 5)).toHaveLength(0);
  });

  it("flags a missing rate without blanking the whole category", () => {
    const data = defaultAnnualPlanBudget();
    data.activityInputs["NU-01"] = { quantityPerRound: 1 };
    data.activityInputs["NU-33"] = { quantityPerRound: 4 };
    const rows = summarizeAnnualBudget(data, activities);
    const nursery = summarizeCategories(rows, data).categories.find((c) => c.category === "Nursery")!;
    expect(nursery.missingRates).toBe(1);
    expect(nursery.planBudget).toBeCloseTo(rows.find((r) => r.activity.code === "NU-01")!.selected.totalBudget ?? 0);
  });
});
