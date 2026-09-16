/**
 * Variance preview used by the mock API and the create/edit form.
 * Backend is authoritative — do not treat this as a hard business rule.
 *
 * [CONFIRM] Flag threshold is assumed ±10% vs the mean of available benchmarks.
 */
export const VARIANCE_FLAG_THRESHOLD_PCT = 10;

export function computeVariance(input: {
  rateBirr: number;
  benchmarkFarmARate: number | null;
  benchmarkFarmBRate: number | null;
}): { variancePct: number | null; flagged: boolean } {
  const benches = [input.benchmarkFarmARate, input.benchmarkFarmBRate].filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0
  );
  if (benches.length === 0 || !input.rateBirr) {
    return { variancePct: null, flagged: false };
  }
  const avg = benches.reduce((s, n) => s + n, 0) / benches.length;
  const variancePct = ((input.rateBirr - avg) / avg) * 100;
  return {
    variancePct,
    flagged: Math.abs(variancePct) > VARIANCE_FLAG_THRESHOLD_PCT,
  };
}
