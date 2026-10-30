"use client";

import { HardHat, Package, Tractor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityResourceKind } from "@/lib/api/activities";
import { RESOURCE_KIND_LABEL, type ResourceLine } from "@/lib/cropfort/resources";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ActivityResourceKind, LucideIcon> = { labour: HardHat, material: Package, service: Tractor };

const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100));

/**
 * Labour, materials and services as one compact table, grouped by kind. With `showActual`, adds
 * actual and variance columns (from vendor reports).
 */
export function ResourceSummary({
  lines,
  showActual = false,
  empty = "No labour, materials or services defined for these activities.",
  className,
}: {
  lines: ResourceLine[];
  showActual?: boolean;
  empty?: string;
  className?: string;
}) {
  if (!lines.length) return <p className={cn("text-sm text-muted-foreground", className)}>{empty}</p>;
  const kinds = (["labour", "material", "service"] as const).filter((k) => lines.some((l) => l.kind === k));

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border", className)}>
      <table className="w-full min-w-[22rem] text-sm">
        <thead className="bg-muted/40 text-left text-[11px] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Planned</th>
            {showActual ? (
              <>
                <th className="px-3 py-2 text-right font-medium">Actual</th>
                <th className="px-3 py-2 text-right font-medium">Variance</th>
              </>
            ) : null}
          </tr>
        </thead>
        {kinds.map((kind) => {
          const Icon = KIND_ICON[kind];
          return (
            <tbody key={kind} className="border-t border-border">
              <tr>
                <td colSpan={showActual ? 4 : 2} className="bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    {RESOURCE_KIND_LABEL[kind]}
                  </span>
                </td>
              </tr>
              {lines
                .filter((l) => l.kind === kind)
                .map((l) => {
                  const diff = l.actual != null ? l.actual - l.planned : null;
                  return (
                    <tr key={`${l.kind}-${l.name}-${l.unit}`} className="border-t border-border/60">
                      <td className="px-3 py-1.5">{l.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {fmt(l.planned)} <span className="text-xs text-muted-foreground">{l.unit}</span>
                      </td>
                      {showActual ? (
                        <>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {l.actual != null ? fmt(l.actual) : "—"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1.5 text-right tabular-nums",
                              diff == null || Math.abs(diff) < 0.005
                                ? "text-muted-foreground"
                                : diff > 0
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-sky-700 dark:text-sky-300",
                            )}
                          >
                            {diff == null ? "—" : Math.abs(diff) < 0.005 ? "On plan" : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
