export type BenchmarkFarmValues = {
  costPerUnit: number | null;
  manDaysPerUnit: number | null;
  frequency: number | null;
};

export type BenchmarkFarmInput = BenchmarkFarmValues & {
  name: string;
  includeInIndustryAverage: boolean;
};

export type BenchmarkAverage = {
  farmsWithRate: number;
  costPerUnit: number | null;
  manDaysPerUnit: number | null;
  wagePerManDay: number | null;
  frequency: number | null;
};

export type BenchmarkData = {
  farms: BenchmarkFarmInputs;
  industryAverage: BenchmarkAverage;
  sixFarmAverage: BenchmarkAverage;
  recommendedSource: "industry_average" | "six_farm_fallback";
  dataNotes: string;
};

export type BenchmarkFarmInputs = BenchmarkFarmInput[];

const emptyFarm = (): BenchmarkFarmInput => ({
  name: "",
  includeInIndustryAverage: false,
  costPerUnit: null,
  manDaysPerUnit: null,
  frequency: null,
});

export const emptyBenchmarkFarmInputs = (): BenchmarkFarmInputs => [];

export function findDuplicateBenchmarkFarmName(farms: BenchmarkFarmInputs): string | null {
  const seen = new Set<string>();
  for (const farm of farms) {
    const name = farm.name.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) return name;
    seen.add(key);
  }
  return null;
}

export function normalizeBenchmarkFarmInputs(input: unknown): BenchmarkFarmInputs {
  if (Array.isArray(input)) {
    return input.map((farm) => ({
      ...emptyFarm(),
      ...(farm && typeof farm === "object" ? farm : {}),
      name: String((farm as { name?: unknown } | null)?.name ?? ""),
      includeInIndustryAverage: Boolean(
        (farm as { includeInIndustryAverage?: unknown } | null)?.includeInIndustryAverage,
      ),
    }));
  }
  if (input && typeof input === "object") {
    return Object.entries(input).map(([name, values]) => ({
      ...emptyFarm(),
      ...(values && typeof values === "object" ? values : {}),
      name,
      includeInIndustryAverage: ["Telli", "Gawi", "Chetu"].includes(name),
    }));
  }
  return [];
}

export function summarizeBenchmarkData(farms: BenchmarkFarmInputs): BenchmarkAverage {
  const rated = farms.filter((farm) => farm.name.trim() && farm.costPerUnit != null);
  const average = (field: keyof BenchmarkFarmValues) => {
    const values = rated
      .map((farm) => farm[field])
      .filter((value): value is number => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const costPerUnit = average("costPerUnit");
  const manDaysPerUnit = average("manDaysPerUnit");

  return {
    farmsWithRate: rated.length,
    costPerUnit,
    manDaysPerUnit,
    wagePerManDay:
      costPerUnit != null && manDaysPerUnit != null && manDaysPerUnit > 0
        ? costPerUnit / manDaysPerUnit
        : null,
    frequency: average("frequency"),
  };
}

export function buildBenchmarkData(
  farms: BenchmarkFarmInputs,
  dataNotes: string,
): BenchmarkData {
  const namedFarms = farms.filter((farm) => farm.name.trim());
  const industryAverage = summarizeBenchmarkData(
    namedFarms.filter((farm) => farm.includeInIndustryAverage),
  );
  const sixFarmAverage = summarizeBenchmarkData(namedFarms);
  return {
    farms: namedFarms,
    industryAverage,
    sixFarmAverage,
    recommendedSource:
      industryAverage.costPerUnit == null ? "six_farm_fallback" : "industry_average",
    dataNotes: dataNotes.trim(),
  };
}
