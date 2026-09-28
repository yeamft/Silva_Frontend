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
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function ProgrammePerformanceView() {
  const { activeProgram } = useCropfortAuth();
  const { workOrders, tickets, afes, committedEtb, weekly, monthly, dfrs } =
    usePerformanceLiveData(Boolean(activeProgram?.id));
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);

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

  const health =
    snap.attentionCount === 0 && snap.variancePct > -15
      ? "on_track"
      : snap.attentionCount > 3 || Math.abs(snap.variancePct) > 25
        ? "at_risk"
        : "pending";

  const pillars = [
    {
      title: "Core operations",
      detail: plan
        ? `${plan.budgetYearLabel} · ${planCompletion().includedCount} activities`
        : "No programme plan",
      value: fmtEtb(snap.planEtb),
      href: CROPFORT_ROUTES.coreOperations,
    },
    {
      title: "Commitments",
      detail: `${afes.filter((a) => a.status === "approved").length} AFEs live`,
      value: fmtEtb(snap.committedEtb),
      href: CROPFORT_ROUTES.approvals,
    },
    {
      title: "Execution",
      detail: `${snap.woOpen} open WOs · ${snap.ticketsOpen} open tickets`,
      value: `${snap.woProgressAvg}%`,
      href: CROPFORT_ROUTES.workOrders,
    },
    {
      title: "Field evidence",
      detail: `${snap.dfrValidated} validated · ${snap.dfrPending} in queue`,
      value: `${snap.ticketClosePct}% closed`,
      href: CROPFORT_ROUTES.validationQueue,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title="Programme Performance"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance", href: CROPFORT_ROUTES.progress },
          { label: "Programme Performance" },
        ]}
        meta={
          <>
            <StatusBadge status={health} label={health.replace(/_/g, " ")} />
            {plan ? (
              <span className="text-xs text-muted-foreground">{plan.farmName}</span>
            ) : null}
          </>
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cropfort/performance/variance">Variance</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.reports}>Reports</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Plan" value={fmtEtb(snap.planEtb)} footnote="Core ops budget" />
        <StatCard label="Committed" value={fmtEtb(snap.committedEtb)} footnote="Approved AFEs" />
        <StatCard
          label="Actual"
          value={fmtEtb(snap.actualEtb)}
          emphasis
          footnote={`${snap.spendPct}% of plan`}
        />
        <StatCard
          label="Variance"
          value={`${snap.variancePct > 0 ? "+" : ""}${snap.variancePct}%`}
          intent={Math.abs(snap.variancePct) > 15 ? "negative" : "positive"}
          footnote={fmtEtb(snap.varianceEtb)}
        />
      </div>

      <SectionCard title="Spend vs plan">
        <div className="space-y-2">
          <Progress value={snap.spendPct} className="h-2.5" />
          <p className="text-xs text-muted-foreground">
            Forecast {fmtEtb(snap.forecastEtb)} · Attention items {snap.attentionCount}
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        {pillars.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <p className="text-xs text-muted-foreground">{p.title}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{p.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>
          </Link>
        ))}
      </div>

      <SectionCard title="Instrument mix" flush>
        <ul className="divide-y divide-border text-sm">
          <li className="flex justify-between px-5 py-3">
            <span>AFEs</span>
            <span className="tabular-nums text-muted-foreground">
              {afes.length} · {afes.filter((a) => a.status === "submitted").length} awaiting
            </span>
          </li>
          <li className="flex justify-between px-5 py-3">
            <span>Work orders</span>
            <span className="tabular-nums text-muted-foreground">
              {workOrders.length} · {snap.woOpen} open
            </span>
          </li>
          <li className="flex justify-between px-5 py-3">
            <span>Field tickets</span>
            <span className="tabular-nums text-muted-foreground">
              {tickets.length} · {snap.ticketsOpen} open
            </span>
          </li>
          <li className="flex justify-between px-5 py-3">
            <span>Monthly WOs</span>
            <span className="tabular-nums text-muted-foreground">
              {monthly.length} · {monthly.filter((m) => m.status === "active").length} active
            </span>
          </li>
          <li className="flex justify-between px-5 py-3">
            <span>Weekly plans</span>
            <span className="tabular-nums text-muted-foreground">
              {snap.weeklyActive} active · {snap.weeklySubmitted} submitted
            </span>
          </li>
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
