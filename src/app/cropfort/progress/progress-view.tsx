"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  activityVarianceRows,
  computePerformanceSnapshot,
  fmtEtb,
} from "@/lib/cropfort/performance-metrics";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function ProgressView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("progress");
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

  const waiting = {
    vendor: tickets.filter((t) => ticketWaitingOn(t.status) === "vendor").length,
    site: tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
    asset: tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length,
  };

  const byBlock = useMemo(() => {
    const names = new Set<string>();
    for (const w of workOrders) if (w.block && w.block !== "—") names.add(w.block);
    for (const t of tickets) if (t.block && t.block !== "—") names.add(t.block);

    return [...names]
      .map((name) => {
        const tix = tickets.filter((t) => t.block === name);
        const wos = workOrders.filter((w) => w.block === name);
        const avg = tix.length
          ? Math.round((tix.filter((t) => t.status === "validated").length / tix.length) * 100)
          : wos.length
            ? Math.round(wos.reduce((s, w) => s + w.progress, 0) / wos.length)
            : 0;
        const spend = tix.reduce((s, t) => s + t.amountEtb, 0);
        const planned = wos.reduce((s, w) => s + w.etb, 0);
        const vendorQ = tix.filter((t) => ticketWaitingOn(t.status) === "vendor").length;
        const siteQ = tix.filter((t) => ticketWaitingOn(t.status) === "site_owner").length;
        const assetQ = tix.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length;
        const hold = [
          vendorQ ? `${vendorQ} vendor` : null,
          siteQ ? `${siteQ} site` : null,
          assetQ ? `${assetQ} asset` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const stuck = tix.find((t) => t.status === "returned")
          ? "overdue"
          : avg >= 90
            ? "complete"
            : avg >= 50
              ? "on_track"
              : "at_risk";
        return { id: name, name, tix, wos, avg, spend, planned, status: stuck, hold };
      })
      .filter((row) => row.wos.length > 0 || row.tix.length > 0)
      .sort((a, b) => a.avg - b.avg);
  }, [workOrders, tickets]);

  const byActivity = useMemo(
    () => activityVarianceRows(workOrders, tickets).slice(0, 8),
    [workOrders, tickets],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance" },
          { label: area.label },
        ]}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cropfort/performance/programme">Programme</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.fieldTickets}>Open tickets</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Vendor queue" value={String(waiting.vendor)} footnote="Assigned / in field" />
        <StatCard
          label="Site owner queue"
          value={String(waiting.site)}
          emphasis
          footnote="Checks submitted work"
        />
        <StatCard label="Asset owner queue" value={String(waiting.asset)} footnote="Closes the ticket" />
        <StatCard
          label="Closed tickets"
          value={`${snap.ticketsClosed} / ${tickets.length || 0}`}
          footnote={`${snap.woProgressAvg}% avg WO progress`}
        />
      </div>

      <SectionCard title="By block" flush>
        {byBlock.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No tickets yet. Assign a task from Field Execution.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {byBlock.map((row) => (
              <li key={row.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.tix.length} tickets · {fmtEtb(row.spend)} of {fmtEtb(row.planned)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="cf-numeric text-sm font-semibold">{row.avg}%</span>
                    <StatusBadge status={row.status} />
                  </div>
                </div>
                <Progress value={row.avg} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {row.hold
                    ? `Waiting on ${row.hold}`
                    : row.tix.length
                      ? "All tickets closed"
                      : "No tickets yet"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="By activity" flush>
        {byActivity.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No work orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Plan</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byActivity.map((row) => {
                const pct =
                  row.planned > 0 ? Math.min(100, Math.round((row.actual / row.planned) * 100)) : 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.meta}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtEtb(row.planned)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtEtb(row.actual)}</TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm font-medium">{pct}%</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </PageContainer>
  );
}
