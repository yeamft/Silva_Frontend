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
  const cycleMonthIntensity = useCoreOpsPlanStore((s) => s.cycleMonthIntensity);
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
          <Button size="sm" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Open Programme calendar</Link>
          </Button>
        }
      />

      <SectionCard title="Programme schedule">
        {loading && !plan ? (
          <p className="text-sm text-muted-foreground">Loading plan…</p>
        ) : !plan ? (
          <p className="text-sm text-muted-foreground">
            No programme plan yet.{" "}
            <Link href={CROPFORT_ROUTES.coreOperations} className="underline underline-offset-2">
              Open Programme
            </Link>
            .
          </p>
        ) : acts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Include activities in Programme to see the schedule.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
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
                        <button
                          type="button"
                          title={`${PLAN_MONTH_LABELS[m]} · ${act.intensities[m]} (click to cycle)`}
                          className={cn(
                            "mx-auto flex h-8 w-8 items-center justify-center rounded text-xs font-semibold",
                            intensityClass(act.intensities[m]),
                          )}
                          onClick={() => cycleMonthIntensity(act.id, m)}
                        >
                          {intensityLetter(act.intensities[m])}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td className="sticky left-0 z-10 bg-muted/30 px-2 py-2 text-xs font-medium">
                    Active count
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
            <p className="mt-3 text-xs text-muted-foreground">
              P = Peak · A = Active · L = Light · click a cell to cycle intensity
            </p>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
