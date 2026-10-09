"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
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
  PLAN_MONTHS,
  PLAN_MONTH_LABELS,
  fmtEtb,
  includedActivities,
  manDaysByMonth,
} from "@/lib/cropfort/planning-helpers";
import { cn } from "@/lib/utils";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

type Tab = "labor" | "materials" | "services";

/** Demo crew capacity: man-days available per month. */
const CREW_MD_PER_MONTH = 120;

export default function ResourcesCapacityView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const [tab, setTab] = useState<Tab>("labor");

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const acts = useMemo(() => includedActivities(plan), [plan]);
  const laborActs = useMemo(
    () => acts.filter((a) => a.agreedRate?.costKind === "labor"),
    [acts],
  );
  const materialActs = useMemo(
    () => acts.filter((a) => a.agreedRate?.costKind === "materials"),
    [acts],
  );
  const serviceActs = useMemo(
    () => acts.filter((a) => a.agreedRate?.costKind === "services"),
    [acts],
  );
  const mdByMonth = useMemo(() => manDaysByMonth(acts), [acts]);
  const peakMonth = useMemo(() => {
    let max = 0;
    let month = PLAN_MONTHS[0];
    for (const m of PLAN_MONTHS) {
      if (mdByMonth[m] > max) {
        max = mdByMonth[m];
        month = m;
      }
    }
    return { month, md: max };
  }, [mdByMonth]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "labor", label: "Labor", count: laborActs.length },
    { id: "materials", label: "Materials", count: materialActs.length },
    { id: "services", label: "Equipment / services", count: serviceActs.length },
  ];

  const list =
    tab === "labor" ? laborActs : tab === "materials" ? materialActs : serviceActs;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Resources & Capacity"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Resources & Capacity" },
        ]}
        meta={
          plan ? (
            <>
              <span className="text-xs text-muted-foreground">{plan.farmName}</span>
              <span className="text-xs tabular-nums">
                Peak load {peakMonth.md} MD in {PLAN_MONTH_LABELS[peakMonth.month]}
              </span>
            </>
          ) : null
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Programme</Link>
          </Button>
        }
      />

      {!plan && !loading ? (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            No plan.{" "}
            <Link href={CROPFORT_ROUTES.coreOperations} className="underline underline-offset-2">
              Programme
            </Link>
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Labor (MD)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2">Month</th>
                    {PLAN_MONTHS.map((m) => (
                      <th key={m} className="px-1 py-2 text-center">
                        {PLAN_MONTH_LABELS[m]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-2 py-2 font-medium">Demand</td>
                    {PLAN_MONTHS.map((m) => {
                      const over = mdByMonth[m] > CREW_MD_PER_MONTH;
                      return (
                        <td
                          key={m}
                          className={cn(
                            "px-1 py-2 text-center tabular-nums",
                            over && "font-semibold text-destructive",
                          )}
                        >
                          {mdByMonth[m] || "·"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-t text-muted-foreground">
                    <td className="px-2 py-2">Crew capacity</td>
                    {PLAN_MONTHS.map((m) => (
                      <td key={m} className="px-1 py-2 text-center tabular-nums">
                        {CREW_MD_PER_MONTH}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="mb-3 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={tab === t.id ? "default" : "outline"}
                onClick={() => setTab(t.id)}
              >
                {t.label} ({t.count})
              </Button>
            ))}
          </div>

          <SectionCard title={tabs.find((t) => t.id === tab)?.label || "Resources"} flush>
            {list.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">None</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UoM</TableHead>
                    {tab === "labor" ? (
                      <TableHead className="text-right">Norm (MD)</TableHead>
                    ) : null}
                    <TableHead className="text-right">Unit rate</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell>
                        <p className="font-medium">{act.activityName}</p>
                        <p className="text-xs text-muted-foreground">{act.activityCode}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{act.plannedQty}</TableCell>
                      <TableCell>{act.uom}</TableCell>
                      {tab === "labor" ? (
                        <TableCell className="text-right tabular-nums">
                          {act.agreedRate?.normMdPerUnit ?? "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(act.agreedRate?.unitRateEtb)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(act.plannedCost)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={act.agreedRate ? "approved" : "at_risk"}
                          label={act.agreedRate ? "Rated" : "No rate"}
                        />
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
