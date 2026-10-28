"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarRange, CheckCircle2, ClipboardCheck, FileText, Plus, RotateCcw, Send, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { useDeskCounts } from "@/lib/cropfort/use-desk-counts";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warn" | "info";

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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
  const { user, activeProgram } = useCropfortAuth();
  const c = useDeskCounts();

  const tiles: { label: string; value: number; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Plans to finish", value: c.draftPlans.length, href: CROPFORT_ROUTES.programmePlans, icon: FileText, tone: "primary" },
    { label: "Returned to fix", value: c.returnedPlans.length, href: CROPFORT_ROUTES.programmePlans, icon: RotateCcw, tone: "warn" },
    { label: "Waiting approval", value: c.waitingPlans.length, href: CROPFORT_ROUTES.programmePlans, icon: ClipboardCheck, tone: "info" },
    { label: "Months to activate", value: c.monthsToActivate.length, href: CROPFORT_ROUTES.monthlyWorkOrders, icon: CalendarRange, tone: "primary" },
    { label: "Work to review", value: c.workToReview.length, href: `${CROPFORT_ROUTES.workOrders}?view=review`, icon: Wrench, tone: "warn" },
  ];

  // The few things to do now, most urgent first
  const todo: { id: string; title: string; meta: string; href: string; action: string; icon: LucideIcon }[] = [
    ...c.returnedPlans.map((p) => ({
      id: `ret-${p.id}`,
      title: p.name || "Returned plan",
      meta: "Returned by the asset owner — fix and resubmit",
      href: `${CROPFORT_ROUTES.programmePlans}/${p.id}`,
      action: "Fix",
      icon: RotateCcw,
    })),
    ...(c.workToReview.length
      ? [
          {
            id: "review",
            title: `${c.workToReview.length} work order${c.workToReview.length === 1 ? "" : "s"} sent for review`,
            meta: "The vendor marked the work done — check and approve",
            href: `${CROPFORT_ROUTES.workOrders}?view=review`,
            action: "Review",
            icon: Wrench,
          },
        ]
      : []),
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
          },
        ]
      : []),
    ...c.draftPlans.map((p) => ({
      id: `draft-${p.id}`,
      title: p.name || "Draft plan",
      meta: "Finish the activities and schedule, then submit",
      href: `${CROPFORT_ROUTES.programmePlans}/${p.id}`,
      action: "Continue",
      icon: FileText,
    })),
  ].slice(0, 6);

  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting(new Date())}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{activeProgram?.name || "Workspace"}</p>
        </div>
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="border-b border-border/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent px-5 py-3.5 text-[15px] font-semibold">
          Do next
        </h2>
        {c.loading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : todo.length === 0 ? (
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
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                </span>
                <Button size="sm" asChild>
                  <Link href={item.href}>{item.action}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
