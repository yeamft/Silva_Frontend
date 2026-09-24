import {
  activityVarianceRows,
  computePerformanceSnapshot,
  type PerformanceSnapshot,
} from "@/lib/cropfort/performance-metrics";
import { MISS_CAUSE_LABELS, type MissCause } from "@/lib/cropfort/miss-cause";
import { ticketWaitingOn, type FieldTicket, type WorkOrder } from "@/store/cropfortOpsStore";
import type { CoreOpsPlan } from "@/types/core-ops";
import type { DailyFieldRecord, WeeklyPlan } from "@/types/agronomic-cycle";

export type ReportMetrics = PerformanceSnapshot & {
  committedEtb: number;
};

export type ReportActivityLine = {
  activity: string;
  planned: number;
  actual: number;
  variancePct: number;
  woCount: number;
};

export type ReportBlockLine = {
  block: string;
  progress: number;
  tickets: number;
  ticketsClosed: number;
  spend: number;
  planned: number;
};

export type ReportAttentionItem = {
  code: string;
  title: string;
  reason: string;
  href?: string;
};

export type ReportGenerationInput = {
  farmName: string;
  programName: string;
  authorName: string;
  plan: CoreOpsPlan | null;
  planBudgetEtb: number;
  committedEtb: number;
  workOrders: WorkOrder[];
  tickets: FieldTicket[];
  dfrs: DailyFieldRecord[];
  weekly: WeeklyPlan[];
};

export type ReportMissAttribution = {
  cause: MissCause;
  detail: string;
  kpiLabel: string;
};

export type ReportGeneratedPayload = {
  farmName: string;
  programName: string;
  authorName: string;
  metrics: ReportMetrics;
  activityLines: ReportActivityLine[];
  blockLines: ReportBlockLine[];
  attentionItems: ReportAttentionItem[];
  missAttributions: ReportMissAttribution[];
  summary: string;
  highlights: string;
  risks: string;
  recommendations: string;
  outlook: string;
};

