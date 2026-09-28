"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  computePerformanceSnapshot,
  fmtEtb,
} from "@/lib/cropfort/performance-metrics";
import { missCauseLabel } from "@/lib/cropfort/miss-cause";
import { useOpsReports } from "@/lib/query/hooks/use-ops-reports";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";

type Kpi = {
  id: string;
  label: string;
  value: string;
  target: string;
  pct: number;
  tone: "on_track" | "at_risk" | "pending";
  detail: string;
};

export default function KpisView() {
  const { activeProgram } = useCropfortAuth();
  const { workOrders, tickets, committedEtb, weekly, dfrs } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const reportsQuery = useOpsReports(Boolean(activeProgram?.id));
  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const sixMonthReviews = useAgreementConfigStore((s) => s.sixMonthReviews);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const snap = useMemo(
    () =>
      computePerformanceSnapshot({
        plan,
        planBudgetEtb: planCompletion().budgetEtb,
        committedEtb,
        workOrders,
        tickets,
        dfrs,
        weekly,
      }),
    [plan, planCompletion, committedEtb, workOrders, tickets, dfrs, weekly],
  );

  const siteCycleHrs = useMemo(() => {
    const submitted = tickets.filter(
      (t) => t.status === "submitted" || t.status === "site_reviewed" || t.status === "validated",
    );
    return submitted.length ? 18 : 0; // demo proxy until timestamps drive SLA
  }, [tickets]);

  const kpis: Kpi[] = useMemo(() => {
    const spendOk = snap.spendPct <= 100;
    const closeOk = snap.ticketClosePct >= 60;
    const dfrOk = snap.dfrAvgVariancePct <= 12;
    const attentionOk = snap.attentionCount <= 2;
    const cycleOk = siteCycleHrs === 0 || siteCycleHrs <= 24;

    return [
      {
        id: "spend",
        label: "Budget absorption",
        value: `${snap.spendPct}%`,
        target: "≤ 100% of plan",
        pct: Math.min(100, snap.spendPct),
        tone: spendOk ? "on_track" : "at_risk",
        detail: `${fmtEtb(snap.actualEtb)} of ${fmtEtb(snap.planEtb)}`,
      },
      {
        id: "close",
        label: "Ticket close rate",
        value: `${snap.ticketClosePct}%`,
        target: "≥ 60%",
        pct: snap.ticketClosePct,
        tone: closeOk ? "on_track" : "at_risk",
        detail: `${snap.ticketsClosed} closed · ${snap.ticketsOpen} open`,
      },
      {
        id: "wo",
        label: "WO completion",
        value: `${snap.woProgressAvg}%`,
        target: "≥ 50% mid-season",
        pct: snap.woProgressAvg,
        tone: snap.woProgressAvg >= 50 ? "on_track" : "pending",
        detail: `${snap.woComplete} complete · ${snap.woOpen} open`,
      },
      {
        id: "dfr",
        label: "DFR qty variance (avg |%|)",
        value: `${snap.dfrAvgVariancePct}%`,
        target: "≤ 12%",
        pct: Math.min(100, Math.round((snap.dfrAvgVariancePct / 12) * 100)),
        tone: dfrOk ? "on_track" : "at_risk",
        detail: `${snap.dfrValidated} validated · ${snap.dfrPending} pending`,
      },
      {
        id: "attention",
        label: "Exceptions open",
        value: String(snap.attentionCount),
        target: "≤ 2",
        pct: Math.min(100, snap.attentionCount * 25),
        tone: attentionOk ? "on_track" : "at_risk",
        detail: "Overdue WOs + returned / asset-hold tickets",
      },
      {
        id: "cycle",
        label: "Site-check cycle (proxy)",
        value: siteCycleHrs ? `${siteCycleHrs}h` : "—",
        target: "≤ 24h",
        pct: siteCycleHrs ? Math.min(100, Math.round((siteCycleHrs / 24) * 100)) : 0,
        tone: cycleOk ? "on_track" : "at_risk",
        detail: `${tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length} awaiting site`,
      },
    ];
  }, [snap, siteCycleHrs, tickets]);

  const onTrack = kpis.filter((k) => k.tone === "on_track").length;

  const missRows = useMemo(() => {
    const fromDfr = dfrs
      .filter((r) => r.missCause)
      .map((r) => ({
        id: r.id,
        label: `${r.code} · ${r.activityName}`,
        cause: missCauseLabel(r.missCause),
        detail: `Variance ${r.variancePct}% · ${r.monthlyWoCode || ""}`,
      }));
    const fromReports = reports.flatMap((r) =>
      (r.missAttributions ?? []).map((m, i) => ({
        id: `${r.id}-${i}`,
        label: `${r.code} · ${m.kpiLabel}`,
        cause: missCauseLabel(m.cause),
        detail: m.detail,
      })),
    );
    return [...fromDfr, ...fromReports].slice(0, 12);
  }, [dfrs, reports]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title="KPIs"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance", href: CROPFORT_ROUTES.progress },
          { label: "KPIs" },
        ]}
        meta={
          <span className="text-xs text-muted-foreground">
            {onTrack}/{kpis.length} on track
            {sixMonthReviews.length
              ? ` · ${sixMonthReviews.length} six-month review(s)`
              : ""}
          </span>
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cropfort/control/exceptions">Exceptions</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.reports}>Reports</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.agreementLifecycle}>Agreement reviews</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="On track" value={`${onTrack}/${kpis.length}`} emphasis />
        <StatCard label="Spend" value={`${snap.spendPct}%`} footnote="of plan" />
        <StatCard label="Ticket close" value={`${snap.ticketClosePct}%`} />
        <StatCard
          label="DFR variance"
          value={`${snap.dfrAvgVariancePct}%`}
          intent={snap.dfrAvgVariancePct > 12 ? "negative" : "positive"}
        />
      </div>

      <SectionCard title="Sch. 8 process indicators" flush>
        <ul className="divide-y divide-border">
          {kpis.map((k) => (
            <li key={k.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{k.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Target {k.target} · {k.detail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="cf-numeric text-sm font-semibold">{k.value}</span>
                  <StatusBadge status={k.tone} label={k.tone.replace(/_/g, " ")} />
                </div>
              </div>
              <Progress value={k.pct} className="h-1.5" />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Miss cause attribution (RB04.14)"
        className="mt-4"
        action={
          <Button size="sm" asChild>
            <Link href={`${CROPFORT_ROUTES.monthlyWorkOrders}?fromKpi=1`}>
              Apply to next month plan
            </Link>
          </Button>
        }
      >
        {missRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coded misses yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {missRows.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground"> · {m.detail}</span>
                </span>
                <StatusBadge status="pending" label={m.cause} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
