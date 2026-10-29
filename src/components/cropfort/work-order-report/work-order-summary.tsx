"use client";

import { SectionCard } from "@/components/cropfort/page-shell";
import type { WorkOrderDto } from "@/lib/api/work-orders";
import { fmtEtb } from "@/store/cropfortOpsStore";

/** "12.5 ha" from the work order, or from the first part of its instructions (older orders). */
export function plannedOf(wo: WorkOrderDto): { qty: number | null; unit: string } {
  if (wo.plannedQty != null) return { qty: wo.plannedQty, unit: wo.unit || "" };
  const first = (wo.instructions || "").split(" · ")[0] ?? "";
  const m = /^([\d.]+)\s*(.*)$/.exec(first.trim());
  return m ? { qty: Number(m[1]), unit: m[2] || "" } : { qty: null, unit: "" };
}

export function monthlyCodeOf(wo: WorkOrderDto) {
  return /\bFrom (MWO-[A-Za-z0-9-]+)/.exec(wo.instructions || "")?.[1] ?? null;
}

/** Key facts of a work order, shown at the top of the report and review pages. */
export function WorkOrderSummary({ wo }: { wo: WorkOrderDto }) {
  const planned = plannedOf(wo);
  const blocks = wo.blocks.map((b) => b.blockCode || b.blockName).filter(Boolean).join(", ");
  const facts = [
    { label: "Activity", value: wo.activity || wo.title },
    { label: "Farm · block", value: [wo.farmName, blocks].filter(Boolean).join(" · ") || "—" },
    { label: "Planned", value: planned.qty != null ? `${planned.qty} ${planned.unit}`.trim() : "—" },
    { label: "Cost", value: fmtEtb(wo.plannedCostEtb) },
    { label: "Vendor", value: wo.vendorName || "Unassigned" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {facts.map((f) => (
        <SectionCard key={f.label}>
          <p className="text-xs text-muted-foreground">{f.label}</p>
          <p className="mt-1 truncate text-sm font-semibold" title={String(f.value)}>
            {f.value}
          </p>
        </SectionCard>
      ))}
    </div>
  );
}
