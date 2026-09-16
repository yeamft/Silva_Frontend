"use client";

import { cn } from "@/lib/utils";

/** Lightweight skeleton used while route chunks and charts load. */
export function PageSkeleton({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("cf-page animate-pulse", className)} aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-56 rounded-md bg-muted/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card p-4">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="mt-3 h-6 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-lg border bg-card" />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex aspect-[5/4] w-full items-end gap-2 rounded-md bg-muted/30 p-4 sm:aspect-[16/7]", className)}
      aria-hidden
    >
      {[40, 65, 45, 80, 55, 70, 50, 75].map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-muted/60" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function TableSkeletonBlock() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading table">
      <div className="h-10 rounded-md bg-muted/50" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-11 rounded-md bg-muted/30" />
      ))}
    </div>
  );
}
