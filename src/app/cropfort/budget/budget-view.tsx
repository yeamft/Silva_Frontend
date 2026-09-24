"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  PageMetaStrip,
  SectionCard,
  StatCard,
} from "@/components/cropfort/page-shell";
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
import {
  categoryBudget,
  fmtEtb,
  includedActivities,
} from "@/lib/cropfort/planning-helpers";
import {
  activityVarianceRows,
  computePerformanceSnapshot,
} from "@/lib/cropfort/performance-metrics";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { useDailyFieldRecordStore } from "@/store/dailyFieldRecordStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";

function varLabel(pct: number) {
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export default function BudgetForecastView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const afes = useCropfortOpsStore((s) => s.afes);
  const workOrders = useCropfortOpsStore((s) => s.workOrders);
  const tickets = useCropfortOpsStore((s) => s.tickets);
  const projects = useCropfortOpsStore((s) => s.projects);
  const interventions = useCropfortOpsStore((s) => s.interventions);
  const dfrs = useDailyFieldRecordStore((s) => s.records);
  const weekly = useWeeklyPlanStore((s) => s.plans);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const acts = useMemo(() => includedActivities(plan), [plan]);
  const categories = useMemo(() => categoryBudget(acts), [acts]);
  const completion = planCompletion();

  const committed = useMemo(
    () =>
      afes
        .filter((a) => a.status === "approved" || a.status === "issued")
        .reduce((s, a) => s + (a.amountEtb || 0), 0),
    [afes],
  );

  const snap = useMemo(
    () =>
      computePerformanceSnapshot({
        plan,
        planBudgetEtb: completion.budgetEtb,
        committedEtb: committed,
        workOrders,
        tickets,
        dfrs,
        weekly,
      }),
    [plan, completion.budgetEtb, committed, workOrders, tickets, dfrs, weekly],
  );

  const activityRows = useMemo(
    () => activityVarianceRows(workOrders, tickets),
    [workOrders, tickets],
  );

  /** Map plan category → actual from WO activity labels (best-effort). */
  const categoryActual = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of activityRows) {
      const cat =
        acts.find(
          (a) =>
            a.activityName === row.label ||
            a.category === row.label ||
            row.label.toLowerCase().includes(a.category.toLowerCase()),
        )?.category ?? row.label;
      map.set(cat, (map.get(cat) ?? 0) + row.actual);
    }
    return map;
  }, [activityRows, acts]);

  const budgetVsActualCategories = useMemo(() => {
    const rows = categories.map((c) => {
      const actual = Math.round(categoryActual.get(c.category) ?? 0);
      const variance = actual - c.etb;
      const variancePct =
        c.etb > 0 ? Math.round((variance / c.etb) * 1000) / 10 : actual > 0 ? 100 : 0;
      return {
        label: c.category,
        plan: c.etb,
        actual,
        variance,
        variancePct,
        count: c.count,
      };
    });
    // Include WO-only categories not in plan
    for (const [cat, actual] of categoryActual) {
      if (rows.some((r) => r.label === cat)) continue;
      rows.push({
        label: cat,
        plan: 0,
        actual: Math.round(actual),
        variance: Math.round(actual),
        variancePct: 100,
        count: 0,
      });
    }
    return rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [categories, categoryActual]);

  const projectPipeline = useMemo(() => {
    const open = projects.filter((p) => p.status !== "complete" && p.status !== "returned");
    return {
      count: open.length,
      budget: open.reduce((s, p) => s + p.budgetEtb, 0),
    };
  }, [projects]);

  const interventionPipeline = useMemo(() => {
    const open = interventions.filter(
      (i) => i.status !== "complete" && i.status !== "returned",
    );
    return {
      count: open.length,
      cost: open.reduce((s, i) => s + i.costEtb, 0),
    };
  }, [interventions]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Cost Management"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Cost Management" },
        ]}
        meta={
          <PageMetaStrip
            items={[
              { value: fmtEtb(snap.planEtb), label: "Budget" },
              { value: fmtEtb(snap.actualEtb), label: "Actual" },
              {
                value: varLabel(snap.variancePct),
                label: "Variance",
              },
            ]}
          />
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cropfort/performance/variance">Variance</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={CROPFORT_ROUTES.coreOperations}>Programme plan</Link>
            </Button>
          </>
        }
      />

      {!plan && !loading ? (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            No programme plan yet.{" "}
            <Link href={CROPFORT_ROUTES.coreOperations} className="underline underline-offset-2">
              Open Programme
            </Link>
            .
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Budget (plan)" value={fmtEtb(snap.planEtb)} />
            <StatCard
              label="Committed"
              value={fmtEtb(snap.committedEtb)}
              footnote="AFE approved / issued"
            />
            <StatCard
              label="Actual"
              value={fmtEtb(snap.actualEtb)}
              emphasis
              footnote="WO progress"
            />
            <StatCard label="Forecast" value={fmtEtb(snap.forecastEtb)} />
            <StatCard
              label="Budget vs Actual"
              value={varLabel(snap.variancePct)}
              intent={Math.abs(snap.variancePct) > 15 ? "negative" : "positive"}
              footnote={fmtEtb(snap.varianceEtb)}
            />
          </div>

          <SectionCard title="Budget vs Actual">
            <div className="mb-3 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spend vs budget</span>
                <span className="tabular-nums">{snap.spendPct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${snap.spendPct}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">Remaining vs budget</p>
                <p className="font-semibold tabular-nums">
                  {fmtEtb(Math.max(0, snap.planEtb - snap.actualEtb))}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">Uncommitted headroom</p>
                <p className="font-semibold tabular-nums">
                  {fmtEtb(Math.max(0, snap.planEtb - snap.committedEtb))}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">Forecast vs budget</p>
                <p className="font-semibold tabular-nums">
                  {fmtEtb(snap.forecastEtb - snap.planEtb)}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="By category" flush>
            {budgetVsActualCategories.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No cost lines yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Var %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetVsActualCategories.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.plan)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.actual)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.variance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge
                          status={Math.abs(row.variancePct) > 15 ? "at_risk" : "on_track"}
                          label={varLabel(row.variancePct)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          <SectionCard title="By activity (work orders)" flush>
            {activityRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No work-order actuals yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Var %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.meta}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.planned)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.committed)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.actual)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge
                          status={Math.abs(row.variancePct) > 15 ? "at_risk" : "on_track"}
                          label={varLabel(row.variancePct)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Project pipeline" flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Open projects</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{projectPipeline.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEtb(projectPipeline.budget)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="border-t px-4 py-3">
                <Button size="sm" variant="outline" asChild>
                  <Link href={CROPFORT_ROUTES.projects}>Open projects</Link>
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Intervention pipeline" flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Open interventions</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{interventionPipeline.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEtb(interventionPipeline.cost)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="border-t px-4 py-3">
                <Button size="sm" variant="outline" asChild>
                  <Link href={CROPFORT_ROUTES.interventions}>Open interventions</Link>
                </Button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Plan activity lines" flush>
            {acts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No included activities.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acts.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell>
                        <p className="font-medium">{act.activityName}</p>
                        <p className="text-xs text-muted-foreground">{act.activityCode}</p>
                      </TableCell>
                      <TableCell>{act.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {act.plannedQty} {act.uom}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(act.agreedRate?.unitRateEtb)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(act.plannedCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}
