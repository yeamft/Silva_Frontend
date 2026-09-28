"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { includedActivities, categoryBudget } from "@/lib/cropfort/planning-helpers";
import {
  activityVarianceRows,
  computePerformanceSnapshot,
  fmtEtb,
} from "@/lib/cropfort/performance-metrics";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function VarianceAnalysisView() {
  const { activeProgram } = useCropfortAuth();
  const { workOrders, tickets, committedEtb, weekly, dfrs } = usePerformanceLiveData(
    Boolean(activeProgram?.id),
  );
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

  const acts = useMemo(() => includedActivities(plan), [plan]);
  const categories = useMemo(() => categoryBudget(acts), [acts]);
  const activityRows = useMemo(
    () => activityVarianceRows(workOrders, tickets),
    [workOrders, tickets],
  );

  const dfrRows = useMemo(
    () =>
      dfrs
        .filter((r) => r.status !== "draft")
        .map((r) => ({
          id: r.id,
          code: r.code,
          activity: r.activityName,
          block: r.blockCode,
          planned: r.plannedQty,
          actual: r.actualQty,
          unit: r.unit,
          variancePct: r.variancePct,
          status: r.status,
        }))
        .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct)),
    [dfrs],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title="Variance Analysis"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance", href: CROPFORT_ROUTES.progress },
          { label: "Variance Analysis" },
        ]}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.budget}>Cost Management</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cropfort/performance/kpis">KPIs</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Baseline / Plan" value={fmtEtb(snap.planEtb)} />
        <StatCard label="Committed" value={fmtEtb(snap.committedEtb)} footnote="AFE approved" />
        <StatCard label="Actual" value={fmtEtb(snap.actualEtb)} emphasis footnote="WO progress" />
        <StatCard label="Forecast" value={fmtEtb(snap.forecastEtb)} />
        <StatCard
          label="Variance"
          value={`${snap.variancePct > 0 ? "+" : ""}${snap.variancePct}%`}
          intent={Math.abs(snap.variancePct) > 15 ? "negative" : "positive"}
          footnote={fmtEtb(snap.varianceEtb)}
        />
      </div>

      <SectionCard title="Waterfall" flush>
        <ul className="divide-y divide-border text-sm">
          {[
            { label: "Plan (baseline)", value: snap.planEtb },
            { label: "− Committed (AFE)", value: -snap.committedEtb },
            { label: "Remaining authorization", value: snap.planEtb - snap.committedEtb },
            { label: "Actual (WO %)", value: snap.actualEtb },
            { label: "Forecast EOY", value: snap.forecastEtb },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between px-5 py-3">
              <span>{row.label}</span>
              <span className="tabular-nums font-medium">{fmtEtb(row.value)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="By activity (work orders)" flush>
        {activityRows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No work-order actuals yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Plan</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{row.meta}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(row.planned)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(row.committed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(row.actual)}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      status={Math.abs(row.variancePct) > 15 ? "at_risk" : "on_track"}
                      label={`${row.variancePct > 0 ? "+" : ""}${row.variancePct}%`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard title="Plan categories" flush>
        {categories.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No programme plan categories.{" "}
            <Link href={CROPFORT_ROUTES.coreOperations} className="underline underline-offset-2">
              Open Programme
            </Link>
            .
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Plan ETB</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.category}>
                  <TableCell className="font-medium">{c.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(c.etb)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {snap.planEtb > 0 ? `${Math.round((c.etb / snap.planEtb) * 100)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard title="DFR quantity variance" flush>
        {dfrRows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No submitted daily field records.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Var %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dfrRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.code}</p>
                    <p className="text-xs text-muted-foreground">{r.block}</p>
                  </TableCell>
                  <TableCell>{r.activity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.planned} {r.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.actual} {r.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      status={Math.abs(r.variancePct) > 10 ? "at_risk" : "on_track"}
                      label={`${r.variancePct > 0 ? "+" : ""}${r.variancePct}%`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </PageContainer>
  );
}
