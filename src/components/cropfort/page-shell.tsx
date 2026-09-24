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
 * Workspace page masthead — typography + spacing establish hierarchy (no card chrome).
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  meta?: ReactNode;
  /** Small line above the title (e.g. workspace or section name). */
  eyebrow?: string;
}) {
  return (
    <header className="space-y-3">
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? <p className="cf-eyebrow">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&>*]:min-h-10 sm:[&>*]:min-h-9">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Compact inline metrics under a page title (e.g. "124 Activities · 1,240 ha"). */
export function PageMetaStrip({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-baseline gap-1.5">
          <span className="cf-numeric font-semibold text-foreground">{item.value}</span>
          <span className="text-muted-foreground">{item.label}</span>
        </span>
      ))}
    </div>
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
    <Card className={cn(emphasis && "border-primary/25")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {Icon ? <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden /> : null}
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span
            className={cn(
              "cf-numeric font-semibold leading-none tracking-tight text-foreground",
              emphasis ? "text-3xl" : "text-2xl"
            )}
          >
            {value}
          </span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
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
    <Card className={cn("flex flex-col", className)}>
      {showHeader ? (
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            {title ? <CardTitle className="text-sm font-semibold">{title}</CardTitle> : null}
            {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(flush ? "flex-1 p-0" : "flex-1 p-5", bodyClassName)}>{children}</CardContent>
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

/** One-click continue-work card for Home. */
export function NextActionCard({
  href,
  title,
  description,
  count,
  icon: Icon,
  emphasis = false,
}: {
  href: string;
  title: string;
  description?: string;
  count?: number | string | null;
  icon?: LucideIcon;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "cf-focus group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/40",
        emphasis && "border-primary/25",
      )}
    >

      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-5 w-5 text-foreground" aria-hidden />
          </span>
        ) : (
          <span />
        )}
        {count != null && count !== "" ? (
          <span className="cf-numeric text-2xl font-semibold tabular-nums tracking-tight">
            {count}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        Open
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

/** Alias for proof-point style KPI tiles (Cropster-like metric strip). */
export const MetricCard = StatCard;

export { StatusBadge } from "@/components/cropfort/status-badge";
