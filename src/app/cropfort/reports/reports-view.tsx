"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  PageContainer,
  PageHeader,
  SectionCard,
} from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCropfortArea } from "@/config/cropfort-areas";
import { cn } from "@/lib/utils";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { fmtEtb } from "@/lib/cropfort/performance-metrics";
import { generateReportPayload } from "@/lib/cropfort/report-builder";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import {
  useCreateOpsReport,
  useDeleteOpsReport,
  useOpsReports,
  useReleaseOpsReport,
  useReturnOpsReport,
  useSubmitOpsReport,
  useUpdateOpsReport,
} from "@/lib/query/hooks/use-ops-reports";
import { PLAN_MONTH_NAMES } from "@/lib/annual-plan-budget";
import { PLAN_MONTH_LABELS, PLAN_MONTHS } from "@/lib/cropfort/ethiopian-year";
import { monthsForPeriod, monthsLabel, planPeriodOf } from "@/lib/cropfort/plan-period";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import type { OpsReport, ReportCadence } from "@/store/reportsStore";

const CADENCE_LABEL: Record<ReportCadence, string> = {
  monthly: "Monthly",
  six_month: "Six-month",
  annual: "Annual",
};

function MetricGrid({ report }: { report: OpsReport }) {
  const m = report.metrics;
  const cells = [
    { label: "Plan", value: fmtEtb(m.planEtb) },
    { label: "Committed", value: fmtEtb(m.committedEtb) },
    { label: "Actual", value: fmtEtb(m.actualEtb) },
    { label: "Forecast", value: fmtEtb(m.forecastEtb) },
    { label: "Variance", value: `${m.variancePct}%` },
    { label: "Spend", value: `${m.spendPct}%` },
    { label: "WO progress", value: `${m.woProgressAvg}%` },
    { label: "WOs open / done", value: `${m.woOpen} / ${m.woComplete}` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg border px-3 py-2">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="font-semibold tabular-nums text-sm">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

const REPORT_SECTIONS = [
  { key: "summary", label: "Summary", rows: 4 },
  { key: "highlights", label: "Highlights", rows: 2 },
  { key: "risks", label: "Risks", rows: 2 },
  { key: "recommendations", label: "Recommendations", rows: 3 },
  { key: "outlook", label: "Outlook", rows: 2 },
] as const;

/** Gregorian month names in plan order (the plan year runs October → September). */
const GC_MONTH_NAMES = [
  "October", "November", "December", "January", "February", "March",
  "April", "May", "June", "July", "August", "September",
] as const;

/** Gregorian year of a plan month: October–December fall in the year before the plan's end year. */
const gcYearOf = (plan: ProgrammePlanDto, index: number) => plan.budgetYearGc - (index <= 2 ? 1 : 0);

/** "Oct 2026 – Mar 2027", or "Apr – Sep 2027" when both ends are in the same year. */
function gcRangeLabel(plan: ProgrammePlanDto, first: number, last: number) {
  const short = (i: number) => PLAN_MONTH_LABELS[PLAN_MONTHS[i]];
  const [y1, y2] = [gcYearOf(plan, first), gcYearOf(plan, last)];
  return y1 === y2 ? `${short(first)} – ${short(last)} ${y2}` : `${short(first)} ${y1} – ${short(last)} ${y2}`;
}

/** Report periods offered for a Core Operations plan, as Gregorian months and years. */
function periodsForPlan(plan: ProgrammePlanDto, cadence: ReportCadence): string[] {
  const period = planPeriodOf(plan);
  // A six-month plan has no full-year report, and one six-month report covering its own months
  if (cadence === "annual") return period === "annual" ? [plan.budgetYearLabel || `${plan.budgetYearGc} plan year`] : [];
  if (cadence === "six_month") {
    if (period !== "annual") {
      const months = monthsForPeriod(period);
      const idx = months.map((m) => PLAN_MONTHS.indexOf(m));
      const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
      const last = idx[idx.length - 1];
      return [consecutive ? gcRangeLabel(plan, idx[0], last) : `${monthsLabel(months)} ${gcYearOf(plan, last)}`];
    }
    return [gcRangeLabel(plan, 0, 5), gcRangeLabel(plan, 6, 11)];
  }
  const included = plan.activityIds.map((id) => plan.activities[id]).filter((a) => a?.included);
  const scheduled = PLAN_MONTHS.map((m, i) => ({ m, i })).filter(({ m }) =>
    included.some((a) => a.intensities?.[m] && a.intensities[m] !== "none"),
  );
  return (scheduled.length ? scheduled : PLAN_MONTHS.map((m, i) => ({ m, i }))).map(
    ({ i }) => `${GC_MONTH_NAMES[i]} ${gcYearOf(plan, i)}`,
  );
}

type SourcedMetrics = OpsReport["metrics"] & { sourcePlanId?: string };

/** Same weights monthly work orders use to spread a plan line over its scheduled months. */
const INTENSITY_SHARE: Record<string, number> = { peak: 0.4, active: 0.25, light: 0.1 };

/** The plan's budget for the report period — one month, a half-year or the whole year. */
function periodBudget(plan: ProgrammePlanDto, cadence: ReportCadence, periodLabel: string) {
  if (cadence === "annual") return plan.plannedCostEtb ?? 0;
  // New labels start with the Gregorian month ("March 2027", "Oct 2026 – Mar 2027"); older ones with the EC name
  let first = PLAN_MONTHS.findIndex((m) => periodLabel.startsWith(PLAN_MONTH_LABELS[m]));
  if (first < 0) first = PLAN_MONTH_NAMES.findIndex((name) => periodLabel.startsWith(name));
  if (first < 0) return plan.plannedCostEtb ?? 0;
  const months = cadence === "six_month" ? PLAN_MONTHS.slice(first, first + 6) : [PLAN_MONTHS[first]];
  return plan.activityIds
    .map((id) => plan.activities[id])
    .filter((a) => a?.included)
    .reduce((sum, a) => {
      const weight = (m: (typeof PLAN_MONTHS)[number]) => INTENSITY_SHARE[a.intensities?.[m] ?? "none"] ?? 0;
      const total = PLAN_MONTHS.reduce((t, m) => t + weight(m), 0);
      if (!total) return sum;
      return sum + a.plannedCost * (months.reduce((t, m) => t + weight(m), 0) / total);
    }, 0);
}

/** Older reports were saved with mis-encoded dashes and dots (e.g. "â€”"); show them correctly. */
function cleanText(value: string) {
  return value.replace(/â€”/g, "—").replace(/â€“/g, "–").replace(/â†’/g, "→").replace(/Â·/g, "·");
}

export default function ReportsView({ reportId }: { reportId?: string }) {
  const router = useRouter();
  const { activeProgram, user } = useCropfortAuth();
  const area = getCropfortArea("reports");
  const reportsQuery = useOpsReports(Boolean(activeProgram?.id));
  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const createMut = useCreateOpsReport();
  const updateMut = useUpdateOpsReport();
  const submitMut = useSubmitOpsReport();
  const releaseMut = useReleaseOpsReport();
  const returnMut = useReturnOpsReport();
  const removeMut = useDeleteOpsReport();

  const { workOrders, tickets, committedEtb, weekly, dfrs } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );
  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id), { status: "approved" });
  const plans = useMemo(() => plansQuery.data || [], [plansQuery.data]);

  const params = useSearchParams();
  const selectedId = reportId ?? null;

  // Old links used ?report=<id>; send them to the report's own page
  const legacyReportParam = params.get("report");
  useEffect(() => {
    if (!reportId && legacyReportParam) {
      router.replace(`${CROPFORT_ROUTES.reports}/${encodeURIComponent(legacyReportParam)}`);
    }
  }, [reportId, legacyReportParam, router]);
  const [returnOpen, setReturnOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const wantsEdit = params.get("edit") === "1";
  const [form, setForm] = useState<Record<"title" | (typeof REPORT_SECTIONS)[number]["key"], string> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpsReport | null>(null);
  const [cadence, setCadence] = useState<ReportCadence>("monthly");
  const [planId, setPlanId] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");

  const sourcePlan = plans.find((p) => p.id === planId) ?? null;
  const periodOptions = useMemo(
    () => (sourcePlan ? periodsForPlan(sourcePlan, cadence) : []),
    [sourcePlan, cadence],
  );
  useEffect(() => {
    if (!planId && plans.length) setPlanId(plans[0].id);
  }, [plans, planId]);
  useEffect(() => {
    if (!periodOptions.includes(periodLabel)) setPeriodLabel(periodOptions[0] ?? "");
  }, [periodOptions, periodLabel]);

  /** Report figures for one Core Operations plan: its budget and the work orders on its farm. */
  const buildPayload = useCallback(
    (plan: ProgrammePlanDto | null, reportCadence: ReportCadence = "annual", period = "") => {
      const onFarm = plan ? workOrders.filter((wo) => wo.farm === plan.farmName) : [];
      const planOrders = onFarm.length ? onFarm : workOrders;
      const orderIds = new Set(planOrders.map((wo) => wo.id));
      return generateReportPayload({
        farmName: plan?.farmName || activeProgram?.name || "Farm",
        programName: plan?.name || activeProgram?.name || "Core Operations",
        authorName: user.name || "SPX",
        plan,
        planBudgetEtb: plan ? periodBudget(plan, reportCadence, period) : 0,
        committedEtb,
        workOrders: planOrders,
        tickets: tickets.filter((t) => orderIds.has(t.workOrderId)),
        dfrs,
        weekly,
      });
    },
    [activeProgram, user.name, committedEtb, workOrders, tickets, dfrs, weekly],
  );

  const livePreview = useMemo(
    () => buildPayload(sourcePlan, cadence, periodLabel),
    [buildPayload, sourcePlan, cadence, periodLabel],
  );

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const canAuthor =
    user.role === "spx_validator" ||
    user.role === "spx_platform_admin" ||
    user.role === "field_supervisor" ||
    user.role === "bagro_office";
  /** SPX submits; the Silva asset owner accepts or returns. */
  const canRelease = user.role === "farm_owner";

  const onCreate = async () => {
    if (!sourcePlan || !periodLabel) {
      toast.error("Choose an approved Core Operations plan and a period");
      return;
    }
    const payload = buildPayload(sourcePlan, cadence, periodLabel);
    try {
      const row = await createMut.mutateAsync({
        cadence,
        periodLabel,
        title: `${CADENCE_LABEL[cadence]} report · ${periodLabel}`,
        farmName: payload.farmName,
        programName: payload.programName,
        authorName: payload.authorName,
        summary: payload.summary,
        highlights: payload.highlights,
        risks: payload.risks,
        recommendations: payload.recommendations,
        outlook: payload.outlook,
        planEtb: payload.metrics.planEtb,
        actualEtb: payload.metrics.actualEtb,
        variancePct: payload.metrics.variancePct,
        metrics: { ...payload.metrics, sourcePlanId: sourcePlan.id } as SourcedMetrics,
        activityLines: payload.activityLines,
        blockLines: payload.blockLines,
        attentionItems: payload.attentionItems,
        missAttributions: payload.missAttributions,
      });
      setGenerateOpen(false);
      router.push(`${CROPFORT_ROUTES.reports}/${row.id}`);
      toast.success(`Drafted ${row.code} from live snapshot`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create report");
    }
  };

  const onRefresh = async () => {
    if (!selected) return;
    const reportPlanId = (selected.metrics as SourcedMetrics)?.sourcePlanId;
    const reportPlan =
      plans.find((p) => p.id === reportPlanId) ?? plans.find((p) => p.farmName === selected.farmName) ?? null;
    const payload = buildPayload(reportPlan, selected.cadence, selected.periodLabel);
    try {
      await updateMut.mutateAsync({
        id: selected.id,
        patch: {
          summary: payload.summary,
          highlights: payload.highlights,
          risks: payload.risks,
          recommendations: payload.recommendations,
          outlook: payload.outlook,
          planEtb: payload.metrics.planEtb,
          actualEtb: payload.metrics.actualEtb,
          variancePct: payload.metrics.variancePct,
          metrics: { ...payload.metrics, sourcePlanId: reportPlan?.id } as SourcedMetrics,
          activityLines: payload.activityLines,
          blockLines: payload.blockLines,
          attentionItems: payload.attentionItems,
          missAttributions: payload.missAttributions,
          farmName: payload.farmName,
          programName: payload.programName,
        },
      });
      toast.success("Narrative and tables refreshed from live ops");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    }
  };

  const editable =
    selected && (selected.status === "draft" || selected.status === "returned");
  /** SPX can edit or delete anything the asset owner hasn't accepted yet. */
  const canChange = (r: OpsReport) => canAuthor && r.status !== "released";

  const startEditing = () => {
    if (!selected) return;
    setForm({
      title: cleanText(selected.title),
      summary: selected.summary,
      highlights: selected.highlights,
      risks: selected.risks,
      recommendations: selected.recommendations,
      outlook: selected.outlook,
    });
  };

  // ?edit=1 (from the table's Edit action) opens the report straight in edit mode
  useEffect(() => {
    if (wantsEdit && selected && !form && canChange(selected)) startEditing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsEdit, selected?.id]);

  const saveEdits = async () => {
    if (!selected || !form) return;
    if (!form.title.trim()) {
      toast.error("Give the report a title");
      return;
    }
    const wasSubmitted = selected.status === "submitted";
    try {
      await updateMut.mutateAsync({ id: selected.id, patch: { ...form, title: form.title.trim() } });
      setForm(null);
      toast.success(wasSubmitted ? "Saved · taken back from review, submit again when ready" : "Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.code} deleted`);
      setDeleteTarget(null);
      if (reportId) router.push(CROPFORT_ROUTES.reports);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <PageContainer>
      {reportId ? (
        <>
      <PageHeader
        eyebrow={selected ? `${selected.code} · ${CADENCE_LABEL[selected.cadence]} · ${selected.periodLabel}` : "Report"}
        title={selected ? cleanText(selected.title) : reportsQuery.isLoading ? "Loading…" : "Report not found"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label, href: CROPFORT_ROUTES.reports },
          { label: selected?.code || "Report" },
        ]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.reports}>Back to reports</Link>
          </Button>
        }
      />
      {selected ? (
        <div className="space-y-4">
          <SectionCard>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <StatusBadge status={selected.status} />
              <span className="text-muted-foreground">{selected.farmName || selected.programName}</span>
              <span className="text-muted-foreground">By {selected.authorName}</span>
              {selected.releasedAt ? (
                <span className="text-muted-foreground">
                  Accepted {new Date(selected.releasedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            {selected.status === "returned" && selected.returnedComment ? (
              <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                Returned by the asset owner: {selected.returnedComment}
              </p>
            ) : null}
            <div className="mt-4">
              <MetricGrid report={selected} />
            </div>
          </SectionCard>

          <SectionCard title="Report">
            <div className="space-y-4">
              {form ? (
                <>
                  {selected.status === "submitted" ? (
                    <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                      Saving takes this report back from the asset owner&apos;s review. Submit it again when it&apos;s ready.
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    <Label htmlFor="report-title">Title</Label>
                    <Input
                      id="report-title"
                      value={form.title}
                      onChange={(e) => setForm((f) => f && { ...f, title: e.target.value })}
                    />
                  </div>
                  {REPORT_SECTIONS.map(({ key, label, rows }) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`report-${key}`}>{label}</Label>
                      <Textarea
                        id={`report-${key}`}
                        rows={rows}
                        value={form[key]}
                        onChange={(e) => setForm((f) => f && { ...f, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </>
              ) : (
                REPORT_SECTIONS.map(({ key, label }) =>
                  selected[key].trim() ? (
                    <div key={key}>
                      <h3 className="text-sm font-semibold">{label}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {selected[key]}
                      </p>
                    </div>
                  ) : null,
                )
              )}
            </div>
          </SectionCard>

          {(selected.activityLines?.length ?? 0) > 0 ? (
            <SectionCard title="Activities" flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.activityLines.map((row) => (
                    <TableRow key={row.activity}>
                      <TableCell>{row.activity}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEtb(row.planned)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEtb(row.actual)}</TableCell>
                      <TableCell
                        className={cn("text-right tabular-nums", row.variancePct > 0 && "text-destructive")}
                      >
                        {row.variancePct > 0 ? "+" : ""}
                        {row.variancePct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          ) : null}

          {(selected.attentionItems?.length ?? 0) + (selected.missAttributions?.length ?? 0) > 0 ? (
            <SectionCard title="Needs attention">
              <ul className="divide-y divide-border text-sm">
                {(selected.attentionItems || []).map((item) => (
                  <li key={`${item.code}-${item.reason}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{item.code}</span>{" "}
                      <span className="text-muted-foreground">{item.title}</span>
                    </span>
                    <span className="text-xs text-warning">{item.reason}</span>
                  </li>
                ))}
                {(selected.missAttributions || []).map((item, i) => (
                  <li key={`${item.cause}-${i}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{item.kpiLabel}</span>{" "}
                      <span className="text-muted-foreground">{item.detail}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{item.cause}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {(selected.events?.length ?? 0) > 0 ? (
            <details className="rounded-lg border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">History ({selected.events.length})</summary>
              <ul className="mt-3 space-y-1.5 text-sm">
                {selected.events.map((ev) => (
                  <li key={ev.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                    <span className="tabular-nums">{new Date(ev.at).toLocaleString()}</span>
                    <span className="text-foreground">{ev.action}</span>
                    <span>· {ev.actor}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background py-3">
            {form ? (
              <>
                <Button onClick={() => void saveEdits()} disabled={updateMut.isPending}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancel
                </Button>
              </>
            ) : canChange(selected) ? (
              <>
                {editable ? (
                  <Button
                    onClick={() => {
                      if (!selected.summary.trim()) {
                        toast.error("Add a summary before submitting");
                        return;
                      }
                      void submitMut
                        .mutateAsync(selected.id)
                        .then(() => toast.success("Sent to the asset owner for review"))
                        .catch((e) => toast.error(e instanceof Error ? e.message : "Submit failed"));
                    }}
                  >
                    Submit to asset owner
                  </Button>
                ) : null}
                <Button variant="outline" onClick={startEditing}>
                  <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                  Edit
                </Button>
                {editable ? (
                  <Button variant="outline" onClick={onRefresh}>
                    Refresh figures
                  </Button>
                ) : null}
                <Button variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Delete
                </Button>
              </>
            ) : null}
            {selected.status === "submitted" && canRelease ? (
              <>
                <Button
                  disabled={releaseMut.isPending}
                  onClick={() =>
                    void releaseMut
                      .mutateAsync({ id: selected.id })
                      .then(() => toast.success("Report accepted"))
                      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not accept"))
                  }
                >
                  Accept
                </Button>
                <Button variant="outline" onClick={() => setReturnOpen(true)}>
                  Return for changes
                </Button>
              </>
            ) : null}
            {selected.status === "submitted" && !canRelease ? (
              <p className="text-sm text-muted-foreground">Waiting for the asset owner&apos;s review.</p>
            ) : null}
          </div>
        </div>
      ) : !reportsQuery.isLoading ? (
        <SectionCard>
          <p className="py-6 text-center text-sm text-muted-foreground">
            This report doesn&apos;t exist or isn&apos;t available to you.
          </p>
        </SectionCard>
      ) : null}
        </>
      ) : (
        <>
      <PageHeader
        eyebrow={activeProgram?.name || "Control"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        actions={
          canAuthor ? (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Generate report
            </Button>
          ) : null
        }
      />

      <SectionCard flush>
        <Table containerClassName="cf-fit-table">
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Plan</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No reports yet.
                  {canAuthor ? (
                    <Button size="sm" variant="link" onClick={() => setGenerateOpen(true)}>
                      Generate the first one
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => (
                <TableRow key={r.id} onClick={() => router.push(`${CROPFORT_ROUTES.reports}/${r.id}`)}>
                  <TableCell>
                    <span className="block font-medium">{cleanText(r.title)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{r.code}</span>
                  </TableCell>
                  <TableCell className="text-sm">{CADENCE_LABEL[r.cadence]}</TableCell>
                  <TableCell className="text-sm">{r.periodLabel}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtEtb(r.planEtb)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtEtb(r.actualEtb)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums text-sm",
                      r.variancePct > 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {r.variancePct > 0 ? "+" : ""}
                    {r.variancePct}%
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canChange(r) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${r.code}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`${CROPFORT_ROUTES.reports}/${r.id}?edit=1`)}>
                            <Pencil className="mr-2 h-4 w-4" aria-hidden />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>
        </>
      )}


      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
          </DialogHeader>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Reports are built from an approved Core Operations plan, and there isn&apos;t one yet.{" "}
              <Link href={CROPFORT_ROUTES.programmePlans} className="font-medium text-primary hover:underline">
                Open Core Operations plans
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Core Operations plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.farmName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={cadence} onValueChange={(v) => setCadence(v as ReportCadence)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="six_month">Six-month</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select value={periodLabel} onValueChange={setPeriodLabel} disabled={!periodOptions.length}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sourcePlan ? (
                <p className="text-xs text-muted-foreground">
                  Plan for this period {fmtEtb(livePreview.metrics.planEtb)} · actual so far {fmtEtb(livePreview.metrics.actualEtb)}
                  {cadence === "monthly" ? " · months shown are the ones the plan schedules work in" : ""}.
                </p>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={createMut.isPending || !sourcePlan || !periodLabel}>
              Generate draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.code ?? "report"}?`}
        description={
          deleteTarget?.status === "submitted"
            ? "It is waiting for the asset owner's review and will be removed from it. This can't be undone."
            : "This can't be undone."
        }
        confirmLabel="Delete"
        loading={removeMut.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return report for changes</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="What needs to change?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!returnNote.trim() || !selected || returnMut.isPending}
              onClick={() => {
                if (!selected) return;
                void returnMut
                  .mutateAsync({ id: selected.id, comment: returnNote.trim() })
                  .then(() => {
                    toast.success("Returned to SPX");
                    setReturnOpen(false);
                    setReturnNote("");
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Return failed"));
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