export function generateReportPayload(input: ReportGenerationInput): ReportGeneratedPayload {
  const snap = computePerformanceSnapshot({
    plan: input.plan,
    planBudgetEtb: input.planBudgetEtb,
    committedEtb: input.committedEtb,
    workOrders: input.workOrders,
    tickets: input.tickets,
    dfrs: input.dfrs,
    weekly: input.weekly,
  });

  const metrics: ReportMetrics = { ...snap, committedEtb: Math.round(input.committedEtb) };

  const activityLines: ReportActivityLine[] = activityVarianceRows(
    input.workOrders,
    input.tickets,
  ).map((r) => ({
    activity: r.label,
    planned: r.planned,
    actual: r.actual,
    variancePct: r.variancePct,
    woCount: Number(r.meta.match(/\d+/)?.[0] ?? 0),
  }));

  type BlockAcc = ReportBlockLine & { woCount: number };
  const blockMap = new Map<string, BlockAcc>();
  for (const wo of input.workOrders) {
    const cur = blockMap.get(wo.block) ?? {
      block: wo.block,
      progress: 0,
      tickets: 0,
      ticketsClosed: 0,
      spend: 0,
      planned: 0,
      woCount: 0,
    };
    cur.planned += wo.etb;
    cur.spend += Math.round(wo.etb * (wo.progress / 100));
    cur.progress += wo.progress;
    cur.woCount += 1;
    blockMap.set(wo.block, cur);
  }
  for (const t of input.tickets) {
    const cur = blockMap.get(t.block) ?? {
      block: t.block,
      progress: 0,
      tickets: 0,
      ticketsClosed: 0,
      spend: 0,
      planned: 0,
      woCount: 0,
    };
    cur.tickets += 1;
    if (t.status === "validated") cur.ticketsClosed += 1;
    blockMap.set(t.block, cur);
  }
  const blockLines: ReportBlockLine[] = [...blockMap.values()]
    .map((b) => ({
      block: b.block,
      progress: Math.round(b.progress / Math.max(1, b.woCount)),
      tickets: b.tickets,
      ticketsClosed: b.ticketsClosed,
      spend: b.spend,
      planned: b.planned,
    }))
    .sort((a, b) => a.progress - b.progress);

  const attentionItems: ReportAttentionItem[] = [];
  for (const wo of input.workOrders) {
    if (wo.attention === "none") continue;
    attentionItems.push({
      code: wo.code,
      title: wo.title,
      reason: wo.attention === "overdue" ? "Overdue" : "Insurance hold",
    });
  }
  for (const t of input.tickets) {
    if (t.status === "returned") {
      attentionItems.push({
        code: t.code,
        title: t.title,
        reason: "Returned for correction",
      });
    } else if (ticketWaitingOn(t.status) === "asset_owner") {
      attentionItems.push({
        code: t.code,
        title: t.title,
        reason: "Awaiting asset close",
      });
    }
  }

  const topActs = activityLines.slice(0, 3);
  const summary = [
    `${input.farmName} programme activity for this period shows ${metrics.spendPct}% budget absorption`,
    `(actual ${Math.round(metrics.actualEtb).toLocaleString()} ETB vs plan ${Math.round(metrics.planEtb).toLocaleString()} ETB).`,
    `Work-order progress averages ${metrics.woProgressAvg}% with ${metrics.ticketsClosed} of ${metrics.ticketsClosed + metrics.ticketsOpen} tickets closed.`,
    metrics.attentionCount
      ? `${metrics.attentionCount} items require management attention.`
      : "No critical exceptions are open.",
  ].join(" ");

  const highlights = [
    metrics.woComplete ? `${metrics.woComplete} work order(s) complete` : null,
    metrics.ticketClosePct ? `Ticket close rate ${metrics.ticketClosePct}%` : null,
    topActs[0]
      ? `${topActs[0].activity}: ${topActs[0].variancePct > 0 ? "+" : ""}${topActs[0].variancePct}% vs plan`
      : null,
    blockLines[0] ? `Lowest block progress: ${blockLines[0].block} (${blockLines[0].progress}%)` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const risks = attentionItems.length
    ? attentionItems
        .slice(0, 4)
        .map((a) => `${a.code} ${a.reason}`)
        .join(" · ")
    : "No material risks flagged in the current snapshot.";

  const recommendations = [
    metrics.spendPct < 40
      ? "Accelerate issue of approved AFEs into work orders for under-spent lines."
      : null,
    metrics.ticketClosePct < 60
      ? "Tighten site-check / asset-close cadence to lift ticket close rate."
      : null,
    attentionItems.some((a) => a.reason.includes("Insurance"))
      ? "Clear insurance holds before further issue on blocked WOs."
      : null,
    metrics.dfrAvgVariancePct > 12
      ? "Review DFR quantity variance against Schedule 5 tolerances."
      : null,
    "Confirm next-period weekly plan against the approved monthly WO.",
  ]
    .filter(Boolean)
    .join(" ");

  const outlook =
    metrics.forecastEtb > metrics.planEtb
      ? `Forecast ${Math.round(metrics.forecastEtb).toLocaleString()} ETB sits above plan; monitor Band thresholds before further commitments.`
      : `Forecast ${Math.round(metrics.forecastEtb).toLocaleString()} ETB remains within plan headroom of ${Math.round(metrics.planEtb - metrics.forecastEtb).toLocaleString()} ETB.`;

  const missAttributions: ReportMissAttribution[] = [];
  for (const r of input.dfrs) {
    if (!r.missCause) continue;
    if (Math.abs(r.variancePct) <= 10 && (r.pctDone == null || r.pctDone >= 90)) continue;
    missAttributions.push({
      cause: r.missCause,
      kpiLabel: `${r.code} · ${r.activityName}`,
      detail: `${MISS_CAUSE_LABELS[r.missCause]} · variance ${r.variancePct}% · ${r.monthlyWoCode || ""}`,
    });
  }
  if (metrics.variancePct < -10) {
    missAttributions.push({
      cause: "spx",
      kpiLabel: "Budget vs actual",
      detail: `Programme underspend ${metrics.variancePct}% — review phasing`,
    });
  } else if (metrics.variancePct > 10) {
    missAttributions.push({
      cause: "chaka_buna",
      kpiLabel: "Budget vs actual",
      detail: `Programme overspend ${metrics.variancePct}% — check commitments`,
    });
  }

  return {
    farmName: input.farmName,
    programName: input.programName,
    authorName: input.authorName,
    metrics,
    activityLines,
    blockLines,
    attentionItems: attentionItems.slice(0, 12),
    missAttributions: missAttributions.slice(0, 12),
    summary,
    highlights,
    risks,
    recommendations,
    outlook,
  };
}
