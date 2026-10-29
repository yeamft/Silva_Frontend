"use client";

import { SHOW_SPEND_BANDS } from "@/config/features";
import { FarmAreaLabel } from "@/components/cropfort/farm-area-label";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarRange, CheckCircle2, ClipboardCheck, FileText, Leaf, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { fmtEtb } from "@/lib/cropfort/planning-helpers";
import { useOwnerCounts } from "@/lib/cropfort/use-owner-counts";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warn" | "info";

const reviewHref = (kind: string, id: string) =>
  `${CROPFORT_ROUTES.approvals}/review/${kind}/${encodeURIComponent(id)}`;

const TONE: Record<Tone, { tile: string; number: string; icon: string }> = {
  primary: { tile: "border-primary/30 bg-primary/[0.05]", number: "text-foreground", icon: "bg-primary/10 text-primary" },
  warn: { tile: "border-amber-500/40 bg-amber-500/[0.07]", number: "text-amber-700 dark:text-amber-400", icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  info: { tile: "border-sky-500/30 bg-sky-500/[0.05]", number: "text-sky-700 dark:text-sky-300", icon: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
};

/**
 * Asset owner home: one screen. Five tiles say what's waiting for a decision;
 * "Review next" lists the submissions themselves, each with the button that opens it.
 */
export function SilvaDeskHome() {
  const c = useOwnerCounts();

  const tiles: { label: string; value: number; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Plans to approve", value: c.plans.length, href: CROPFORT_ROUTES.approvals, icon: ClipboardCheck, tone: "primary" },
    { label: "Monthly orders", value: c.monthly.length, href: CROPFORT_ROUTES.approvals, icon: CalendarRange, tone: "primary" },
    { label: "Spending requests", value: c.afes.length, href: CROPFORT_ROUTES.approvals, icon: WalletCards, tone: "warn" },
    { label: "Farm assessments", value: c.assessments.length, href: CROPFORT_ROUTES.farmAssessments, icon: Leaf, tone: "info" },
    { label: "Reports", value: c.reports.length, href: CROPFORT_ROUTES.approvals, icon: FileText, tone: "info" },
  ];

  const decisions: { id: string; type: string; title: string; meta: string; detail?: string; href: string; icon: LucideIcon }[] = [
    ...c.plans.map((p) => ({
      id: `afp-${p.id}`,
      type: "Plan",
      title: p.name || (p.farmName ? `${p.farmName} plan` : "Core Operations plan"),
      meta: [p.farmName, p.budgetYearLabel].filter(Boolean).join(" · "),
      detail: p.plannedCostEtb ? fmtEtb(p.plannedCostEtb) : undefined,
      href: reviewHref("afp", p.id),
      icon: ClipboardCheck,
    })),
    ...c.monthly.map((m) => ({
      id: `mwo-${m.id}`,
      type: "Monthly order",
      title: `${PLAN_MONTH_LABELS[m.ethiopianMonth as keyof typeof PLAN_MONTH_LABELS] || m.ethiopianMonth} ${m.yearGc}`,
      meta: [m.code, m.farmName].filter(Boolean).join(" · "),
      detail: m.totalEtb ? fmtEtb(m.totalEtb) : undefined,
      href: reviewHref("monthly", m.id),
      icon: CalendarRange,
    })),
    ...c.afes.map((a) => ({
      id: `afe-${a.id}`,
      type: "Spending request",
      title: a.title,
      meta: SHOW_SPEND_BANDS ? `Band ${a.band}` : a.sourceType || "Spending request",
      detail: fmtEtb(a.amountEtb),
      href: reviewHref("afe", a.id),
      icon: WalletCards,
    })),
    ...c.assessments.map((a) => ({
      id: `fa-${a.id}`,
      type: "Farm assessment",
      title: a.title || "Farm assessment",
      meta: [a.farmName, a.cycleLabel].filter(Boolean).join(" · "),
      href: `${CROPFORT_ROUTES.farmAssessments}/${a.id}`,
      icon: Leaf,
    })),
    ...c.reports.map((r) => ({
      id: `report-${r.id}`,
      type: "Report",
      title: r.title || r.code,
      meta: [r.code, r.periodLabel].filter(Boolean).join(" · "),
      href: reviewHref("reports", r.id),
      icon: FileText,
    })),
  ];
  const shown = decisions.slice(0, 6);


  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <FarmAreaLabel size="lg" />
        <Button asChild>
          <Link href={CROPFORT_ROUTES.approvals}>
            <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
            Approvals
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
          <h2 className="text-sm font-semibold">Review next</h2>
          {decisions.length > shown.length ? (
            <Link href={CROPFORT_ROUTES.approvals} className="text-xs font-medium text-primary hover:underline">
              All {decisions.length}
            </Link>
          ) : null}
        </div>
        {c.loading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">{c.error ? "Couldn't load your reviews" : "You're all caught up"}</p>
            <p className="text-xs text-muted-foreground">
              {c.error ? "Please try again shortly." : "New submissions will appear here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
                  <row.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[row.type, row.meta].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {row.detail ? (
                  <span className="cf-numeric hidden shrink-0 text-sm font-semibold tabular-nums sm:block">{row.detail}</span>
                ) : null}
                <Button size="sm" asChild>
                  <Link href={row.href}>Review</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
