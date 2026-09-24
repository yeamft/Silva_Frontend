/** Ethiopian budget-year labels for Core Ops UI (display only). */

/** Rough GC→EC year: EC ≈ GC − 7/8 depending on season; Cropfort uses paired labels. */
export function budgetYearLabel(gcYear: number): { ec: string; gc: string; label: string } {
  const ecStart = gcYear - 8;
  const ecEnd = gcYear - 7;
  const ec = `${ecStart}/${String(ecEnd).slice(-2)} EC`;
  const gc = `${gcYear - 1}/${String(gcYear).slice(-2)} GC`;
  return { ec, gc, label: `${ec} (${gc})` };
}

export const PLAN_MONTHS = [
  "oct",
  "nov",
  "dec",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
] as const;

export type PlanMonth = (typeof PLAN_MONTHS)[number];

export const PLAN_MONTH_LABELS: Record<PlanMonth, string> = {
  oct: "Oct",
  nov: "Nov",
  dec: "Dec",
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
};

import {
  DEFAULT_SPEND_BANDS,
  resolveBandFromEtb,
  type ProgramSpendBand,
} from "@/types/spend-bands";

/** @deprecated Prefer program band store; kept for callers without program context. */
export const AFE_BAND_DEFAULTS = {
  aMax: DEFAULT_SPEND_BANDS[0].maxEtb ?? 500_000,
  bMax: DEFAULT_SPEND_BANDS[1].maxEtb ?? 2_000_000,
  cMax: DEFAULT_SPEND_BANDS[2].maxEtb ?? 5_000_000,
} as const;

export type AfeBand = "A" | "B" | "C" | "D";

export function bandForAmount(
  etb: number,
  bands: ProgramSpendBand[] = DEFAULT_SPEND_BANDS,
): AfeBand {
  return resolveBandFromEtb(etb, bands);
}

export function bandAutoApproves(
  band: AfeBand,
  bands: ProgramSpendBand[] = DEFAULT_SPEND_BANDS,
): boolean {
  const row = bands.find((b) => b.band === band);
  return row?.autoApprove ?? (band === "A" || band === "B");
}
