"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  PLAN_MONTHS,
  PLAN_MONTH_LABELS,
  fmtEtb,
  includedActivities,
  intensityClass,
  intensityLetter,
} from "@/lib/cropfort/planning-helpers";
import { cn } from "@/lib/utils";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function TimelineView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const acts = useMemo(() => includedActivities(plan), [plan]);
  const completion = planCompletion();

  const loadRow = useMemo(() => {
    const counts = PLAN_MONTHS.map((m) => {
      let peak = 0;
      let active = 0;
      let light = 0;
      for (const act of acts) {
        const i = act.intensities[m];
        if (i === "peak") peak += 1;
        else if (i === "active") active += 1;
        else if (i === "light") light += 1;
      }
      return { m, peak, active, light, total: peak + active + light };
    });
    return counts;
  }, [acts]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Timeline"
        description={plan ? `${plan.name || "Core Operations plan"}${plan.farmName ? ` · ${plan.farmName}` : ""} — when each activity runs through the year` : "When each planned activity runs through the year"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Timeline" },
        ]}
        meta={
          plan ? (
            <>
              <StatusBadge status={plan.status} />
              <span className="text-xs text-muted-foreground">{plan.budgetYearLabel}</span>
              <span className="text-xs tabular-nums">
                {completion.scheduledCount}/{completion.includedCount} scheduled ·{" "}
                {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
        actions={
          plan ? (
            <Button size="sm" asChild>
              <Link href={`${CROPFORT_ROUTES.programmePlans}/${plan.id}`}>Edit schedule</Link>
            </Button>
          ) : null
        }
      />

      <SectionCard title="Schedule">
        {loading && !plan ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !plan ? (
          <p className="text-sm text-muted-foreground">
            No Core Operations plan selected yet.{" "}
            <Link href={CROPFORT_ROUTES.programmePlans} className="text-primary underline-offset-2 hover:underline">
              Open your plans
            </Link>
          </p>
        ) : acts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This plan has no activities included yet.{" "}
            <Link href={`${CROPFORT_ROUTES.programmePlans}/${plan.id}`} className="text-primary underline-offset-2 hover:underline">
              Add activities
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="cf-table w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-card px-2 py-2 font-medium">Activity</th>
                  {PLAN_MONTHS.map((m) => (
                    <th key={m} className="px-1 py-2 text-center font-medium">
                      {PLAN_MONTH_LABELS[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acts.map((act) => (
                  <tr key={act.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                      <p className="font-medium leading-tight">{act.activityName}</p>
                      <p className="text-[11px] text-muted-foreground">{act.activityCode}</p>
                    </td>
                    {PLAN_MONTHS.map((m) => (
                      <td key={m} className="px-1 py-1 text-center">
                        {/* Read-only overview — the schedule is edited (and saved) in the plan editor */}
                        <span
                          title={`${PLAN_MONTH_LABELS[m]} · ${act.intensities[m] === "none" ? "not running" : act.intensities[m]}`}
                          className={cn(
                            "mx-auto flex h-8 w-8 items-center justify-center rounded text-xs font-semibold",
                            intensityClass(act.intensities[m]),
                          )}
                        >
                          {intensityLetter(act.intensities[m])}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td className="sticky left-0 z-10 bg-muted/30 px-2 py-2 text-xs font-medium">
                    Activities running
                  </td>
                  {loadRow.map(({ m, total, peak }) => (
                    <td key={m} className="px-1 py-2 text-center text-xs tabular-nums">
                      <span className={peak > 0 ? "font-semibold text-primary" : ""}>
                        {total || "·"}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {(["peak", "active", "light"] as const).map((level) => (
                <span key={level} className="inline-flex items-center gap-1.5">
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold", intensityClass(level))}>
                    {intensityLetter(level)}
                  </span>
                  {level === "peak" ? "Peak" : level === "active" ? "Active" : "Light"}
                </span>
              ))}
              <span>· Change the schedule in the plan editor&apos;s Schedule step.</span>
            </div>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
