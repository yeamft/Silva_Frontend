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