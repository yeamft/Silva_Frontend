"use client";

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
  CircleDollarSign,
  ClipboardList,
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
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";
import { canApproveOperations } from "@/lib/cropfort/platform-access";
import { canApproveAsAssetOwner } from "@/lib/cropfortAccess";
import { fmtEtb } from "@/store/cropfortOpsStore";
import { scheduleStatusOf } from "@/store/coreOpsPlanStore";
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

export type Tab = "afe" | "afp" | "projects" | "interventions" | "monthly" | "weekly" | "rates";

const APPROVAL_TYPES: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "afp", label: "Core Operations plans", icon: Sprout },
  { id: "afe", label: "Spending requests", icon: CircleDollarSign },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "interventions", label: "Interventions", icon: ClipboardList },
  { id: "monthly", label: "Monthly work orders", icon: CalendarDays },
  { id: "weekly", label: "Weekly plans", icon: CalendarCheck2 },
  { id: "rates", label: "Rate cards", icon: WalletCards },
];


function ProjectDetail({ project }: { project: ProjectDto }) {
  const done = project.milestones.filter((m) => m.done).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Code">
          <span className="font-mono text-xs">{project.code}</span>
        </DetailKV>
        <DetailKV label="Band">
          <span className="font-medium">Band {project.band}</span>
        </DetailKV>
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
        <DetailKV label="Band">
          <span className="font-medium">Band {intervention.band}</span>
        </DetailKV>
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
        <DetailKV label="Band">
          <span className="font-medium">Band {afe.band}</span>
        </DetailKV>
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
          {
            ok: afe.band === "C" || afe.band === "D",
            label:
              afe.band === "C" || afe.band === "D"
                ? "Band requires Silva / asset-owner gate"
                : `Band ${afe.band} — confirm routing is correct`,
          },
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

function AfpDetail({
  plan,
  promotion,
  activities,
}: {
  plan: CoreOpsPlan;
  promotion: AfpPromotion;
  activities: CoreOpsActivity[];
}) {
  const included = activities.filter((a) => a.included);
  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; cost: number }>();
    for (const a of included) {
      const prev = map.get(a.category) ?? { count: 0, cost: 0 };
      map.set(a.category, {
        count: prev.count + 1,
        cost: prev.cost + a.plannedCost,
      });
    }
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost);
  }, [included]);

  const scheduled = included.filter((a) => scheduleStatusOf(a) === "scheduled").length;
  const missingQty = included.filter((a) => a.plannedQty <= 0).length;
  const missingRate = included.filter((a) => !a.agreedRate).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Estate / farm">{plan.farmName}</DetailKV>
        <DetailKV label="Budget year">{plan.budgetYearLabel}</DetailKV>
        <DetailKV label="Band">
          <span className="font-medium">Band {promotion.band}</span>
        </DetailKV>
        <DetailKV label="Core Operations total">
          <span className="cf-numeric font-medium">{fmtEtb(promotion.totalEtb)}</span>
        </DetailKV>
        <DetailKV label="Included lines">
          {included.length.toLocaleString()} activities
        </DetailKV>
        <DetailKV label="Scheduled">
          {scheduled}/{included.length}
        </DetailKV>
        <DetailKV label="Vendor">{plan.vendorLabel || "—"}</DetailKV>
        <DetailKV label="Area">
          {plan.totalHa ? `${plan.totalHa.toLocaleString()} ha` : "—"}
          {plan.applicableBlockIds?.length
            ? ` · ${plan.applicableBlockIds.length} block${plan.applicableBlockIds.length === 1 ? "" : "s"}`
            : ""}
        </DetailKV>
        <DetailKV label="Submitted">
          {new Date(promotion.createdAt).toLocaleString()}
        </DetailKV>
      </div>

      {plan.description ? (
        <DetailKV label="Description">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.description}</p>
        </DetailKV>
      ) : null}

      {plan.notes ? (
        <DetailKV label="Plan notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.notes}</p>
        </DetailKV>
      ) : null}

      {promotion.note ? (
        <DetailKV label="Promotion note">
          <p className="text-sm leading-relaxed">{promotion.note}</p>
        </DetailKV>
      ) : null}

      {byCategory.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Cost by category
          </p>
          <div className="cf-table-scroll rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCategory.map(([cat, row]) => (
                  <TableRow key={cat}>
                    <TableCell className="font-medium">{cat}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEtb(row.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {included.length > 0 ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Activities and schedule ({included.length})
            </p>
            <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {(["peak", "active", "light"] as const).map((level) => (
                <span key={level} className="flex items-center gap-1 capitalize">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", INTENSITY_CELL[level])} aria-hidden />
                  {level}
                </span>
              ))}
            </span>
          </div>
          <div className="cf-table-scroll max-h-[28rem] rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
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
                {included.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{a.activityName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-mono">{a.activityCode}</span> · {a.category}
                        {a.blockAllocations?.length
                          ? ` · ${a.blockAllocations.length} block${a.blockAllocations.length === 1 ? "" : "s"}`
                          : a.scope === "off_block"
                            ? " · off-block"
                            : ""}
                        {a.manualsRef ? " · manual attached" : ""}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                      {a.plannedQty ? a.plannedQty.toLocaleString() : "—"}{" "}
                      <span className="text-xs text-muted-foreground">{a.uom}</span>
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
                            title={`${PLAN_MONTH_LABELS[m]}: ${level === "none" ? "not scheduled" : level}`}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <ReviewGate
        items={[
          { ok: included.length > 0, label: "Core Operations plan has included activity lines" },
          { ok: missingQty === 0, label: missingQty === 0 ? "All included lines have quantity" : `${missingQty} lines missing quantity` },
          { ok: missingRate === 0, label: missingRate === 0 ? "All included lines have approved rates" : `${missingRate} lines missing rates` },
          {
            ok: scheduled === included.length && included.length > 0,
            label:
              scheduled === included.length && included.length > 0
                ? "All included lines are scheduled"
                : `${included.length - scheduled} lines not scheduled`,
          },
          { ok: true, label: `Spend band ${promotion.band} — asset owner decision (no AFE needed)` },
        ]}
      />
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
    enabled: canDecideRateCards && Boolean(activeProgram?.id),
    refetchInterval: 10_000,
  });
  const pendingRateCards = useMemo(() => rateCardsQuery.data ?? [], [rateCardsQuery.data]);
  const afesQuery = useAfes(Boolean(activeProgram?.id), "submitted");
  const decideAfe = useDecideAfe();
  const afes = useMemo(() => afesQuery.data || [], [afesQuery.data]);
  const weeklyQuery = useWeeklyPlans(Boolean(activeProgram?.id), "submitted");
  const decideWeeklyMut = useDecideWeeklyPlan();
  const weeklyPlans = useMemo(() => weeklyQuery.data || [], [weeklyQuery.data]);
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
      meta: `${p.id.slice(0, 10)} · Band ${p.band} · ${p.sourceType}`,
      amount: p.amountEtb,
      risk: p.band === "C" || p.band === "D" ? `Band ${p.band} gate` : undefined,
    }));
    const afp: QueueRow[] = afpPlans.map((p) => {
      const included = Object.values(p.activities ?? {}).filter((a) => a.included).length;
      const band = p.resolvedBand || "?";
      return {
        id: p.id,
        kind: "afp" as const,
        title: p.name || (p.farmName ? `${p.farmName} Core Operations plan` : "Core Operations plan"),
        meta: `${p.budgetYearLabel ?? ""} · Band ${band} · ${included} lines`,
        amount: p.plannedCostEtb ?? 0,
        risk: `Band ${band} · Silva`,
      };
    });
    const projectsQ: QueueRow[] = projects.map((p) => ({
      id: p.id,
      kind: "projects" as const,
      title: p.title,
      meta: `${p.code} · Band ${p.band} · ${p.blockCode || p.blockId}`,
      amount: p.budgetEtb,
      risk: p.band === "C" || p.band === "D" ? `Band ${p.band}` : undefined,
    }));
    const interventionsQ: QueueRow[] = interventions.map((i) => ({
      id: i.id,
      kind: "interventions" as const,
      title: i.title,
      meta: `${i.code} · Band ${i.band} · ${i.blockCode || i.blockId}`,
      amount: i.costEtb,
      risk: i.band === "C" || i.band === "D" ? `Band ${i.band}` : undefined,
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
    return {
      afe,
      afp,
      projects: projectsQ,
      interventions: interventionsQ,
      monthly,
      weekly,
      rates,
    };
  }, [afes, afpPlans, projects, interventions, monthlyOrders, weeklyPlans, pendingRateCards]);

  const rows = queues[tab];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const selectedAfe =
    selected?.kind === "afe" ? afes.find((p) => p.id === selected.id) : null;
  const selectedAfpPlan =
    selected?.kind === "afp" ? afpPlans.find((p) => p.id === selected.id) ?? null : null;
  const selectedPromo = selectedAfpPlan ? afpPromotionFromPlan(selectedAfpPlan) : null;
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
  const selectedRateCard =
    selected?.kind === "rates"
      ? pendingRateCards.find((card) => card.id === selected.id) ?? null
      : null;

  const decideRow = async (decision: "approved" | "returned") => {
    if (!selected) return;
    if (!canDecide) {
      toast.error("Only Silva / asset owners can approve or return");
      return;
    }
    if (decision === "returned" && !decisionNote.trim()) {
      toast.error("Add a return reason so the submitter knows what to fix");
      return;
    }
    const note = decisionNote.trim() || undefined;
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
    weeklyQuery.isLoading;

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
              description="Confirm the facts below, then approve or return with a note."
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
                  />
                ) : null}
                {selectedProject ? <ProjectDetail project={selectedProject} /> : null}
                {selectedIntervention ? (
                  <InterventionDetail intervention={selectedIntervention} />
                ) : null}
                {selectedMonthly ? <MonthlyDetail order={selectedMonthly} /> : null}
                {selectedWeekly ? <WeeklyDetail plan={selectedWeekly} /> : null}
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
                    Decision note
                    <span className="ml-1 font-normal text-muted-foreground">
                      (required to return)
                    </span>
                  </label>
                  <Textarea
                    id="approval-decision-note"
                    rows={3}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="What did you verify? If returning, what must change?"
                    disabled={!canDecide}
                  />
                </div>

                {canDecide ? (
                  <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-card pt-3">
                    <Button size="sm" onClick={() => setConfirmApprove(true)}>
                      Approve
                    </Button>
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
