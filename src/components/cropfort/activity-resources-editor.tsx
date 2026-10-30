"use client";

import { HardHat, Package, Plus, Tractor, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ActivityResource, ActivityResourceKind } from "@/lib/api/activities";

const GROUPS: {
  kind: ActivityResourceKind;
  title: string;
  icon: LucideIcon;
  namePlaceholder: string;
  defaultUnit: string;
  qtyLabel: (uom: string) => string;
}[] = [
  {
    kind: "labour",
    title: "Labour",
    icon: HardHat,
    namePlaceholder: "e.g. Pruner",
    defaultUnit: "man-days",
    qtyLabel: (uom) => `Man-days / ${uom || "unit"}`,
  },
  {
    kind: "material",
    title: "Materials",
    icon: Package,
    namePlaceholder: "e.g. Urea",
    defaultUnit: "kg",
    qtyLabel: (uom) => `Qty / ${uom || "unit"}`,
  },
  {
    kind: "service",
    title: "Services",
    icon: Tractor,
    namePlaceholder: "e.g. Tractor hire",
    defaultUnit: "hours",
    qtyLabel: (uom) => `Qty / ${uom || "unit"}`,
  },
];

/** Labour, materials and services an activity needs, edited as three short lists. */
export function ActivityResourcesEditor({
  value,
  unitOfMeasure,
  onChange,
}: {
  value: ActivityResource[];
  /** The activity's own unit, for "per ha" labels. */
  unitOfMeasure: string;
  onChange: (next: ActivityResource[]) => void;
}) {
  const update = (index: number, patch: Partial<ActivityResource>) =>
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const rows = value.map((r, index) => ({ r, index })).filter(({ r }) => r.kind === g.kind);
        const Icon = g.icon;
        return (
          <div key={g.kind} className="rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <p className="flex-1 text-sm font-semibold">
                {g.title}
                {rows.length ? <span className="ml-1.5 font-normal text-muted-foreground">· {rows.length}</span> : null}
              </p>
              <button
                type="button"
                onClick={() => onChange([...value, { kind: g.kind, name: "", qty: null, unit: g.defaultUnit }])}
                className="cf-focus inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add
              </button>
            </div>
            {rows.length ? (
              <ul className="space-y-2 p-3">
                {rows.map(({ r, index }) => (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <Input
                      value={r.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                      placeholder={g.namePlaceholder}
                      aria-label={`${g.title} name`}
                      className="h-9 min-w-[10rem] flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={r.qty ?? ""}
                      onChange={(e) => update(index, { qty: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder={g.qtyLabel(unitOfMeasure)}
                      aria-label={g.qtyLabel(unitOfMeasure)}
                      className="h-9 w-32 tabular-nums"
                    />
                    {g.kind === "labour" ? (
                      <span className="text-xs text-muted-foreground">man-days</span>
                    ) : (
                      <Input
                        value={r.unit}
                        onChange={(e) => update(index, { unit: e.target.value })}
                        placeholder="Unit"
                        aria-label={`${g.title} unit`}
                        className="h-9 w-20"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((_, i) => i !== index))}
                      aria-label={`Remove ${r.name || g.title.toLowerCase()}`}
                      className="cf-focus inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
