"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ActivityResourceKind } from "@/lib/api/activities";
import { RESOURCE_KIND_LABEL, type ResourceLine } from "@/lib/cropfort/resources";
import { cn } from "@/lib/utils";

const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100));

/**
 * Vendor's labour, materials and services for one job: planned comes from the activity, the
 * vendor fills in what was actually used, and can add anything extra.
 */
export function ResourceActualsEditor({
  lines,
  disabled,
  onChange,
}: {
  lines: ResourceLine[];
  disabled: boolean;
  onChange: (next: ResourceLine[]) => void;
}) {
  const update = (i: number, patch: Partial<ResourceLine>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = (kind: ActivityResourceKind) =>
    onChange([...lines, { kind, name: "", unit: kind === "labour" ? "man-days" : "", planned: 0, actual: null }]);

  return (
    <div className="space-y-2">
      {lines.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-muted/40 text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Planned</th>
                <th className="px-3 py-2 text-right font-medium">Actual</th>
                <th className="px-3 py-2 text-right font-medium">Variance</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const extra = !l.planned;
                const diff = l.actual != null ? l.actual - l.planned : null;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{RESOURCE_KIND_LABEL[l.kind]}</td>
                    <td className="px-2 py-1">
                      {extra ? (
                        <div className="flex gap-1.5">
                          <Input
                            value={l.name}
                            disabled={disabled}
                            onChange={(e) => update(i, { name: e.target.value })}
                            placeholder="Item"
                            aria-label="Item name"
                            className="h-8 min-w-[8rem]"
                          />
                          {l.kind === "labour" ? null : (
                            <Input
                              value={l.unit}
                              disabled={disabled}
                              onChange={(e) => update(i, { unit: e.target.value })}
                              placeholder="Unit"
                              aria-label="Unit"
                              className="h-8 w-20"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{l.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {extra ? "—" : fmt(l.planned)} <span className="text-xs text-muted-foreground">{l.unit}</span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={l.actual ?? ""}
                        disabled={disabled}
                        onChange={(e) => update(i, { actual: e.target.value === "" ? null : Number(e.target.value) })}
                        aria-label={`Actual ${l.name || "amount"}`}
                        className="ml-auto h-8 w-24 text-right tabular-nums"
                      />
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
                      {extra ? "—" : diff == null ? "—" : Math.abs(diff) < 0.005 ? "On plan" : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`}
                    </td>
                    <td className="px-1 text-center">
                      {extra && !disabled ? (
                        <button
                          type="button"
                          onClick={() => onChange(lines.filter((_, j) => j !== i))}
                          aria-label="Remove item"
                          className="cf-focus inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No labour, materials or services set for this activity.</p>
      )}
      {disabled ? null : (
        <div className="flex flex-wrap gap-2 text-xs">
          {(["labour", "material", "service"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => add(k)}
              className="cf-focus inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {k === "labour" ? "Labour" : k === "material" ? "Material" : "Service"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
