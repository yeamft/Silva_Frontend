"use client";

import { StatusBadge } from "@/components/cropfort/status-badge";
import { cn } from "@/lib/utils";

export function RateResolutionBadge({
  source,
  rate,
  className,
}: {
  source: "benchmark" | "norm_wage" | null | undefined;
  rate?: number | null;
  className?: string;
}) {
  if (!source) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-destructive", className)}>
        <StatusBadge status="rejected" label="No rate" />
        <span>No resolvable rate</span>
      </span>
    );
  }

  const label = source === "benchmark" ? "Benchmark" : "Norm × wage";
  const tone = source === "benchmark" ? "approved" : "submitted";

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <StatusBadge status={tone} label={label} />
      {rate != null ? <span className="cf-numeric font-medium">{rate.toLocaleString()}</span> : null}
    </span>
  );
}
