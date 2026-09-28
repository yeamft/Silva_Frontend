"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
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
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
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
    { label: "Tickets open / closed", value: `${m.ticketsOpen} / ${m.ticketsClosed}` },
    { label: "Ticket close", value: `${m.ticketClosePct}%` },
    { label: "DFR pending / ok", value: `${m.dfrPending} / ${m.dfrValidated}` },
    { label: "DFR qty var", value: `${m.dfrAvgVariancePct}%` },
    { label: "Weekly active", value: String(m.weeklyActive) },
    { label: "Weekly submitted", value: String(m.weeklySubmitted) },
    { label: "Attention", value: String(m.attentionCount) },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg border px-3 py-2">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="font-semibold tabular-nums text-sm">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ReportsView() {
  const { activeProgram, user } = useCropfortAuth();
  const area = getCropfortArea("reports");
  const reportsQuery = useOpsReports(Boolean(activeProgram?.id));
  const reports = reportsQuery.data || [];
  const createMut = useCreateOpsReport();
  const updateMut = useUpdateOpsReport();
  const submitMut = useSubmitOpsReport();
  const releaseMut = useReleaseOpsReport();
  const returnMut = useReturnOpsReport();
  const removeMut = useDeleteOpsReport();

  const { workOrders, tickets, committedEtb, weekly, dfrs } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<ReportCadence>("monthly");
  const [periodLabel, setPeriodLabel] = useState("Tikimt 2019");

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!reports.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !reports.some((r) => r.id === selectedId)) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  const buildPayload = useCallback(() => {
    const completion = planCompletion();
    return generateReportPayload({
      farmName: plan?.farmName || activeProgram?.name || "Farm",
      programName: activeProgram?.name || "Programme",
      authorName: user.name || "SPX",
      plan,
      planBudgetEtb: completion.budgetEtb,
      committedEtb,
      workOrders,
      tickets,
      dfrs,
      weekly,
    });
  }, [
    planCompletion,
    plan,
    activeProgram,
    user.name,
    committedEtb,
    workOrders,
    tickets,
    dfrs,
    weekly,
  ]);

  const livePreview = useMemo(() => buildPayload(), [buildPayload]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  const canAuthor =
    user.role === "spx_validator" ||
    user.role === "spx_platform_admin" ||
    user.role === "field_supervisor" ||
    user.role === "bagro_office";
  const canRelease =
    user.role === "spx_validator" ||
    user.role === "spx_platform_admin" ||
    user.role === "farm_owner";

  const onCreate = async () => {
    const payload = buildPayload();
    try {
      const row = await createMut.mutateAsync({
        cadence,
        periodLabel: periodLabel.trim() || "Current period",
        title: `${CADENCE_LABEL[cadence]} operations report â€” ${periodLabel.trim() || "Current period"}`,
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
        metrics: payload.metrics,
        activityLines: payload.activityLines,
        blockLines: payload.blockLines,
        attentionItems: payload.attentionItems,
        missAttributions: payload.missAttributions,
      });
      setSelectedId(row.id);
      toast.success(`Drafted ${row.code} from live snapshot`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create report");
    }
  };

  const onRefresh = async () => {
    if (!selected) return;
    const payload = buildPayload();
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
          metrics: payload.metrics,
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

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance", href: CROPFORT_ROUTES.progress },
          { label: area.label },
        ]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href="/cropfort/performance/programme">Programme performance</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live plan" value={fmtEtb(livePreview.metrics.planEtb)} />
        <StatCard label="Live actual" value={fmtEtb(livePreview.metrics.actualEtb)} />
        <StatCard
          label="Live variance"
          value={`${livePreview.metrics.variancePct}%`}
        />
        <StatCard
          label="Attention items"
          value={String(livePreview.attentionItems.length)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1">
          <Label>Cadence</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as ReportCadence)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="six_month">Six-month</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Period</Label>
          <Input
            className="w-44"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
          />
        </div>
        <Button onClick={onCreate} disabled={!canAuthor}>
          Generate draft
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <SectionCard title="Reports" flush>
          {reports.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="divide-y">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm ${
                      selected?.id === r.id ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium">{r.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {CADENCE_LABEL[r.cadence]} Â· {r.periodLabel}
                    </span>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={selected ? selected.title : "Select a report"}>
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Generate a draft from the live ops snapshot. SPX authors; release to Silva when
              ready.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">
                  {CADENCE_LABEL[selected.cadence]} Â· {selected.periodLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selected.farmName} Â· {selected.programName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Author {selected.authorName}
                </span>
                {selected.releasedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Released {new Date(selected.releasedAt).toLocaleDateString()} â†’{" "}
                    {selected.releasedTo}
                  </span>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Performance snapshot</h3>
                <MetricGrid report={selected} />
              </div>

              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={selected.title}
                  disabled={!editable}
                  onChange={(e) => void updateMut.mutateAsync({ id: selected.id, patch: { title: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label>Period label</Label>
                <Input
                  value={selected.periodLabel}
                  disabled={!editable}
                  onChange={(e) =>
                    void updateMut.mutateAsync({ id: selected.id, patch: { periodLabel: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Executive summary</Label>
                <Textarea
                  rows={4}
                  value={selected.summary}
                  disabled={!editable}
                  onChange={(e) => void updateMut.mutateAsync({ id: selected.id, patch: { summary: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label>Highlights</Label>
                <Textarea
                  rows={2}
                  value={selected.highlights}
                  disabled={!editable}
                  onChange={(e) =>
                    void updateMut.mutateAsync({ id: selected.id, patch: { highlights: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Risks</Label>
                <Textarea
                  rows={2}
                  value={selected.risks}
                  disabled={!editable}
                  onChange={(e) => void updateMut.mutateAsync({ id: selected.id, patch: { risks: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label>Recommendations</Label>
                <Textarea
                  rows={3}
                  value={selected.recommendations}
                  disabled={!editable}
                  onChange={(e) =>
                    void updateMut.mutateAsync({ id: selected.id, patch: { recommendations: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Outlook</Label>
                <Textarea
                  rows={2}
                  value={selected.outlook}
                  disabled={!editable}
                  onChange={(e) => void updateMut.mutateAsync({ id: selected.id, patch: { outlook: e.target.value } })}
                />
              </div>

              {(selected.activityLines?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Activity variance</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Activity</th>
                          <th className="px-3 py-2 font-medium">WOs</th>
                          <th className="px-3 py-2 font-medium">Planned</th>
                          <th className="px-3 py-2 font-medium">Actual</th>
                          <th className="px-3 py-2 font-medium">Var %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selected.activityLines.map((row) => (
                          <tr key={row.activity}>
                            <td className="px-3 py-2">{row.activity}</td>
                            <td className="px-3 py-2 tabular-nums">{row.woCount}</td>
                            <td className="px-3 py-2 tabular-nums">{fmtEtb(row.planned)}</td>
                            <td className="px-3 py-2 tabular-nums">{fmtEtb(row.actual)}</td>
                            <td className="px-3 py-2 tabular-nums">
                              {row.variancePct > 0 ? "+" : ""}
                              {row.variancePct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {(selected.blockLines?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Block progress</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Block</th>
                          <th className="px-3 py-2 font-medium">Progress</th>
                          <th className="px-3 py-2 font-medium">Tickets</th>
                          <th className="px-3 py-2 font-medium">Spend</th>
                          <th className="px-3 py-2 font-medium">Planned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selected.blockLines.map((row) => (
                          <tr key={row.block}>
                            <td className="px-3 py-2">{row.block}</td>
                            <td className="px-3 py-2 tabular-nums">{row.progress}%</td>
                            <td className="px-3 py-2 tabular-nums">
                              {row.ticketsClosed}/{row.tickets}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{fmtEtb(row.spend)}</td>
                            <td className="px-3 py-2 tabular-nums">{fmtEtb(row.planned)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {(selected.attentionItems?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Items requiring attention</h3>
                  <ul className="divide-y rounded-lg border">
                    {selected.attentionItems.map((item) => (
                      <li
                        key={`${item.code}-${item.reason}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">{item.code}</span>{" "}
                          <span className="text-muted-foreground">{item.title}</span>
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          {item.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No attention items captured in this snapshot.
                </p>
              )}

              {(selected.missAttributions?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Miss cause attribution</h3>
                  <ul className="divide-y rounded-lg border">
                    {selected.missAttributions.map((item, i) => (
                      <li
                        key={`${item.cause}-${i}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">{item.kpiLabel}</span>{" "}
                          <span className="text-muted-foreground">{item.detail}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{item.cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(selected.events?.length ?? 0) > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Report trail</h3>
                  <ul className="space-y-2 text-sm">
                    {selected.events.map((ev) => (
                      <li key={ev.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                        <span className="tabular-nums">
                          {new Date(ev.at).toLocaleString()}
                        </span>
                        <span className="text-foreground">{ev.action}</span>
                        <span>Â· {ev.actor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {editable && canAuthor ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={onRefresh}>
                      Refresh from live
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!selected.summary.trim()) {
                          toast.error("Add a summary before submit");
                          return;
                        }
                        void submitMut
                          .mutateAsync(selected.id)
                          .then(() => toast.success("Submitted for release"))
                          .catch((e) =>
                            toast.error(e instanceof Error ? e.message : "Submit failed"),
                          );
                      }}
                    >
                      Submit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void removeMut
                          .mutateAsync(selected.id)
                          .then(() => toast.message("Draft removed"))
                          .catch((e) =>
                            toast.error(e instanceof Error ? e.message : "Delete failed"),
                          );
                      }}
                    >
                      Delete draft
                    </Button>
                  </>
                ) : null}
                {selected.status === "submitted" && canRelease ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        void releaseMut.mutateAsync({ id: selected.id }).then(() => {
                          if (selected.cadence === "monthly") {
                            toast.success("Released to Silva — create next monthly WO with Loop G", {
                              action: {
                                label: "Create next MWO",
                                onClick: () => {
                                  window.location.href = `${CROPFORT_ROUTES.monthlyWorkOrders}?fromReport=${selected.id}`;
                                },
                              },
                            });
                          } else {
                            toast.success("Released to Silva");
                          }
                        });
                      }}
                    >
                      Release to Silva
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void returnMut
                          .mutateAsync({ id: selected.id })
                          .then(() => toast.message("Returned for revision"))
                          .catch((e) =>
                            toast.error(e instanceof Error ? e.message : "Return failed"),
                          );
                      }}
                    >
                      Return
                    </Button>
                  </>
                ) : null}
                {selected.status === "draft" && canRelease ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!selected.summary.trim()) {
                        toast.error("Add a summary before release");
                        return;
                      }
                      void releaseMut.mutateAsync({ id: selected.id }).then(() => {
                        if (selected.cadence === "monthly") {
                          toast.success("Released — create next monthly WO with Loop G", {
                            action: {
                              label: "Create next MWO",
                              onClick: () => {
                                window.location.href = `${CROPFORT_ROUTES.monthlyWorkOrders}?fromReport=${selected.id}`;
                              },
                            },
                          });
                        } else {
                          toast.success("Released to Silva");
                        }
                      });
                    }}
                  >
                    Release draft
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" asChild>
                  <Link href="/cropfort/performance/variance">Open variance</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/cropfort/performance/kpis">Open KPIs</Link>
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

