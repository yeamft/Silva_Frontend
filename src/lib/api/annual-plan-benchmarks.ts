import { apiFetch } from "@/lib/api/http";
import type { BenchmarkActivity } from "@/lib/annual-plan-budget";

export type AnnualPlanBenchmarkSet = {
  version: string | null;
  sourceFile: string | null;
  importedAt: string | null;
  activities: BenchmarkActivity[];
};

export function getAnnualPlanBenchmarks(version?: string | null) {
  const query = version ? `?version=${encodeURIComponent(version)}` : "";
  return apiFetch<AnnualPlanBenchmarkSet>(`/annual-plan-benchmarks${query}`);
}
export type BenchmarkImportResult = {
  version: string;
  sourceFile: string;
  activities: number;
  matchedActivities: number;
};

/** Uploads the annual-plan workbook; its "Benchmark Data" sheet becomes the benchmark set. */
export function importAnnualPlanBenchmarks(file: File) {
  const body = new FormData();
  body.append("workbook", file);
  return apiFetch<BenchmarkImportResult>("/annual-plan-benchmarks/import", { method: "POST", body });
}

/** Band 1 / Band 2 (%) above the industry average — shared by rate cards and the annual budget. */
export type ScenarioSettings = { band1Pct: number; band2Pct: number };

export function getScenarioSettings() {
  return apiFetch<ScenarioSettings>("/annual-plan-benchmarks/settings");
}

export function updateScenarioSettings(input: Partial<ScenarioSettings>) {
  return apiFetch<ScenarioSettings>("/annual-plan-benchmarks/settings", { method: "PUT", body: input });
}
