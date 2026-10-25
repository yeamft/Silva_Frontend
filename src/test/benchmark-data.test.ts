import { describe, expect, it } from "vitest";
import {
  buildBenchmarkData,
  emptyBenchmarkFarmInputs,
  findDuplicateBenchmarkFarmName,
  normalizeBenchmarkFarmInputs,
} from "@/lib/benchmark-data";

describe("farm benchmark calculations", () => {
  it("averages selected industry farms and uses every named farm for the fallback", () => {
    const farms = emptyBenchmarkFarmInputs();
    farms.push(
      {
        name: "Aster",
        includeInIndustryAverage: true,
        costPerUnit: 100,
        manDaysPerUnit: 2,
        frequency: 3,
      },
      {
        name: "Birch",
        includeInIndustryAverage: true,
        costPerUnit: 200,
        manDaysPerUnit: 4,
        frequency: 5,
      },
      {
        name: "Cedar",
        includeInIndustryAverage: false,
        costPerUnit: 300,
        manDaysPerUnit: 6,
        frequency: 2,
      },
    );

    const data = buildBenchmarkData(farms, "");

    expect(data.industryAverage).toEqual({
      farmsWithRate: 2,
      costPerUnit: 150,
      manDaysPerUnit: 3,
      wagePerManDay: 50,
      frequency: 4,
    });
    expect(data.sixFarmAverage.costPerUnit).toBe(200);
    expect(data.recommendedSource).toBe("industry_average");
  });

  it("uses the all-farm average when no selected industry farm has a rate", () => {
    const farms = [
      {
        name: "Any farm",
        includeInIndustryAverage: false,
        costPerUnit: 120,
        manDaysPerUnit: 2,
        frequency: 1,
      },
    ];

    const data = buildBenchmarkData(farms, "fallback");

    expect(data.industryAverage.costPerUnit).toBeNull();
    expect(data.sixFarmAverage.costPerUnit).toBe(120);
    expect(data.recommendedSource).toBe("six_farm_fallback");
  });

  it("converts saved six-farm records for backward compatibility", () => {
    const farms = normalizeBenchmarkFarmInputs({
      Telli: { costPerUnit: 120, manDaysPerUnit: 2, frequency: 1 },
      Ephrata: { costPerUnit: 150, manDaysPerUnit: 3, frequency: 1 },
    });

    expect(farms.map((farm) => farm.name)).toEqual(["Telli", "Ephrata"]);
    expect(farms[0].includeInIndustryAverage).toBe(true);
    expect(farms[1].includeInIndustryAverage).toBe(false);
  });

  it("detects farm names entered more than once without regard to case", () => {
    expect(
      findDuplicateBenchmarkFarmName([
        {
          name: "Farm A",
          includeInIndustryAverage: false,
          costPerUnit: null,
          manDaysPerUnit: null,
          frequency: null,
        },
        {
          name: " farm a ",
          includeInIndustryAverage: true,
          costPerUnit: null,
          manDaysPerUnit: null,
          frequency: null,
        },
      ]),
    ).toBe("farm a");
  });
});
