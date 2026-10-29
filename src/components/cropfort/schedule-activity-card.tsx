"use client";

import { motion } from "framer-motion";
import { CalendarCheck2, CalendarDays, ChevronRight, Copy, Eraser, Scale } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PLAN_MONTH_LABELS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";
import { scheduledMonths, sharesTotal } from "@/lib/cropfort/month-shares";
import { cn } from "@/lib/utils";
import { fmtEtb } from "@/store/cropfortOpsStore";
import type { CoreOpsActivity } from "@/types/core-ops";

function fmtQty(n: number) {
  return n >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10);
}

/**
 * One activity on the Schedule step: tap the months it runs, then say what share of the
 * year's quantity falls in each month. The bar fills to 100%.
 */
export function ScheduleActivityCard({
  act,
  months,
  yearOf,
  canEdit,
  selected,
  focused,
  onSelect,
  onToggleMonth,
  onShare,
  onSetMonths,
  onSplitEvenly,
  onCopyToAll,
  bare = false,
}: {
  act: CoreOpsActivity;
  /** Months this plan covers, in order. */
  months: readonly PlanMonth[];
  yearOf: (m: PlanMonth) => number;
  canEdit: boolean;
  selected: boolean;
  focused: boolean;
  onSelect: (on: boolean) => void;
  onToggleMonth: (m: PlanMonth) => void;
  onShare: (m: PlanMonth, percent: number) => void;
  onSetMonths: (months: PlanMonth[]) => void;
  onSplitEvenly: () => void;
  onCopyToAll: () => void;
  /** Inside a modal: no card border and no select box. */
  bare?: boolean;
}) {
  const picked = scheduledMonths(act.intensities);
  const total = sharesTotal(act);
  const ok = picked.length > 0 && Math.abs(total - 100) <= 0.01;
  const over = total > 100.01;
  const left = Math.round((100 - total) * 100) / 100;

  return (
    <div
      className={cn(
        !bare && "rounded-xl border bg-card p-3 transition-colors sm:p-4",
        !bare && (ok ? "border-primary/40" : picked.length ? "border-amber-500/40" : "border-border"),
        !bare && selected && "bg-accent/30",
        !bare && focused && "ring-2 ring-primary/40",
      )}
    >
      {/* Activity + status */}
      <div className="flex items-start gap-3">
        {canEdit && !bare ? (
          <Checkbox
            className="mt-1"
            checked={selected}
            aria-label={`Select ${act.activityName}`}
            onCheckedChange={(v) => onSelect(Boolean(v))}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{act.activityName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtQty(act.plannedQty)} {act.uom} this year · {fmtEtb(act.plannedCost)}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
            ok
              ? "bg-primary/10 text-primary"
              : picked.length
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {picked.length ? `${total}% of 100%` : "No months yet"}
        </span>
      </div>

      {/* Progress to 100% */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <motion.div
          className={cn("h-full rounded-full", ok ? "bg-primary" : over ? "bg-destructive" : "bg-amber-500")}
          initial={false}
          animate={{ width: `${Math.min(100, total)}%` }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Months */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-4 sm:grid-cols-6 xl:grid-cols-12">
        {months.map((m) => {
          const on = act.intensities[m] !== "none";
          const pct = act.monthShares?.[m] ?? 0;
          return (
            <div
              key={m}
              className={cn(
                "flex flex-col items-center rounded-lg border px-1 pb-1.5 pt-1 transition-colors",
                on ? "border-primary/50 bg-primary/[0.06]" : "border-dashed border-border",
              )}
            >
              <button
                type="button"
                disabled={!canEdit}
                aria-pressed={on}
                aria-label={`${on ? "Remove" : "Add"} ${PLAN_MONTH_LABELS[m]} for ${act.activityName}`}
                onClick={() => onToggleMonth(m)}
                className={cn(
                  "cf-focus w-full rounded-md py-1 text-xs font-semibold transition-colors disabled:cursor-default",
                  on ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {PLAN_MONTH_LABELS[m]}
                <span className="block text-[10px] font-normal opacity-70">{yearOf(m)}</span>
              </button>
              {on ? (
                <>
                  <label className="mt-1 flex h-7 w-full max-w-[4.5rem] items-center rounded-md border border-border bg-background focus-within:border-primary">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      value={pct || ""}
                      placeholder="0"
                      disabled={!canEdit}
                      aria-label={`${act.activityName} ${PLAN_MONTH_LABELS[m]} percent`}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onShare(m, Number(e.target.value) || 0)}
                      className="h-full w-full min-w-0 bg-transparent pl-1.5 text-right text-xs font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="pr-1.5 text-[11px] text-muted-foreground">%</span>
                  </label>
                  <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {fmtQty((act.plannedQty * pct) / 100)} {act.uom}
                  </span>
                </>
              ) : (
                <span className="mt-1 text-[10px] text-muted-foreground/40">—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hints + quick actions */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className={cn("mr-auto", ok ? "text-primary" : "text-muted-foreground")}>
          {!picked.length
            ? "Pick the months."
            : ok
              ? "Ready — adds up to 100%."
              : over
                ? `${Math.abs(left)}% too much — lower a month.`
                : `${left}% left to place.`}
        </span>
        {canEdit ? (
          <>
            <QuickAction icon={CalendarCheck2} label="Every month" onClick={() => onSetMonths([...months])} />
            {picked.length && !ok ? <QuickAction icon={Scale} label="Split evenly" onClick={onSplitEvenly} /> : null}
            {picked.length ? <QuickAction icon={Eraser} label="Clear" onClick={() => onSetMonths([])} /> : null}
            {ok ? <QuickAction icon={Copy} label="Copy to all" onClick={onCopyToAll} /> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Compact line for the Schedule list: months chosen and the % total. Click to open the calendar. */
export function ScheduleActivityRow({
  act,
  canEdit,
  selected,
  focused,
  onSelect,
  onOpen,
}: {
  act: CoreOpsActivity;
  canEdit: boolean;
  selected: boolean;
  focused: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
}) {
  const picked = scheduledMonths(act.intensities);
  const total = sharesTotal(act);
  const ok = picked.length > 0 && Math.abs(total - 100) <= 0.01;
  return (
    <li
      id={`sched-${act.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/40",
        ok ? "border-primary/30" : picked.length ? "border-amber-500/40" : "border-border",
        selected && "bg-accent/30",
        focused && "ring-2 ring-primary/40",
      )}
    >
      {canEdit ? (
        <Checkbox checked={selected} aria-label={`Select ${act.activityName}`} onCheckedChange={(v) => onSelect(Boolean(v))} />
      ) : null}
      <button type="button" onClick={onOpen} className="cf-focus flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            ok ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{act.activityName}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {picked.length
              ? picked.map((m) => `${PLAN_MONTH_LABELS[m]} ${act.monthShares?.[m] ?? 0}%`).join(" · ")
              : "No months yet — tap to plan"}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
            ok
              ? "bg-primary/10 text-primary"
              : picked.length
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {picked.length ? `${total}%` : "—"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cf-focus inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-primary transition-colors hover:bg-primary/10"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
