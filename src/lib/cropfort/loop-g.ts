/**
 * Loop G — fold released monthly report insights into next Monthly WO lines.
 */
import type { OpsReport } from "@/store/reportsStore";
import type {
  MonthlyWoLine,
  MonthlyWoRecommendedAdjustment,
  MonthlyWoStructuredInsights,
} from "@/types/agronomic-cycle";

const ADJUST_CAP = 20; // ±20%

function clampDelta(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(-ADJUST_CAP, Math.min(ADJUST_CAP, Math.round(pct)));
}

export function buildLoopGInsights(report: OpsReport | null | undefined): {
  narrative: string;
  structured: MonthlyWoStructuredInsights | null;
  adjustments: MonthlyWoRecommendedAdjustment[];
} {
  if (!report) {
    return { narrative: "", structured: null, adjustments: [] };
  }

  const narrative = [
    `${report.code} · ${report.periodLabel}`,
    report.summary?.trim(),
    report.variancePct != null
      ? `Variance ${report.variancePct}% · actual ${report.actualEtb} ETB vs plan ${report.planEtb}`
      : null,
    report.recommendations?.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const adjustments: MonthlyWoRecommendedAdjustment[] = [];

  for (const line of report.activityLines ?? []) {
    if (Math.abs(line.variancePct) < 10) continue;
    const qtyDeltaPct = clampDelta(-line.variancePct * 0.5);
    const etbDeltaPct = clampDelta(-line.variancePct * 0.4);
    if (qtyDeltaPct === 0 && etbDeltaPct === 0) continue;
    adjustments.push({
      id: `adj-${line.activity}-${adjustments.length}`,
      activityId: line.activity,
      activityCode: line.activity,
      activityName: line.activity,
      blockCode: null,
      qtyDeltaPct,
      etbDeltaPct,
      reason: `Prior variance ${line.variancePct > 0 ? "+" : ""}${line.variancePct}% — scale next month`,
      accepted: true,
    });
  }

  for (const miss of report.missAttributions ?? []) {
    const label = miss.kpiLabel || miss.cause;
    const existing = adjustments.find((a) =>
      a.activityName.toLowerCase().includes(label.toLowerCase().slice(0, 12)),
    );
    if (existing) {
      existing.reason += ` · miss: ${miss.detail || miss.cause}`;
      continue;
    }
    adjustments.push({
      id: `adj-miss-${adjustments.length}`,
      activityId: miss.cause,
      activityCode: miss.cause,
      activityName: label,
      blockCode: null,
      qtyDeltaPct: clampDelta(-8),
      etbDeltaPct: clampDelta(-5),
      reason: `Miss cause ${miss.cause}: ${miss.detail || "review capacity"}`,
      accepted: true,
    });
  }

  if (report.variancePct != null && Math.abs(report.variancePct) >= 10 && adjustments.length === 0) {
    adjustments.push({
      id: "adj-portfolio",
      activityId: "*",
      activityCode: "*",
      activityName: "All lines",
      blockCode: null,
      qtyDeltaPct: 0,
      etbDeltaPct: clampDelta(-report.variancePct * 0.25),
      reason: `Portfolio variance ${report.variancePct}% — soft ETB trim`,
      accepted: true,
    });
  }

  const structured: MonthlyWoStructuredInsights = {
    priorReportId: report.id,
    priorReportCode: report.code,
    periodLabel: report.periodLabel,
    variancePct: report.variancePct,
    missAttributions: (report.missAttributions ?? []).map((m) => ({
      cause: m.cause,
      detail: m.detail,
      kpiLabel: m.kpiLabel,
    })),
  };

  return { narrative, structured, adjustments };
}

/** Apply accepted Loop G adjustments onto derived monthly lines. */
export function applyLoopGAdjustments(
  lines: MonthlyWoLine[],
  adjustments: MonthlyWoRecommendedAdjustment[],
): MonthlyWoLine[] {
  const accepted = adjustments.filter((a) => a.accepted);
  if (!accepted.length) return lines;

  const portfolio = accepted.find((a) => a.activityId === "*");
  const byName = accepted.filter((a) => a.activityId !== "*");

  return lines.map((line) => {
    let qtyDelta = 0;
    let etbDelta = 0;
    const match = byName.find(
      (a) =>
        a.activityName.toLowerCase() === line.activityName.toLowerCase() ||
        a.activityCode.toLowerCase() === line.activityCode.toLowerCase() ||
        line.activityName.toLowerCase().includes(a.activityName.toLowerCase().slice(0, 8)),
    );
    if (match) {
      qtyDelta += match.qtyDeltaPct;
      etbDelta += match.etbDeltaPct;
    }
    if (portfolio) {
      etbDelta += portfolio.etbDeltaPct;
    }
    if (qtyDelta === 0 && etbDelta === 0) return line;
    const plannedQty = Math.max(
      0,
      Math.round(line.plannedQty * (1 + qtyDelta / 100) * 100) / 100,
    );
    const etb = Math.max(0, Math.round(line.etb * (1 + etbDelta / 100)));
    return { ...line, plannedQty, etb };
  });
}
