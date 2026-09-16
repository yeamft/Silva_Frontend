/**
 * Rate Card domain types.
 *
 * [CONFIRM] No rate card model exists in docs/SCOPE.md, docs/END_TO_END_WORKFLOW.md
 * or docs/BACKLOG.md. This shape is derived from the UI spec and must be
 * reconciled with the backend contract before wiring real endpoints.
 */

/** SPX authors a line as `draft`, submits it, the owner approves or returns it. */
export type RateCardStatus = "draft" | "submitted" | "approved" | "returned";

export const RATE_CARD_STATUSES: RateCardStatus[] = [
  "draft",
  "submitted",
  "approved",
  "returned",
];

export const RATE_CARD_STATUS_LABELS: Record<RateCardStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  returned: "Returned",
};

export type RateCardCategory =
  | "labour"
  | "material"
  | "machinery"
  | "transport"
  | "services"
  | "overhead";

export const RATE_CARD_CATEGORIES: RateCardCategory[] = [
  "labour",
  "material",
  "machinery",
  "transport",
  "services",
  "overhead",
];

export const RATE_CARD_CATEGORY_LABELS: Record<RateCardCategory, string> = {
  labour: "Labour",
  material: "Material",
  machinery: "Machinery",
  transport: "Transport",
  services: "Services",
  overhead: "Overhead",
};

/**
 * [CONFIRM] Threshold is an assumption. A line is flagged when its rate deviates
 * from the mean of the two benchmark farms by more than this percentage, and a
 * flagged line cannot be submitted without an SPX justification note.
 * The server must remain authoritative for both the calculation and the gate.
 */
export const VARIANCE_FLAG_THRESHOLD_PCT = 10;

export interface RateCardLine {
  id: string;
  /** Tenant/farm-area scope. Never sent from the client on writes. */
  tenantId: string;
  resourceCode: string;
  resourceName: string;
  category: RateCardCategory;
  unitOfMeasure: string;
  /** Birr. */
  rate: number;
  /** Birr. Comparator estate A. SPX-internal — never shown to farm owners. */
  benchmarkFarmARate: number | null;
  /** Birr. Comparator estate B. SPX-internal — never shown to farm owners. */
  benchmarkFarmBRate: number | null;
  /** Server-computed deviation from the benchmark mean. Null when no benchmarks. */
  variancePct: number | null;
  /** Server-computed: |variancePct| exceeds the threshold. */
  flagged: boolean;
  /** SPX-internal. Required before a flagged line can be submitted. */
  spxJustificationNote: string | null;
  status: RateCardStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  /** Owner's comment when returning a line. Visible to SPX. */
  decisionComment: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
}

/** Fields a farm owner is allowed to see — benchmarks and SPX notes are stripped. */
export type RateCardLineOwnerView = Omit<
  RateCardLine,
  "benchmarkFarmARate" | "benchmarkFarmBRate" | "spxJustificationNote"
>;

export interface RateCardLineInput {
  resourceCode: string;
  resourceName: string;
  category: RateCardCategory;
  unitOfMeasure: string;
  rate: number;
  benchmarkFarmARate: number | null;
  benchmarkFarmBRate: number | null;
  spxJustificationNote: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface RateCardSummary {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  returned: number;
  flagged: number;
}

/**
 * Variance against the mean of whichever benchmarks are present.
 * Mirrors the rule the server is expected to apply; the client only previews it.
 */
export function computeVariancePct(
  rate: number,
  benchmarkA: number | null,
  benchmarkB: number | null
): number | null {
  const benchmarks = [benchmarkA, benchmarkB].filter(
    (b): b is number => typeof b === "number" && Number.isFinite(b) && b > 0
  );
  if (benchmarks.length === 0 || !Number.isFinite(rate)) return null;

  const mean = benchmarks.reduce((sum, b) => sum + b, 0) / benchmarks.length;
  if (mean === 0) return null;

  return ((rate - mean) / mean) * 100;
}

export function isFlagged(variancePct: number | null): boolean {
  return variancePct !== null && Math.abs(variancePct) > VARIANCE_FLAG_THRESHOLD_PCT;
}

/** A flagged line needs a justification note before SPX can submit it. */
export function blocksSubmission(line: RateCardLine): boolean {
  return line.flagged && !line.spxJustificationNote?.trim();
}

export function summarise(lines: RateCardLine[]): RateCardSummary {
  return {
    total: lines.length,
    draft: lines.filter((l) => l.status === "draft").length,
    submitted: lines.filter((l) => l.status === "submitted").length,
    approved: lines.filter((l) => l.status === "approved").length,
    returned: lines.filter((l) => l.status === "returned").length,
    flagged: lines.filter((l) => l.flagged).length,
  };
}

/** Strips SPX-internal columns for the farm owner view. */
export function toOwnerView(line: RateCardLine): RateCardLineOwnerView {
  const {
    benchmarkFarmARate: _a,
    benchmarkFarmBRate: _b,
    spxJustificationNote: _note,
    ...rest
  } = line;
  return rest;
}
