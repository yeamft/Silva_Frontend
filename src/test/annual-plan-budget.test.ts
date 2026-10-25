import { describe, expect, it } from "vitest";
import {
  defaultAnnualPlanBudget,
  summarizeAnnualBudget,
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
});