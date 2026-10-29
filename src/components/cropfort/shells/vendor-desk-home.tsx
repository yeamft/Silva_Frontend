"use client";

import { FarmAreaLabel } from "@/components/cropfort/farm-area-label";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useVendorCounts } from "@/lib/cropfort/use-vendor-counts";
import { cn } from "@/lib/utils";
import { fmtEtb } from "@/store/cropfortOpsStore";

type Tone = "primary" | "warn" | "info" | "ok";

const TONE: Record<Tone, { tile: string; number: string; icon: string }> = {
  primary: { tile: "border-primary/30 bg-primary/[0.05]", number: "text-foreground", icon: "bg-primary/10 text-primary" },
  warn: { tile: "border-amber-500/40 bg-amber-500/[0.07]", number: "text-amber-700 dark:text-amber-400", icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  info: { tile: "border-sky-500/30 bg-sky-500/[0.05]", number: "text-sky-700 dark:text-sky-300", icon: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  ok: { tile: "border-emerald-500/30 bg-emerald-500/[0.05]", number: "text-emerald-700 dark:text-emerald-400", icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
};

/**
 * Field desk home for the vendor: one screen. Four tiles say where the work stands;
 * "Do next" lists the work orders to finish, returned ones first.
 */
export function VendorDeskHome() {
  const c = useVendorCounts();
  const wo = CROPFORT_ROUTES.workOrders;

  const tiles: { label: string; value: number; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "To do", value: c.toDo.length, href: wo, icon: Wrench, tone: "primary" },
    { label: "Returned to fix", value: c.returned.length, href: wo, icon: RotateCcw, tone: "warn" },
    { label: "With SPX for review", value: c.inReview.length, href: `${wo}?view=review`, icon: Clock, tone: "info" },
    { label: "Approved", value: c.approved.length, href: `${wo}?view=approved`, icon: ShieldCheck, tone: "ok" },
  ];

  const todo = [
    ...c.returned.map((w) => ({
      id: w.id,
      title: w.title,
      meta: w.vendorNote ? `SPX: ${w.vendorNote}` : "Returned by SPX",
      returned: true,
    })),
    ...c.toDo.map((w) => ({
      id: w.id,
      title: w.title,
      meta: [w.code, w.farm, fmtEtb(w.etb)].filter(Boolean).join(" · "),
      returned: false,
    })),
  ];
  const shown = todo.slice(0, 6);


  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <FarmAreaLabel size="lg" />
        <Button asChild>
          <Link href={wo}>
            <Wrench className="mr-1.5 h-4 w-4" aria-hidden />
            Work orders
          </Link>
        </Button>
      </header>

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
          {todo.length > shown.length ? (
            <Link href={wo} className="text-xs font-medium text-primary hover:underline">
              All {todo.length}
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
            <p className="text-sm font-semibold">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">No work orders are waiting on you right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((item) => (
              <li key={item.id}>
                {/* Each work order opens its own report page */}
                <Link
                  href={`${wo}/${item.id}/complete`}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      item.returned ? TONE.warn.icon : TONE.primary.icon,
                    )}
                    aria-hidden
                  >
                    {item.returned ? <RotateCcw className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    {item.returned ? "Fix & resend" : "Report done"}
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
