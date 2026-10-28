"use client";

import { SHOW_SPEND_BANDS } from "@/config/features";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FileWarning,
  FolderKanban,
  Leaf,
  Sprout,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useDeskMode } from "@/components/cropfort/desk-mode";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  approveRateCardProposal,
  listProgramRateCardProposals,
  rejectRateCardProposal,
} from "@/lib/api/rate-card-proposals";
import { PLAN_MONTHS, PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { cn } from "@/lib/utils";
import type { CropfortAfeDto } from "@/lib/api/afes";
import type { InterventionDto } from "@/lib/api/interventions";
import type { ProjectDto } from "@/lib/api/projects";
import { useAfes, useDecideAfe } from "@/lib/query/hooks/use-afes";
import {
  useDecideIntervention,
  useInterventions,
} from "@/lib/query/hooks/use-interventions";
import { useDecideMonthlyWorkOrder, useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import {
  useDecideProgrammePlan,
  useProgrammePlans,
} from "@/lib/query/hooks/use-programme-plans";
import { useDecideProject, useProjects } from "@/lib/query/hooks/use-projects";
import { useDecideWeeklyPlan, useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";
import { useOpsReports, useReleaseOpsReport, useReturnOpsReport } from "@/lib/query/hooks/use-ops-reports";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";
import { canApproveOperations } from "@/lib/cropfort/platform-access";
import { canApproveAsAssetOwner } from "@/lib/cropfortAccess";
import { fmtEtb } from "@/store/cropfortOpsStore";
import { scheduleLabel, scheduleStatusOf } from "@/store/coreOpsPlanStore";
import { Checkbox } from "@/components/ui/checkbox";
import { useSpendBandStore } from "@/store/spendBandStore";
import { listFarmAssessments } from "@/lib/api/farm-assessments";
import type { AfpPromotion, CoreOpsActivity, CoreOpsPlan } from "@/types/core-ops";
import type { MonthlyWorkOrder, WeeklyPlan } from "@/types/agronomic-cycle";

function afpPromotionFromPlan(plan: ProgrammePlanDto): AfpPromotion {
  return {
    id: plan.id,
    planId: plan.id,
    totalEtb: plan.plannedCostEtb ?? 0,
    band: (plan.resolvedBand || "B") as AfpPromotion["band"],
    status: "pending_silva",
    createdAt: plan.submittedAt || plan.updatedAt || new Date().toISOString(),
    note: plan.approvalRequirement || "",
  };
}

export type Tab = "afe" | "afp" | "projects" | "interventions" | "monthly" | "weekly" | "rates" | "reports";

const APPROVAL_TYPES: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "afp", label: "Core Operations plans", icon: Sprout },
  { id: "afe", label: "Spending requests", icon: CircleDollarSign },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "interventions", label: "Interventions", icon: ClipboardList },
  { id: "monthly", label: "Monthly work orders", icon: CalendarDays },
  { id: "weekly", label: "Weekly plans", icon: CalendarCheck2 },
  { id: "reports", label: "Reports", icon: FileText },
];


function ProjectDetail({ project }: { project: ProjectDto }) {
  const done = project.milestones.filter((m) => m.done).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Code">
          <span className="font-mono text-xs">{project.code}</span>
        </DetailKV>
        {SHOW_SPEND_BANDS ? (
          <DetailKV label="Band">
            <span className="font-medium">Band {project.band}</span>
          </DetailKV>
        ) : null}
        <DetailKV label="Budget">
          <span className="cf-numeric font-medium">{fmtEtb(project.budgetEtb)}</span>
        </DetailKV>
        <DetailKV label="Block">{project.blockCode || project.blockId || "—"}</DetailKV>
        <DetailKV label="Vendor">{project.vendor || "—"}</DetailKV>
        <DetailKV label="Milestones">
          {done}/{project.milestones.length}
        </DetailKV>
        <DetailKV label="Submitted by">{project.createdByName || "—"}</DetailKV>
        <DetailKV label="Submitted">
          {project.submittedAt ? new Date(project.submittedAt).toLocaleString() : "—"}
        </DetailKV>
      </div>
      {project.notes ? (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          {project.notes}
        </p>
      ) : null}
      <ReviewGate
        items={[
          { ok: project.budgetEtb > 0, label: "Budget is stated" },
          { ok: Boolean(project.blockId), label: "Block is assigned" },
          { ok: project.status === "submitted", label: "Awaiting Silva decision" },
        ]}
      />
    </div>
  );
}

function InterventionDetail({ intervention }: { intervention: InterventionDto }) {
  const done = intervention.steps.filter((s) => s.done).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Code">
          <span className="font-mono text-xs">{intervention.code}</span>
        </DetailKV>
        {SHOW_SPEND_BANDS ? (
          <DetailKV label="Band">
            <span className="font-medium">Band {intervention.band}</span>
          </DetailKV>
        ) : null}
        <DetailKV label="Cost">
          <span className="cf-numeric font-medium">{fmtEtb(intervention.costEtb)}</span>
        </DetailKV>
        <DetailKV label="Block">
          {intervention.blockCode || intervention.blockId || "—"}
        </DetailKV>
        <DetailKV label="Vendor">{intervention.vendor || "—"}</DetailKV>
        <DetailKV label="Steps">
          {done}/{intervention.steps.length}
        </DetailKV>
        <DetailKV label="Submitted by">{intervention.createdByName || "—"}</DetailKV>
        <DetailKV label="Submitted">
          {intervention.submittedAt
            ? new Date(intervention.submittedAt).toLocaleString()
            : "—"}
        </DetailKV>
      </div>
      <ul className="space-y-1 text-sm">
        {intervention.steps.map((s) => (
          <li key={s.id} className={s.done ? "text-muted-foreground line-through" : ""}>
            {s.title}
          </li>
        ))}
      </ul>
      <ReviewGate
        items={[
          { ok: intervention.costEtb > 0, label: "Cost is stated" },
          { ok: Boolean(intervention.blockId), label: "Block is assigned" },
          { ok: intervention.status === "submitted", label: "Awaiting Silva decision" },
        ]}
      />
    </div>
  );
}

