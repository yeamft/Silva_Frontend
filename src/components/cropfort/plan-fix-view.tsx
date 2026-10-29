"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareWarning, RotateCcw, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { submitProgrammePlan, upsertProgrammePlan, type ProgrammePlanDto } from "@/lib/api/programme-plans";
import { scheduledMonths } from "@/lib/cropfort/month-shares";
import { PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { useProgrammePlan } from "@/lib/query/hooks/use-programme-plans";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { fmtEtb } from "@/store/cropfortOpsStore";
import type { CoreOpsActivity } from "@/types/core-ops";

const costOf = (a: CoreOpsActivity, qty: number) => Math.round(qty * (a.agreedRate?.unitRateEtb ?? 0) * 100) / 100;

/**
 * SPX: fix a plan the asset owner returned without opening the whole planner. Shows the owner's
 * comment, the activities they asked to remove, and lets quantities be adjusted before resubmitting.
 */
export default function PlanFixView({ planId }: { planId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useProgrammePlan(planId);
  const plan = query.data;
  const [removed, setRemoved] = useState<Set<string> | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  // Start with everything the owner flagged marked for removal
  useEffect(() => {
    if (plan && !removed) setRemoved(new Set(plan.returnedLineIds ?? []));
  }, [plan, removed]);

  const included = useMemo(
    () => (plan ? plan.activityIds.map((id) => plan.activities[id]).filter((a): a is CoreOpsActivity => Boolean(a?.included)) : []),
    [plan],
  );

  if (!plan || !removed) {
    return (
      <PageContainer className="cf-page-centered">
        <p className="py-10 text-center text-sm text-muted-foreground">
          {query.isError ? (query.error instanceof Error ? query.error.message : "Couldn't load the plan") : "Loading…"}
        </p>
      </PageContainer>
    );
  }

  const flaggedIds = new Set(plan.returnedLineIds ?? []);
  const flagged = included.filter((a) => flaggedIds.has(a.id));
  const others = included.filter((a) => !flaggedIds.has(a.id));
  const qtyOf = (a: CoreOpsActivity) => qty[a.id] ?? a.plannedQty;
  const kept = included.filter((a) => !removed.has(a.id));
  const total = kept.reduce((s, a) => s + costOf(a, qtyOf(a)), 0);
  const before = included.reduce((s, a) => s + (a.plannedCost || 0), 0);
  const returned = plan.statusRaw === "returned";
  const changed = removed.size > 0 || Object.keys(qty).length > 0;

  const toggle = (id: string) =>
    setRemoved((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** The plan with the fixes applied: removed activities leave the plan, quantities updated. */
  const fixedPlan = (): ProgrammePlanDto => ({
    ...plan,
    activities: Object.fromEntries(
      Object.entries(plan.activities).map(([id, a]) => {
        if (removed.has(id)) return [id, { ...a, included: false, plannedCost: 0 }];
        if (qty[id] != null) return [id, { ...a, plannedQty: qty[id], plannedCost: costOf(a, qty[id]) }];
        return [id, a];
      }),
    ),
  });

  const finish = async (resubmit: boolean) => {
    setBusy(true);
    try {
      if (resubmit) await submitProgrammePlan(plan.id, fixedPlan());
      else await upsertProgrammePlan(plan.id, fixedPlan(), "draft");
      void qc.invalidateQueries({ queryKey: queryKeys.programmePlans.all });
      toast.success(resubmit ? "Fixed and sent back to the asset owner" : "Changes saved");
      router.push(CROPFORT_ROUTES.programmePlans);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the fix");
      setBusy(false);
    }
  };

  const row = (a: CoreOpsActivity, owner: boolean) => {
    const out = removed.has(a.id);
    const months = scheduledMonths(a.intensities);
    return (
      <li
        key={a.id}
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5",
          out ? "border-dashed border-border bg-muted/30" : owner ? "border-amber-500/40 bg-amber-500/[0.05]" : "border-border",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", out && "text-muted-foreground line-through")}>{a.activityName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {a.activityCode} · {months.length ? months.map((m) => PLAN_MONTH_LABELS[m]).join(", ") : "No months"}
          </p>
        </div>
        {!out ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Input
              type="number"
              min={0}
              value={qtyOf(a) || ""}
              disabled={!returned}
              aria-label={`Quantity for ${a.activityName}`}
              onChange={(e) => setQty((q) => ({ ...q, [a.id]: Math.max(0, Number(e.target.value) || 0) }))}
              className="h-8 w-20 text-right tabular-nums"
            />
            {a.uom}
          </label>
        ) : null}
        <span className={cn("w-28 text-right text-sm font-semibold tabular-nums", out && "text-muted-foreground line-through")}>
          {fmtEtb(costOf(a, qtyOf(a)))}
        </span>
        {returned ? (
          <Button size="sm" variant={out ? "outline" : "ghost"} className="h-8" onClick={() => toggle(a.id)}>
            {out ? (
              <>
                <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                Keep
              </>
            ) : (
              <>
                <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                Remove
              </>
            )}
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <PageContainer className="cf-page-centered">
      <PageHeader
        title={`Fix · ${plan.name || "Plan"}`}
        breadcrumbs={[{ label: "Plans", href: CROPFORT_ROUTES.programmePlans }, { label: "Fix" }]}
        meta={<span>{[plan.farmName, plan.budgetYearLabel].filter(Boolean).join(" · ")}</span>}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={CROPFORT_ROUTES.programmePlans}>
              <X className="mr-1 h-4 w-4" aria-hidden />
              Exit
            </Link>
          </Button>
        }
      />

      {!returned ? (
        <SectionCard>
          <p className="text-sm text-muted-foreground">This plan isn&apos;t waiting for a fix.</p>
        </SectionCard>
      ) : null}

      {plan.returnedComment ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Asset owner&apos;s comment</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{plan.returnedComment}</p>
          </div>
        </div>
      ) : null}

      {flagged.length ? (
        <SectionCard title={`Asked to remove (${flagged.length})`}>
          <ul className="space-y-2">{flagged.map((a) => row(a, true))}</ul>
        </SectionCard>
      ) : null}

      <SectionCard title={flagged.length ? `Other activities (${others.length})` : `Activities (${others.length})`}>
        <ul className="space-y-2">{others.map((a) => row(a, false))}</ul>
      </SectionCard>

      {returned ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Plan total</p>
            <p className="text-lg font-semibold tabular-nums">
              {fmtEtb(total)}
              {Math.round(total) !== Math.round(before) ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{fmtEtb(before)}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="ghost" asChild>
              <Link href={`${CROPFORT_ROUTES.programmePlans}/${plan.id}`}>Open full planner</Link>
            </Button>
            <Button variant="outline" disabled={busy || !changed} onClick={() => void finish(false)}>
              Save
            </Button>
            <Button disabled={busy || kept.length === 0} onClick={() => void finish(true)}>
              <Send className="mr-1.5 h-4 w-4" aria-hidden />
              {busy ? "Sending…" : "Resubmit"}
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
