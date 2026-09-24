"use client";

import { StatusBadge } from "@/components/cropfort/status-badge";
import { cn } from "@/lib/utils";
import type { ResolutionResult } from "@/types/rate-card-workflow";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Phase E preview: Block → Farm Area → Program standing → fallback, with why.
 */
export function RateResolutionPreview({
  result,
  loading,
  className,
}: {
  result?: ResolutionResult | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Resolving…</p>;
  }
  if (!result) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Select an activity (and optional block) to preview resolution.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {result.source === "none" ? (
          <StatusBadge status="rejected" label="No rate" />
        ) : (
          <StatusBadge status="approved" label={result.source.replace(/_/g, " ")} />
        )}
        <span className="cf-numeric text-lg font-semibold tabular-nums">{fmtEtb(result.rate)}</span>
        {result.version != null ? (
          <span className="text-xs text-muted-foreground">v{result.version}</span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{result.why}</p>
      <ol className="space-y-1.5">
        {result.chain.map((step) => (
          <li
            key={step.source}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
              step.matched ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-muted/20",
            )}
          >
            <span className={cn(!step.matched && "text-muted-foreground")}>{step.label}</span>
            <span className="cf-numeric tabular-nums text-muted-foreground">
              {step.matched ? fmtEtb(step.rate) : "—"}
              {step.version != null ? ` · v${step.version}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
