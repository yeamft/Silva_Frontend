"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Compact estate-position metric (role desks). */
export function DeskMetric({
  label,
  value,
  hint,
  href,
  emphasis,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  /** Soft highlight when something needs follow-up */
  emphasis?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "cf-numeric mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          emphasis && "text-primary",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </>
  );

  const shell = cn(
    "rounded-xl border bg-card p-4 transition-colors",
    emphasis
      ? "border-primary/35 bg-primary/[0.04] hover:border-primary/50"
      : "border-border hover:border-foreground/20 hover:bg-muted/15",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

export function AttentionPanel({
  title = "Needs your attention",
  subtitle,
  children,
  empty,
  actionHref,
  actionLabel,
  className,
}: {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  empty?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const hasItems = items.length > 0;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actionHref && actionLabel && hasItems ? (
          <Link
            href={actionHref}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {hasItems ? (
        <ul className="space-y-2">{items.map((node, i) => <li key={i}>{node}</li>)}</ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {empty ?? "Nothing waiting on you right now."}
        </div>
      )}
    </section>
  );
}

export function AttentionItem({
  href,
  eyebrow,
  title,
  meta,
  detail,
  cta = "Review",
}: {
  href: string;
  eyebrow?: string;
  title: string;
  meta?: string;
  detail?: ReactNode;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4",
        "transition-colors hover:border-primary/30 hover:bg-muted/15",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <p className="text-[15px] font-semibold leading-snug tracking-tight">{title}</p>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
      </div>
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
        {cta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}

export function DeskGreeting({
  deskLabel,
  estateName,
  tagline,
  firstName,
  summary,
}: {
  deskLabel: string;
  estateName?: string;
  tagline: string;
  firstName: string;
  summary?: string;
}) {
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="space-y-4 border-b border-border pb-5">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {deskLabel}
        </p>
        {estateName ? (
          <p className="text-sm font-medium text-foreground">{estateName}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{tagline}</p>
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {hello}, {firstName}
        </h1>
        {summary ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
        ) : null}
      </div>
    </header>
  );
}
