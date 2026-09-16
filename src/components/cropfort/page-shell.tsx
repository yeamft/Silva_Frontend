"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/** Page container: consistent max width, rhythm, and padding across every route. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("cf-page", className)}>{children}</div>;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="cf-focus rounded transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!last ? <ChevronRight className="h-3 w-3 opacity-50" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Standard page masthead. Title is the page's single h1.
 * Primary action always sits top-right; secondary actions precede it.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  meta?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-1.5">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&>*]:min-h-11 sm:[&>*]:min-h-9">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export type TrendDirection = "up" | "down" | "flat";

/** Inline SVG sparkline — avoids pulling a chart runtime into KPI tiles. */
function Sparkline({ series, className }: { series: number[]; className?: string }) {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = 100 / (series.length - 1);
  const points = series.map((v, i) => `${i * step},${24 - ((v - min) / span) * 20}`);

  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className={cn("h-6 w-full", className)}
      aria-hidden
      focusable="false"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * KPI tile. `emphasis` marks the one or two metrics that should dominate;
 * everything else stays visually quiet so the hierarchy reads.
 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  trend = "flat",
  intent = "positive",
  icon: Icon,
  footnote,
  progress,
  series,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  trend?: TrendDirection;
  intent?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  footnote?: string;
  progress?: number;
  series?: number[];
  emphasis?: boolean;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const good = intent === "neutral" ? null : (trend === "up") === (intent === "positive");
  const trendClass = good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive";

  return (
    <Card className={cn("shadow-[0_1px_2px_rgba(15,23,20,0.08),0_6px_16px_-4px_rgba(15,23,20,0.12),0_16px_32px_-10px_rgba(15,23,20,0.14)]", emphasis && "border-primary/25 bg-primary/[0.03]")}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p>
          {Icon ? <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden /> : null}
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={cn(
              "cf-numeric font-semibold leading-none text-foreground",
              emphasis ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            )}
          >
            {value}
          </span>
          {unit ? <span className="text-[11px] text-muted-foreground sm:text-xs">{unit}</span> : null}
        </div>

        {series?.length ? (
          <Sparkline
            series={series}
            className={cn(
              "mt-2.5 hidden sm:block",
              good === false ? "text-destructive/60" : "text-primary/60"
            )}
          />
        ) : null}

        {typeof progress === "number" ? (
          <div
            className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} progress`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                progress > 90 ? "bg-destructive" : progress > 75 ? "bg-warning" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}

        {delta || footnote ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {delta ? (
              <span className={cn("flex items-center gap-0.5 font-medium", trendClass)}>
                <TrendIcon className="h-3.5 w-3.5" aria-hidden />
                {delta}
              </span>
            ) : null}
            {footnote ? <span className="truncate text-muted-foreground">{footnote}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Card with a consistent header/action pattern for dashboard and list sections. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Remove body padding — use for full-bleed tables and lists. */
  flush?: boolean;
}) {
  const showHeader = Boolean(title || action);
  return (
    <Card className={cn("flex flex-col shadow-[0_1px_2px_rgba(15,23,20,0.08),0_6px_16px_-4px_rgba(15,23,20,0.12),0_16px_32px_-10px_rgba(15,23,20,0.14)]", className)}>
      {showHeader ? (
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b py-3">
          <div className="min-w-0">
            {title ? <CardTitle className="text-sm">{title}</CardTitle> : null}
            {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(flush ? "flex-1 p-3 sm:p-4" : "flex-1 p-4 sm:p-5", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** "View all" style link used in section card headers. */
export function SectionAction({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
      <Link href={href}>
        {label}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  );
}

export { StatusBadge } from "@/components/cropfort/status-badge";
