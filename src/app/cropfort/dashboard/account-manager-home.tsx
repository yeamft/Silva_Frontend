"use client";

import { FarmAreaLabel } from "@/components/cropfort/farm-area-label";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarRange, CheckCircle2, ClipboardCheck, FileText, Plus, RotateCcw, Send, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { useDeskCounts } from "@/lib/cropfort/use-desk-counts";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warn" | "info";

const TONE: Record<Tone, { tile: string; number: string; icon: string }> = {
  primary: { tile: "border-primary/30 bg-primary/[0.05]", number: "text-foreground", icon: "bg-primary/10 text-primary" },
  warn: { tile: "border-amber-500/40 bg-amber-500/[0.07]", number: "text-amber-700 dark:text-amber-400", icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  info: { tile: "border-sky-500/30 bg-sky-500/[0.05]", number: "text-sky-700 dark:text-sky-300", icon: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
};

/**
 * SPX Account Manager home: one screen. Five tiles say what's waiting; "Do next" lists the
 * few things to act on now, each with the button that does it.
 */
export function AccountManagerHome() {
  const c = useDeskCounts();

  const tiles: { label: string; value: number; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Plans to finish", value: c.draftPlans.length, href: CROPFORT_ROUTES.programmePlans, icon: FileText, tone: "primary" },
    { label: "Returned to fix", value: c.returnedPlans.length, href: `${CROPFORT_ROUTES.programmePlans}/returned`, icon: RotateCcw, tone: "warn" },
    { label: "Waiting approval", value: c.waitingPlans.length, href: CROPFORT_ROUTES.programmePlans, icon: ClipboardCheck, tone: "info" },
    { label: "Months to activate", value: c.monthsToActivate.length, href: CROPFORT_ROUTES.monthlyWorkOrders, icon: CalendarRange, tone: "primary" },
    { label: "Work to review", value: c.workToReview.length, href: `${CROPFORT_ROUTES.workOrders}?view=review`, icon: Wrench, tone: "warn" },
  ];

  // The few things to do now, most urgent first
  const todoAll: { id: string; title: string; meta: string; href: string; action: string; icon: LucideIcon; tone: Tone }[] = [
    ...c.returnedPlans.map((p) => ({
      id: `ret-${p.id}`,
      title: p.name || "Returned plan",
      meta: p.returnedComment ? `Asset owner: ${p.returnedComment}` : "Returned by the asset owner",
      href: `${CROPFORT_ROUTES.programmePlans}/${p.id}/fix`,
      action: "Fix",
      icon: RotateCcw,
      tone: "warn" as const,
    })),
    // Each work order the vendor reported opens its own review page
    ...c.workToReview.map((w) => ({
      id: `rev-${w.id}`,
      title: w.title,
      meta: [w.code, w.vendor, w.vendorOutcome === "partial" ? "Partly done" : "Done"].filter(Boolean).join(" · "),
      href: `${CROPFORT_ROUTES.workOrders}/${w.id}/review`,
      action: "Review",
      icon: Wrench,
      tone: "info" as const,
    })),
    ...(c.monthsToActivate.length
      ? [
          {
            id: "activate",
            title: `${c.monthsToActivate.length} month${c.monthsToActivate.length === 1 ? "" : "s"} ready to activate`,
            meta: c.monthsToActivate
              .slice(0, 3)
              .map((m) => `${PLAN_MONTH_LABELS[m.ethiopianMonth]} ${m.yearGc}`)
              .join(", "),
            href: CROPFORT_ROUTES.monthlyWorkOrders,
            action: "Activate",
            icon: Send,
            tone: "primary" as const,
          },
        ]
      : []),
    ...(c.workToIssue.length
      ? [
          {
            id: "issue",
            title: `${c.workToIssue.length} work order${c.workToIssue.length === 1 ? "" : "s"} not issued yet`,
            meta: "Send them to the vendor",
            href: CROPFORT_ROUTES.workOrders,
            action: "Issue",
            icon: Send,
            tone: "primary" as const,
          },
        ]
      : []),
    ...c.draftPlans.map((p) => ({
      id: `draft-${p.id}`,
      title: p.name || "Draft plan",
      meta: "Draft",
      href: `${CROPFORT_ROUTES.programmePlans}/${p.id}`,
      action: "Continue",
      icon: FileText,
      tone: "primary" as const,
    })),
  ];
  const todo = todoAll.slice(0, 6);


  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <FarmAreaLabel size="lg" />
        <Button asChild>
          <Link href={`${CROPFORT_ROUTES.programmePlans}/new`}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New plan
          </Link>
        </Button>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t, i) => {
          const busy = t.value > 0;
          const tone = TONE[t.tone];
          return (
            <motion.li
              key={t.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Link
                href={t.href}
                className={cn(
                  "group flex h-full flex-col gap-3 rounded-2xl border p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  busy ? tone.tile : "border-border bg-card",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", busy ? tone.icon : "bg-muted text-muted-foreground")}>
                    <t.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </span>
                <span>
                  <span className={cn("block text-3xl font-semibold tabular-nums", busy ? tone.number : "text-muted-foreground/50")}>
                    {c.loading ? "—" : t.value}
                  </span>
                  <span className="text-sm text-muted-foreground">{t.label}</span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>

      <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,20,0.05)]">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
          <h2 className="text-sm font-semibold">Do next</h2>
          {todoAll.length ? (
            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border">
              {todoAll.length}
            </span>
          ) : null}
        </div>
        {c.loading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : todoAll.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">Nothing is waiting on you right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {todo.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE[item.tone].icon)} aria-hidden>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    {item.action}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