type QueueRow = {
  id: string;
  kind: Tab;
  title: string;
  meta: string;
  amount: number;
  risk?: string;
};

function DetailKV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

function ReviewGate({ items }: { items: { ok: boolean; label: string }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2 text-sm">
          {item.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          )}
          <span className={item.ok ? "text-muted-foreground" : "text-foreground"}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AfeDetail({ afe }: { afe: CropfortAfeDto }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="AFE id">
          <span className="font-mono text-xs">{afe.id.slice(0, 12)}</span>
        </DetailKV>
        {SHOW_SPEND_BANDS ? (
          <DetailKV label="Band">
            <span className="font-medium">Band {afe.band}</span>
          </DetailKV>
        ) : null}
        <DetailKV label="Amount">
          <span className="cf-numeric font-medium">{fmtEtb(afe.amountEtb)}</span>
        </DetailKV>
        <DetailKV label="Source">{afe.sourceType || "manual"}</DetailKV>
        <DetailKV label="Version">v{afe.version}</DetailKV>
        <DetailKV label="Title">{afe.title}</DetailKV>
        <DetailKV label="Submitted by">{afe.createdByName || "—"}</DetailKV>
        <DetailKV label="Submitted">
          {afe.submittedAt ? new Date(afe.submittedAt).toLocaleString() : "—"}
        </DetailKV>
      </div>
      <ReviewGate
        items={[
          { ok: afe.amountEtb > 0, label: "Authority amount is stated" },
          { ok: afe.status === "submitted", label: "AFE is awaiting decision" },
          ...(SHOW_SPEND_BANDS
            ? [
                {
                  ok: afe.band === "C" || afe.band === "D",
                  label:
                    afe.band === "C" || afe.band === "D"
                      ? "Band requires Silva / asset-owner gate"
                      : `Band ${afe.band} — confirm routing is correct`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

const INTENSITY_CELL: Record<string, string> = {
  peak: "bg-primary",
  active: "bg-primary/55",
  light: "bg-primary/25",
  none: "bg-muted/60",
};

const INTENSITY_PRINT: Record<string, string> = { peak: "#2f6b3a", active: "#8fb996", light: "#d5e6d8" };

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Opens a printable copy of the plan; the browser's print dialog offers "Save as PDF". */
function savePlanAsPdf(plan: CoreOpsPlan, promotion: AfpPromotion, included: CoreOpsActivity[]) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    toast.error("Allow pop-ups for this site to save the PDF");
    return;
  }
  const title = plan.name || "Core Operations plan";
  const byCategory = new Map<string, number>();
  for (const a of included) byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + a.plannedCost);
  const facts: [string, string][] = [
    ["Farm", plan.farmName],
    ["Budget year", plan.budgetYearLabel],
    ["Area", plan.totalHa ? `${plan.totalHa.toLocaleString()} ha` : "—"],
    ["Vendor", plan.vendorLabel || "—"],
    ...(SHOW_SPEND_BANDS ? ([["Band", promotion.band]] as [string, string][]) : []),
    ["Submitted", new Date(promotion.createdAt).toLocaleString()],
    ["Total", fmtEtb(promotion.totalEtb)],
  ];
  const rows = included
    .map(
      (a) => `<tr>
        <td><b>${escapeHtml(a.activityName)}</b><br><small>${escapeHtml(a.activityCode)} · ${escapeHtml(a.category)}</small></td>
        <td class="n">${escapeHtml(a.plannedQty.toLocaleString())} ${escapeHtml(a.uom)}${(a.frequency ?? 1) !== 1 ? ` × ${escapeHtml(a.frequency)}/yr` : ""}</td>
        <td class="n">${a.agreedRate ? escapeHtml(fmtEtb(a.agreedRate.unitRateEtb)) : "—"}</td>
        <td class="n">${escapeHtml(fmtEtb(a.plannedCost))}</td>
        ${PLAN_MONTHS.map((m) => {
          const level = a.intensities?.[m] ?? "none";
          return `<td class="m"${level !== "none" ? ` style="background:${INTENSITY_PRINT[level]}"` : ""}></td>`;
        }).join("")}
      </tr>`,
    )
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font: 12px/1.4 system-ui, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .facts { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 8px 0 14px; }
  .facts span { color: #666; margin-right: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; font-size: 11px; }
  .n { text-align: right; white-space: nowrap; }
  .m { width: 22px; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  small { color: #666; }
  .cats { margin: 0 0 12px; color: #444; }
  .sign { display: flex; gap: 60px; margin-top: 36px; }
  .sign div { border-top: 1px solid #333; padding-top: 4px; width: 220px; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="facts">${facts.map(([k, v]) => `<div><span>${k}</span><b>${escapeHtml(v)}</b></div>`).join("")}</div>
<p class="cats">${[...byCategory.entries()].map(([c, v]) => `${escapeHtml(c)}: <b>${escapeHtml(fmtEtb(v))}</b>`).join(" · ")}</p>
<table>
  <thead><tr><th>Activity</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Cost</th>
  ${PLAN_MONTHS.map((m) => `<th class="m">${PLAN_MONTH_LABELS[m]}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><th colspan="3">Total · ${included.length} activities</th><th class="n">${escapeHtml(fmtEtb(promotion.totalEtb))}</th><th colspan="12"></th></tr></tfoot>
</table>
<div class="sign"><div>Asset owner</div><div>Date</div></div>
</body></html>`);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
  setTimeout(() => win.print(), 400);
}

function AfpDetail({
  plan,
  promotion,
  activities,
  wanted,
  onToggleWanted,
  onSetAllWanted,
}: {
  plan: CoreOpsPlan;
  promotion: AfpPromotion;
  activities: CoreOpsActivity[];
  /** Activities the asset owner wants; undefined = the owner can't choose. */
  wanted?: Set<string>;
  onToggleWanted?: (id: string) => void;
  onSetAllWanted?: (all: boolean) => void;
}) {
  const included = activities.filter((a) => a.included);
  const choosing = Boolean(wanted && onToggleWanted);
  const wantedRows = choosing ? included.filter((a) => wanted!.has(a.id)) : included;
  const wantedTotal = wantedRows.reduce((sum, a) => sum + (a.plannedCost || 0), 0);
  const activeMonths = PLAN_MONTHS.filter((m) => included.some((a) => (a.intensities?.[m] ?? "none") !== "none"));
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of included) map.set(a.category, (map.get(a.category) ?? 0) + a.plannedCost);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [included]);

  const issues = [
    included.filter((a) => a.plannedQty <= 0).length && `${included.filter((a) => a.plannedQty <= 0).length} without quantity`,
    included.filter((a) => !a.agreedRate).length && `${included.filter((a) => !a.agreedRate).length} without rate`,
    included.filter((a) => scheduleStatusOf(a) !== "scheduled").length &&
      `${included.filter((a) => scheduleStatusOf(a) !== "scheduled").length} not scheduled`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {(
            [
              ["Farm", plan.farmName],
              ["Budget year", plan.budgetYearLabel],
              ["Area", plan.totalHa ? `${plan.totalHa.toLocaleString()} ha` : "—"],
              ["Vendor", plan.vendorLabel || "—"],
              ["Submitted", new Date(promotion.createdAt).toLocaleDateString()],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Button size="sm" variant="outline" onClick={() => savePlanAsPdf(plan, promotion, included)}>
          <FileDown className="mr-1.5 h-4 w-4" aria-hidden />
          Save as PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Plan total", value: fmtEtb(promotion.totalEtb) },
          { label: "Activities", value: String(included.length) },
          { label: "Months with work", value: `${activeMonths.length} of ${PLAN_MONTHS.length}` },
          choosing
            ? { label: "You want", value: `${wantedRows.length} · ${fmtEtb(wantedTotal)}`, strong: wantedRows.length !== included.length }
            : { label: "Categories", value: String(byCategory.length) },
        ].map((tile) => (
          <div
            key={tile.label}
            className={cn(
              "rounded-xl border px-3 py-2",
              "strong" in tile && tile.strong ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-border bg-muted/30",
            )}
          >
            <p className="text-[11px] text-muted-foreground">{tile.label}</p>
            <p className="text-sm font-semibold tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {byCategory.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([cat, cost]) => {
            const count = included.filter((a) => a.category === cat).length;
            return (
              <span key={cat} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
                {cat} · {count} <span className="ml-1 font-semibold tabular-nums">{fmtEtb(cost)}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {choosing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/[0.06] px-3 py-2 text-sm">
          <span>
            <span className="font-medium">Tick the activities you want.</span>{" "}
            <span className="text-muted-foreground">Untick any you don&apos;t — the plan goes back to SPX with your choice.</span>
          </span>
          <span className="flex gap-3 text-xs font-medium">
            <button type="button" className="text-primary hover:underline" onClick={() => onSetAllWanted?.(true)}>
              Want all
            </button>
            <button type="button" className="text-primary hover:underline" onClick={() => onSetAllWanted?.(false)}>
              Clear
            </button>
          </span>
        </div>
      ) : null}

      {included.length > 0 ? (
        <div className="cf-table-scroll max-h-[28rem] rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {choosing ? <TableHead className="w-10" /> : null}
                <TableHead className="min-w-[12rem]">Activity</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                {PLAN_MONTHS.map((m) => (
                  <TableHead key={m} className="w-7 px-0.5 text-center text-[10px]">
                    {PLAN_MONTH_LABELS[m]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {included.map((a) => {
                const isWanted = !choosing || wanted!.has(a.id);
                return (
                <TableRow key={a.id} className={cn(choosing && !isWanted && "opacity-50")}>
                  {choosing ? (
                    <TableCell>
                      <Checkbox
                        checked={isWanted}
                        aria-label={`Want ${a.activityName}`}
                        onCheckedChange={() => onToggleWanted?.(a.id)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <p className={cn("text-sm font-medium", choosing && !isWanted && "line-through")}>{a.activityName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{a.activityCode}</span> · {a.category}
                      {a.blockAllocations?.length
                        ? ` · ${a.blockAllocations.map((b) => b.blockCode).join(", ")}`
                        : a.scope === "off_block"
                          ? " · Nursery"
                          : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{scheduleLabel(a)}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                    {a.plannedQty ? a.plannedQty.toLocaleString() : "—"}{" "}
                    <span className="text-xs text-muted-foreground">
                      {a.uom}
                      {(a.frequency ?? 1) !== 1 ? ` × ${a.frequency}/yr` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                    {a.agreedRate ? fmtEtb(a.agreedRate.unitRateEtb) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm font-medium">
                    {fmtEtb(a.plannedCost)}
                  </TableCell>
                  {PLAN_MONTHS.map((m) => {
                    const level = a.intensities?.[m] ?? "none";
                    return (
                      <TableCell key={m} className="px-0.5 text-center">
                        <span
                          className={cn("mx-auto block h-4 w-5 rounded-sm", INTENSITY_CELL[level])}
                          title={`${PLAN_MONTH_LABELS[m]}: ${level === "none" ? "—" : level}`}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <p className={cn("flex items-center gap-1.5 text-sm", issues.length ? "text-warning" : "text-success")}>
        {issues.length ? (
          <AlertTriangle className="h-4 w-4" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        )}
        {issues.length ? issues.join(" · ") : "All checks passed"}
      </p>
    </div>
  );
}

function MonthlyDetail({ order }: { order: MonthlyWorkOrder }) {
  const outOfPlan = order.lines.filter((l) => !l.inPlan);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="WO code">{order.code}</DetailKV>
        <DetailKV label="Farm">{order.farmName}</DetailKV>
        <DetailKV label="Month">
          {PLAN_MONTH_LABELS[order.ethiopianMonth]} · {order.yearGc}
        </DetailKV>
        <DetailKV label="Total">
          <span className="cf-numeric font-medium">{fmtEtb(order.totalEtb)}</span>
        </DetailKV>
        <DetailKV label="Lines">{order.lines.length}</DetailKV>
        <DetailKV label="Process loop">
          {order.loop === "none" ? "In-plan" : order.loop.replace(/_/g, " ")}
        </DetailKV>
      </div>

      {outOfPlan.length > 0 ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium">
              {outOfPlan.length} out-of-plan line{outOfPlan.length === 1 ? "" : "s"}
            </p>
            {order.outOfPlanReason ? (
              <p className="mt-0.5 text-muted-foreground">{order.outOfPlanReason}</p>
            ) : (
              <p className="mt-0.5 text-muted-foreground">
                Confirm justification before approving Loop B work.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {order.note ? (
        <DetailKV label="Submission note">
          <p className="text-sm leading-relaxed">{order.note}</p>
        </DetailKV>
      ) : null}

      <div className="cf-table-scroll max-h-72 rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>Block</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">ETB</TableHead>
              <TableHead>Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((l) => (
              <TableRow key={l.id} className={cn(!l.inPlan && "bg-warning/5")}>
                <TableCell>
                  <p className="text-sm font-medium">{l.activityName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{l.activityCode}</p>
                </TableCell>
                <TableCell className="text-sm">{l.blockCode}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {l.plannedQty} {l.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {fmtEtb(l.etb)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.inPlan ? "on_track" : "flagged"} label={l.inPlan ? "In plan" : "Out of plan"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReviewGate
        items={[
          { ok: order.lines.length > 0, label: "Monthly WO has activity lines" },
          {
            ok: outOfPlan.length === 0 || Boolean(order.outOfPlanReason),
            label:
              outOfPlan.length === 0
                ? "All lines are in-plan"
                : order.outOfPlanReason
                  ? "Out-of-plan reason provided"
                  : "Out-of-plan lines need a written reason",
          },
          { ok: order.totalEtb > 0, label: "Month total is greater than zero" },
        ]}
      />
    </div>
  );
}

function WeeklyDetail({ plan }: { plan: WeeklyPlan }) {
  const total = plan.lines.reduce((s, l) => s + l.etb, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Weekly plan">{plan.code}</DetailKV>
        <DetailKV label="Week">{plan.weekLabel}</DetailKV>
        <DetailKV label="Lines">{plan.lines.length}</DetailKV>
        <DetailKV label="Total">
          <span className="cf-numeric font-medium">{fmtEtb(total)}</span>
        </DetailKV>
        <DetailKV label="Process loop">
          {plan.loop === "none" ? "Standard" : plan.loop.replace(/_/g, " ")}
        </DetailKV>
      </div>

      <div className="cf-table-scroll max-h-72 rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Crew</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">ETB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <p className="text-sm font-medium">{l.activityName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {l.activityCode}
                    {l.materials ? ` · ${l.materials}` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{l.blockCode}</TableCell>
                <TableCell className="text-sm">{l.crew || "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {l.qty} {l.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {fmtEtb(l.etb)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReviewGate
        items={[
          { ok: plan.lines.length > 0, label: "Weekly plan has activity lines" },
          {
            ok: plan.lines.every((l) => l.crew || l.qty > 0),
            label: "Crew / quantity assigned on lines",
          },
          { ok: total > 0, label: "Week cost is greater than zero" },
        ]}
      />
    </div>
  );
}

export default function ApprovalsView({
  initialSelection,
}: {
  initialSelection?: { kind: Tab; id: string };
}) {
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const desk = useDeskMode();
  const isSilva = desk === "silva";
  const area = getCropfortArea("approvals");
  const canDecide = canApproveOperations(user.role);
  const canDecideRateCards = canApproveAsAssetOwner(user.role);
  const farmAssessmentsQuery = useQuery({
    queryKey: ["farm-assessments-owner", activeProgram?.id],
    queryFn: () => listFarmAssessments({ status: "submitted" }),
    enabled: isSilva && Boolean(activeProgram?.id),
    refetchInterval: 15_000,
  });
  const submittedAssessments = useMemo(() => farmAssessmentsQuery.data ?? [], [farmAssessmentsQuery.data]);
  const rateCardsQuery = useQuery({
    queryKey: ["approval-rate-cards", activeProgram?.id],
    queryFn: () => listProgramRateCardProposals({ status: "submitted", programWide: true }),
    // Rate cards no longer need approval — SPX publishes them directly
    enabled: false,
    refetchInterval: 10_000,
  });
  const pendingRateCards = useMemo(() => rateCardsQuery.data ?? [], [rateCardsQuery.data]);
  const afesQuery = useAfes(Boolean(activeProgram?.id), "submitted");
  const decideAfe = useDecideAfe();
  const afes = useMemo(() => afesQuery.data || [], [afesQuery.data]);
  const weeklyQuery = useWeeklyPlans(Boolean(activeProgram?.id), "submitted");
  const decideWeeklyMut = useDecideWeeklyPlan();
  const weeklyPlans = useMemo(() => weeklyQuery.data || [], [weeklyQuery.data]);
  const reportsQuery = useOpsReports(Boolean(activeProgram?.id), "submitted");
  const releaseReportMut = useReleaseOpsReport();
  const returnReportMut = useReturnOpsReport();
  const submittedReports = useMemo(() => reportsQuery.data || [], [reportsQuery.data]);
  const monthlyQuery = useMonthlyWorkOrders(Boolean(activeProgram?.id), "submitted");
  const decideMonthlyMut = useDecideMonthlyWorkOrder();
  const monthlyOrders = useMemo(() => monthlyQuery.data || [], [monthlyQuery.data]);
  const afpPlansQuery = useProgrammePlans(Boolean(activeProgram?.id), {
    status: "submitted",
  });
  const decideAfpMut = useDecideProgrammePlan();
  const afpPlans = useMemo(() => afpPlansQuery.data || [], [afpPlansQuery.data]);
  const projectsQuery = useProjects(Boolean(activeProgram?.id), "submitted");
  const decideProjectMut = useDecideProject();
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const interventionsQuery = useInterventions(Boolean(activeProgram?.id), "submitted");
  const decideInterventionMut = useDecideIntervention();
  const interventions = useMemo(
    () => interventionsQuery.data || [],
    [interventionsQuery.data],
  );
  const bandAutoApproves = useSpendBandStore((s) => s.bandAutoApproves);

  const detailRoute = Boolean(initialSelection);
  const initialKind = initialSelection?.kind;
  const initialId = initialSelection?.id;
  const [tab, setTab] = useState<Tab>(initialKind ?? "afp");
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [decisionNote, setDecisionNote] = useState("");
  /** Asset owner's choice of activities, per plan id (missing = wants everything). */
  const [wantedByPlan, setWantedByPlan] = useState<Record<string, Set<string>>>({});
  const [listFilter, setListFilter] = useState<Tab | "assessments" | "all">("all");
  const [confirmApprove, setConfirmApprove] = useState(false);

  useEffect(() => {
    if (!initialKind || !initialId) return;
    setTab(initialKind);
    setSelectedId(initialId);
  }, [initialKind, initialId]);

  useEffect(() => {
    setDecisionNote("");
  }, [selectedId, tab]);

  const queues = useMemo(() => {
    const afe: QueueRow[] = afes.map((p) => ({
      id: p.id,
      kind: "afe" as const,
      title: p.title,
      meta: [p.id.slice(0, 10), SHOW_SPEND_BANDS ? `Band ${p.band}` : null, p.sourceType].filter(Boolean).join(" · "),
      amount: p.amountEtb,
      risk: SHOW_SPEND_BANDS && (p.band === "C" || p.band === "D") ? `Band ${p.band} gate` : undefined,
    }));
    const afp: QueueRow[] = afpPlans.map((p) => {
      const included = Object.values(p.activities ?? {}).filter((a) => a.included).length;
      const band = p.resolvedBand || "?";
      return {
        id: p.id,
        kind: "afp" as const,
        title: p.name || (p.farmName ? `${p.farmName} Core Operations plan` : "Core Operations plan"),
        meta: [p.budgetYearLabel, SHOW_SPEND_BANDS ? `Band ${band}` : null, `${included} lines`].filter(Boolean).join(" · "),
        amount: p.plannedCostEtb ?? 0,
        risk: SHOW_SPEND_BANDS ? `Band ${band}` : undefined,
      };
    });
    const projectsQ: QueueRow[] = projects.map((p) => ({
      id: p.id,
      kind: "projects" as const,
      title: p.title,
      meta: [p.code, SHOW_SPEND_BANDS ? `Band ${p.band}` : null, p.blockCode || p.blockId].filter(Boolean).join(" · "),
      amount: p.budgetEtb,
      risk: SHOW_SPEND_BANDS && (p.band === "C" || p.band === "D") ? `Band ${p.band}` : undefined,
    }));
    const interventionsQ: QueueRow[] = interventions.map((i) => ({
      id: i.id,
      kind: "interventions" as const,
      title: i.title,
      meta: [i.code, SHOW_SPEND_BANDS ? `Band ${i.band}` : null, i.blockCode || i.blockId].filter(Boolean).join(" · "),
      amount: i.costEtb,
      risk: SHOW_SPEND_BANDS && (i.band === "C" || i.band === "D") ? `Band ${i.band}` : undefined,
    }));
    const monthly: QueueRow[] = monthlyOrders.map((o) => {
      const out = o.lines.filter((l) => !l.inPlan).length;
      return {
        id: o.id,
        kind: "monthly" as const,
        title: o.code,
        meta: `${o.farmName} · ${PLAN_MONTH_LABELS[o.ethiopianMonth as keyof typeof PLAN_MONTH_LABELS] || o.ethiopianMonth} · ${o.lines.length} lines`,
        amount: o.totalEtb,
        risk: out > 0 ? `${out} out-of-plan` : undefined,
      };
    });
    const weekly: QueueRow[] = weeklyPlans.map((p) => ({
      id: p.id,
      kind: "weekly" as const,
      title: p.code,
      meta: `${p.weekLabel} · ${p.lines.length} lines`,
      amount: p.lines.reduce((s, l) => s + l.etb, 0),
    }));
    const rates: QueueRow[] = pendingRateCards.map((card) => ({
      id: card.id,
      kind: "rates" as const,
      title: card.activityName || card.activityCode || "Rate card",
      meta: [card.kind, card.farmEstateName, card.activityCode]
        .filter(Boolean)
        .join(" · "),
      amount: card.proposedRate,
      risk: card.flagged ? "Variance flagged" : undefined,
    }));
    const reports: QueueRow[] = submittedReports.map((r) => ({
      id: r.id,
      kind: "reports" as const,
      title: r.title || r.code,
      meta: [r.code, r.periodLabel, r.farmName].filter(Boolean).join(" · "),
      amount: r.actualEtb,
    }));
    return {
      afe,
      afp,
      projects: projectsQ,
      interventions: interventionsQ,
      monthly,
      weekly,
      rates,
      reports,
    };
  }, [afes, afpPlans, projects, interventions, monthlyOrders, weeklyPlans, pendingRateCards, submittedReports]);

  const rows = queues[tab];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const selectedAfe =
    selected?.kind === "afe" ? afes.find((p) => p.id === selected.id) : null;
  const selectedAfpPlan =
    selected?.kind === "afp" ? afpPlans.find((p) => p.id === selected.id) ?? null : null;
  const selectedPromo = selectedAfpPlan ? afpPromotionFromPlan(selectedAfpPlan) : null;
  // What the asset owner wants from this plan: everything until they untick something
  const planIncluded = selectedAfpPlan ? Object.values(selectedAfpPlan.activities).filter((x) => x.included) : [];
  const planWanted = selectedAfpPlan
    ? wantedByPlan[selectedAfpPlan.id] ?? new Set(planIncluded.map((x) => x.id))
    : null;
  const planUnwanted = planIncluded.filter((x) => !planWanted?.has(x.id));
  const selectedProject =
    selected?.kind === "projects"
      ? projects.find((p) => p.id === selected.id) ?? null
      : null;
  const selectedIntervention =
    selected?.kind === "interventions"
      ? interventions.find((i) => i.id === selected.id) ?? null
      : null;
  const selectedMonthly =
    selected?.kind === "monthly"
      ? monthlyOrders.find((o) => o.id === selected.id) ?? null
      : null;
  const selectedWeekly =
    selected?.kind === "weekly"
      ? weeklyPlans.find((p) => p.id === selected.id) ?? null
      : null;
  const selectedReport =
    selected?.kind === "reports" ? submittedReports.find((r) => r.id === selected.id) ?? null : null;
  const selectedRateCard =
    selected?.kind === "rates"
      ? pendingRateCards.find((card) => card.id === selected.id) ?? null
      : null;

  const decideRow = async (decision: "approved" | "returned", noteOverride?: string) => {
    if (!selected) return;
    if (!canDecide) {
      toast.error("Only Silva / asset owners can approve or return");
      return;
    }
    const noteText = (noteOverride ?? decisionNote).trim();
    if (decision === "returned" && !noteText) {
      toast.error("Add a return reason so the submitter knows what to fix");
      return;
    }
    const note = noteText || undefined;
    try {
      if (selected.kind === "afe") {
        await decideAfe.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "afp") {
        await decideAfpMut.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "projects") {
        await decideProjectMut.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "interventions") {
        await decideInterventionMut.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "monthly") {
        await decideMonthlyMut.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "weekly") {
        await decideWeeklyMut.mutateAsync({
          id: selected.id,
          decision: decision === "approved" ? "approve" : "return",
          comment: note,
        });
      } else if (selected.kind === "reports") {
        if (decision === "approved") {
          await releaseReportMut.mutateAsync({ id: selected.id });
        } else {
          await returnReportMut.mutateAsync({ id: selected.id, comment: note });
        }
      } else if (selected.kind === "rates") {
        if (decision === "approved") {
          await approveRateCardProposal(selected.id);
        } else {
          await rejectRateCardProposal(selected.id, note || "");
        }
        await rateCardsQuery.refetch();
      }
      setDecisionNote("");
      toast.success(
        decision === "approved"
          ? `Approved by ${user.name.split(" ")[0] || "reviewer"}`
          : "Returned with comments",
      );
      if (detailRoute) router.replace(CROPFORT_ROUTES.approvals);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decision failed");
    }
  };

  // One list of everything awaiting a decision: farm assessments (owner desk) + every queue
  const listTypes = useMemo(
    () => [
      ...(isSilva ? [{ id: "assessments" as const, label: "Farm assessments", icon: Leaf }] : []),
      ...APPROVAL_TYPES,
    ],
    [isSilva],
  );

  const allRows = useMemo(() => {
    const assessmentRows = submittedAssessments.map((a) => ({
      id: a.id,
      kind: "assessments" as const,
      title: a.title || "Farm assessment",
      meta: [a.farmName, a.cycleLabel].filter(Boolean).join(" · "),
      amount: null as number | null,
      risk: undefined as string | undefined,
      href: `${CROPFORT_ROUTES.farmAssessments}/${encodeURIComponent(a.id)}`,
    }));
    const queueRows = APPROVAL_TYPES.flatMap((t) =>
      queues[t.id].map((r) => ({
        ...r,
        amount: r.amount as number | null,
        href: `${CROPFORT_ROUTES.approvals}/review/${r.kind}/${encodeURIComponent(r.id)}`,
      })),
    );
    return [...assessmentRows, ...queueRows];
  }, [submittedAssessments, queues]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of allRows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    return counts;
  }, [allRows]);

  const visibleRows = listFilter === "all" ? allRows : allRows.filter((r) => r.kind === listFilter);

  // A filter whose queue emptied (e.g. after deciding the last item) falls back to "All"
  useEffect(() => {
    if (listFilter !== "all" && !countsByType[listFilter]) setListFilter("all");
  }, [listFilter, countsByType]);

  const listLoading =
    (isSilva && farmAssessmentsQuery.isLoading) ||
    (canDecideRateCards && rateCardsQuery.isLoading) ||
    afesQuery.isLoading ||
    afpPlansQuery.isLoading ||
    projectsQuery.isLoading ||
    interventionsQuery.isLoading ||
    monthlyQuery.isLoading ||
    weeklyQuery.isLoading ||
    reportsQuery.isLoading;

  const failedSources: { label: string; retry: () => Promise<unknown> }[] = [];
  if (isSilva && farmAssessmentsQuery.isError) {
    failedSources.push({ label: "farm assessments", retry: () => farmAssessmentsQuery.refetch() });
  }
  if (canDecideRateCards && rateCardsQuery.isError) {
    failedSources.push({ label: "rate cards", retry: () => rateCardsQuery.refetch() });
  }

  const detailLoading = {
    afe: afesQuery.isLoading,
    afp: afpPlansQuery.isLoading,
    projects: projectsQuery.isLoading,
    interventions: interventionsQuery.isLoading,
    monthly: monthlyQuery.isLoading,
    weekly: weeklyQuery.isLoading,
    rates: rateCardsQuery.isLoading,
    reports: reportsQuery.isLoading,
  }[tab];

  const waitingLabel = listLoading && allRows.length === 0
    ? "Checking for requests…"
    : `${allRows.length} ${allRows.length === 1 ? "request" : "requests"} waiting for ${canDecide ? "your decision" : "a decision"}`;

  return (
    <PageContainer className={cn(isSilva && "gap-5")}>
      {detailRoute ? (
        <header className="space-y-3">
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href={CROPFORT_ROUTES.approvals}>
              <ChevronRight className="mr-1 size-4 rotate-180" aria-hidden />
              Back to approvals
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {selected?.title || "Review request"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {APPROVAL_TYPES.find((t) => t.id === tab)?.label} · check the details, then approve or request changes.
            </p>
          </div>
        </header>
      ) : isSilva ? (
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Approvals</h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">{waitingLabel}</p>
        </header>
      ) : (
        <PageHeader
          eyebrow={activeProgram?.name || "Control"}
          title={area.label}
          description="Everything waiting for an asset-owner decision, in one list."
          breadcrumbs={[
            { label: "Home", href: CROPFORT_ROUTES.dashboard },
            { label: "Control" },
            { label: area.label },
          ]}
          meta={<span className="text-xs text-muted-foreground">{waitingLabel}</span>}
        />
      )}

      {!detailRoute && failedSources.length > 0 ? (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Couldn&apos;t load {failedSources.map((f) => f.label).join(" and ")} — the list may be incomplete.
          </p>
          <Button size="sm" variant="outline" onClick={() => failedSources.forEach((f) => void f.retry())}>
            Try again
          </Button>
        </div>
      ) : null}

      {!detailRoute ? (
        <SectionCard flush title="Awaiting your decision">
          {allRows.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3" role="group" aria-label="Filter by type">
              {[{ id: "all" as const, label: "All", icon: ClipboardList }, ...listTypes]
                .filter((t) => t.id === "all" || countsByType[t.id])
                .map((t) => {
                  const selectedChip = listFilter === t.id;
                  const count = t.id === "all" ? allRows.length : countsByType[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={selectedChip}
                      onClick={() => setListFilter(t.id)}
                      className={cn(
                        "cf-focus inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                        selectedChip
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {t.label}
                      <span className={cn("tabular-nums", selectedChip ? "text-primary-foreground/80" : "text-muted-foreground/80")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>
          ) : null}

          {allRows.length === 0 ? (
            listLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground" role="status">
                Checking for requests…
              </p>
            ) : (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-9 text-success" aria-hidden />
                <p className="font-medium">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">New submissions will appear here.</p>
              </div>
            )
          ) : (
            <ul className="divide-y divide-border">
              {visibleRows.map((row) => {
                const type = listTypes.find((t) => t.id === row.kind);
                const TypeIcon = type?.icon ?? ClipboardList;
                return (
                  <li key={`${row.kind}-${row.id}`}>
                    <Link
                      href={row.href}
                      className="cf-focus group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <TypeIcon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">{type?.label ?? "Request"}</span>
                          {row.meta ? <span className="truncate">{row.meta}</span> : null}
                          {row.risk ? (
                            <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                              {row.risk}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {row.amount != null ? (
                        <span className="cf-numeric hidden shrink-0 text-sm font-semibold tabular-nums sm:block">
                          {fmtEtb(row.amount)}
                        </span>
                      ) : null}
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
                        Review
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {selected ? (
            <SectionCard
              title={selected.title}
              description={selected.kind === "afp" ? undefined : "Confirm the facts below, then approve or return with a note."}
              action={<StatusBadge status="submitted" />}
            >
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="cf-numeric text-lg font-semibold">
                    {fmtEtb(selected.amount)}
                  </span>
                  {selected.risk ? (
                    <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      {selected.risk}
                    </span>
                  ) : null}
                  {selected.kind === "afe" && selectedAfe ? (
                    <span className="text-xs text-muted-foreground">
                      {bandAutoApproves(selectedAfe.band)
                        ? "Band can auto-route — still in Silva queue"
                        : "Requires explicit Silva / asset approval"}
                    </span>
                  ) : null}
                </div>

                {selectedAfe ? <AfeDetail afe={selectedAfe} /> : null}
                {selectedPromo && selectedAfpPlan ? (
                  <AfpDetail
                    plan={selectedAfpPlan}
                    promotion={selectedPromo}
                    activities={Object.values(selectedAfpPlan.activities)}
                    wanted={canDecide ? planWanted ?? undefined : undefined}
                    onToggleWanted={
                      canDecide
                        ? (id) =>
                            setWantedByPlan((prev) => {
                              const next = new Set(planWanted ?? []);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return { ...prev, [selectedAfpPlan.id]: next };
                            })
                        : undefined
                    }
                    onSetAllWanted={(all) =>
                      setWantedByPlan((prev) => ({
                        ...prev,
                        [selectedAfpPlan.id]: new Set(all ? planIncluded.map((a) => a.id) : []),
                      }))
                    }
                  />
                ) : null}
                {selectedProject ? <ProjectDetail project={selectedProject} /> : null}
                {selectedIntervention ? (
                  <InterventionDetail intervention={selectedIntervention} />
                ) : null}
                {selectedMonthly ? <MonthlyDetail order={selectedMonthly} /> : null}
                {selectedWeekly ? <WeeklyDetail plan={selectedWeekly} /> : null}
                {selectedReport ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DetailKV label="Period">{selectedReport.periodLabel}</DetailKV>
                      <DetailKV label="Plan">{fmtEtb(selectedReport.planEtb)}</DetailKV>
                      <DetailKV label="Actual">
                        {fmtEtb(selectedReport.actualEtb)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({selectedReport.variancePct > 0 ? "+" : ""}
                          {selectedReport.variancePct}%)
                        </span>
                      </DetailKV>
                    </div>
                    {selectedReport.summary ? (
                      <DetailKV label="Summary">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedReport.summary}</p>
                      </DetailKV>
                    ) : null}
                    {selectedReport.risks ? (
                      <DetailKV label="Risks">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedReport.risks}</p>
                      </DetailKV>
                    ) : null}
                    <Link
                      href={`${CROPFORT_ROUTES.reports}/${selectedReport.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open full report →
                    </Link>
                  </div>
                ) : null}
                {selectedRateCard ? (
                  <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailKV label="Activity">
                      {selectedRateCard.activityName || selectedRateCard.activityCode || "Rate card"}
                    </DetailKV>
                    <DetailKV label="Farm">
                      {selectedRateCard.farmEstateName || "—"}
                    </DetailKV>
                    <DetailKV label="Kind">
                      <span className="capitalize">{selectedRateCard.kind}</span>
                    </DetailKV>
                    <DetailKV label="Budget year">{selectedRateCard.budgetYear}</DetailKV>
                    <DetailKV label="Proposed rate">
                      <span className="cf-numeric font-medium">
                        {fmtEtb(selectedRateCard.proposedRate)}
                      </span>
                    </DetailKV>
                    <DetailKV label="Benchmark rate">
                      <span className="cf-numeric font-medium">
                        {fmtEtb(selectedRateCard.recommendedRate)}
                      </span>
                    </DetailKV>
                    <DetailKV label="Justification">
                      {selectedRateCard.justificationNote || "—"}
                    </DetailKV>
                    <DetailKV label="Submitted">
                      {selectedRateCard.submittedAt
                        ? new Date(selectedRateCard.submittedAt).toLocaleString()
                        : "—"}
                    </DetailKV>
                    <Link
                      href={`${CROPFORT_ROUTES.rateCardProposals}/${selectedRateCard.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open full rate card review →
                    </Link>
                  </div>
                ) : null}

                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-sm font-medium" htmlFor="approval-decision-note">
                    Note
                    <span className="ml-1 font-normal text-muted-foreground">
                      (needed to request changes)
                    </span>
                  </label>
                  <Textarea
                    id="approval-decision-note"
                    rows={3}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder={selected.kind === "afp" ? "Optional" : "What did you verify? If returning, what must change?"}
                    disabled={!canDecide}
                  />
                </div>

                {canDecide ? (
                  <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-card pt-3">
                    {selectedAfpPlan && planUnwanted.length > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const keep = planIncluded.filter((a) => planWanted?.has(a.id));
                          const note = [
                            `Asset owner wants ${keep.length} of ${planIncluded.length} activities.`,
                            `Please remove: ${planUnwanted.map((a) => `${a.activityCode} ${a.activityName}`).join("; ")}.`,
                            decisionNote.trim(),
                          ]
                            .filter(Boolean)
                            .join("\n");
                          void decideRow("returned", note);
                        }}
                      >
                        Send back with my selection ({planUnwanted.length} removed)
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setConfirmApprove(true)}>
                        Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decideRow("returned")}
                    >
                      Request changes
                    </Button>
                  </div>
                ) : (
                  <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                    Waiting for asset-owner decision. You can review the
                    detail but cannot approve from this desk.
                  </p>
                )}
              </div>
            </SectionCard>
          ) : (
            <SectionCard>
              <p className="py-5 text-center text-sm text-muted-foreground">
                {detailLoading
                  ? "Loading request details…"
                  : "This request is no longer awaiting a decision, or it could not be found."}
              </p>
            </SectionCard>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        destructive={false}
        title={`Approve ${selected?.title ?? "this request"}?`}
        description={
          selected
            ? `${APPROVAL_TYPES.find((t) => t.id === selected.kind)?.label ?? "Request"} · ${fmtEtb(selected.amount)}${decisionNote.trim() ? " · your note is sent with it" : ""}`
            : undefined
        }
        confirmLabel="Approve"
        onConfirm={async () => {
          setConfirmApprove(false);
          await decideRow("approved");
        }}
      />
    </PageContainer>
  );
}
