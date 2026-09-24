"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DENSITY_KEY = "cropfort.ui.density";

export type UiDensity = "comfortable" | "compact";

function applyDensity(density: UiDensity) {
  const root = document.documentElement;
  if (density === "compact") {
    root.classList.add("cf-density-compact");
  } else {
    root.classList.remove("cf-density-compact");
  }
}

export function useUiDensity() {
  const [density, setDensity] = useState<UiDensity>("comfortable");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY) as UiDensity | null;
      if (stored === "compact" || stored === "comfortable") {
        setDensity(stored);
        applyDensity(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const set = (next: UiDensity) => {
    setDensity(next);
    applyDensity(next);
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return { density, setDensity: set };
}

/** Comfortable | Compact control for operational tables. */
export function DensityToggle({ className }: { className?: string }) {
  const { density, setDensity } = useUiDensity();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label="Table density"
    >
      <span className="px-2 text-muted-foreground">Density</span>
      {(
        [
          ["comfortable", "Comfortable"],
          ["compact", "Compact"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setDensity(value)}
          className={cn(
            "rounded px-2 py-1 font-medium transition-colors",
            density === value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={density === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
