"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
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
import { PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
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
import { fmtEtb } from "@/store/cropfortOpsStore";
import { scheduleLabel, scheduleStatusOf } from "@/store/coreOpsPlanStore";
import { useSpendBandStore } from "@/store/spendBandStore";
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

type Tab = "afe" | "afp" | "projects" | "interventions" | "monthly" | "weekly";

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
        <DetailKV label="Programme total">
          <span className="cf-numeric font-medium">{fmtEtb(promotion.totalEtb)}</span>
        </DetailKV>
        <DetailKV label="Included lines">
          {included.length.toLocaleString()} activities
        </DetailKV>
        <DetailKV label="Scheduled">
          {scheduled}/{included.length}
        </DetailKV>
        <DetailKV label="Vendor">{plan.vendorLabel || "—"}</DetailKV>
        <DetailKV label="Submitted">
          {new Date(promotion.createdAt).toLocaleString()}
        </DetailKV>
      </div>

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
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Included activity lines ({included.length})
          </p>
          <div className="cf-table-scroll max-h-64 rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead className="hidden sm:table-cell">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="hidden md:table-cell">Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {included.slice(0, 40).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{a.activityName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {a.activityCode} · {a.category}
                      </p>
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-sm sm:table-cell">
                      {a.plannedQty || "—"} {a.uom}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtEtb(a.plannedCost)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {scheduleStatusOf(a) === "scheduled" ? scheduleLabel(a) : "Not set"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {included.length > 40 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Showing first 40 of {included.length} lines.
            </p>
          ) : null}
        </div>
      ) : null}

      <ReviewGate
        items={[
          { ok: included.length > 0, label: "Programme has included activity lines" },
          { ok: missingQty === 0, label: missingQty === 0 ? "All included lines have quantity" : `${missingQty} lines missing quantity` },
          { ok: missingRate === 0, label: missingRate === 0 ? "All included lines have approved rates" : `${missingRate} lines missing rates` },
          {
            ok: scheduled === included.length && included.length > 0,
            label:
              scheduled === included.length && included.length > 0
                ? "All included lines are scheduled"
                : `${included.length - scheduled} lines not scheduled`,
          },
          {
            ok: promotion.band === "C" || promotion.band === "D",
            label: `Spend band ${promotion.band} — Silva decision required`,
          },
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

export default function ApprovalsView() {
  const { user, activeProgram } = useCropfortAuth();
  const area = getCropfortArea("approvals");
  const canDecide = canApproveOperations(user.role);
  const afesQuery = useAfes(Boolean(activeProgram?.id), "submitted");
  const decideAfe = useDecideAfe();
  const afes = afesQuery.data || [];
  const weeklyQuery = useWeeklyPlans(Boolean(activeProgram?.id), "submitted");
  const decideWeeklyMut = useDecideWeeklyPlan();
  const weeklyPlans = weeklyQuery.data || [];
  const monthlyQuery = useMonthlyWorkOrders(Boolean(activeProgram?.id), "submitted");
  const decideMonthlyMut = useDecideMonthlyWorkOrder();
  const monthlyOrders = monthlyQuery.data || [];
  const afpPlansQuery = useProgrammePlans(Boolean(activeProgram?.id), {
    status: "submitted",
  });
  const decideAfpMut = useDecideProgrammePlan();
  const afpPlans = afpPlansQuery.data || [];
  const projectsQuery = useProjects(Boolean(activeProgram?.id), "submitted");
  const decideProjectMut = useDecideProject();
  const projects = projectsQuery.data || [];
  const interventionsQuery = useInterventions(Boolean(activeProgram?.id), "submitted");
  const decideInterventionMut = useDecideIntervention();
  const interventions = interventionsQuery.data || [];
  const bandAutoApproves = useSpendBandStore((s) => s.bandAutoApproves);

  const [tab, setTab] = useState<Tab>("afe");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

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
        title: p.farmName ? `${p.farmName} AFP` : "AFP",
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
    return {
      afe,
      afp,
      projects: projectsQ,
      interventions: interventionsQ,
      monthly,
      weekly,
    };
  }, [afes, afpPlans, projects, interventions, monthlyOrders, weeklyPlans]);

  const rows = queues[tab];
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

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
      }
      setSelectedId(null);
      setDecisionNote("");
      toast.success(
        decision === "approved"
          ? `Approved by ${user.name.split(" ")[0] || "reviewer"}`
          : "Returned with comments",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decision failed");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "afe", label: "AFEs" },
    { id: "afp", label: "AFPs" },
    { id: "projects", label: "Projects" },
    { id: "interventions", label: "Interventions" },
    { id: "monthly", label: "Monthly WOs" },
    { id: "weekly", label: "Weekly plans" },
  ];

  const waitingTotal = tabs.reduce((s, t) => s + queues[t.id].length, 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Control"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Control" },
          { label: area.label },
        ]}
        meta={
          <span className="text-xs text-muted-foreground">
            {waitingTotal} awaiting decision
          </span>
        }
      />

      <nav aria-label="Approval queues" className="cf-tab-scroll -mx-1 border-b border-border px-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          const count = queues[t.id].length;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => {
                setTab(t.id);
                setSelectedId(null);
              }}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium touch-manipulation transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {count > 0 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-foreground">
                  {count}
                </span>
              ) : null}
              {active ? (
                <span
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <SectionCard>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing waiting in this queue.
          </p>
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <SectionCard title="Awaiting your decision" flush>
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const active = selected?.id === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                        active && "bg-accent/50",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-medium leading-snug">{row.title}</span>
                        <span className="cf-numeric shrink-0 text-xs font-medium">
                          {fmtEtb(row.amount)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{row.meta}</span>
                      <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <StatusBadge status="submitted" />
                        {row.risk ? (
                          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                            {row.risk}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard
            title={selected?.title ?? "Decision detail"}
            description={
              selected
                ? "Confirm the facts below, then approve or return with a note."
                : undefined
            }
            action={selected ? <StatusBadge status="submitted" /> : null}
          >
            {selected ? (
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
                    <Button size="sm" onClick={() => decideRow("approved")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decideRow("returned")}
                    >
                      Return
                    </Button>
                  </div>
                ) : (
                  <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                    Waiting for Silva / asset-owner decision. You can review the
                    detail but cannot approve from this desk.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an item to review.</p>
            )}
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}
