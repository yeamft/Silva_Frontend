"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
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
import {
  fmtEtb,
  type ApprovalKind,
  type AfeDoc,
  type Intervention,
  type Project,
  useCropfortOpsStore,
} from "@/store/cropfortOpsStore";
import {
  scheduleLabel,
  scheduleStatusOf,
  useCoreOpsPlanStore,
} from "@/store/coreOpsPlanStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { useSpendBandStore } from "@/store/spendBandStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";
import type { AfpPromotion, CoreOpsActivity, CoreOpsPlan } from "@/types/core-ops";
import type { MonthlyWorkOrder, WeeklyPlan } from "@/types/agronomic-cycle";

type Tab = "project" | "intervention" | "afe" | "afp" | "monthly" | "weekly";

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

function ProjectDetail({
  project,
  blockName,
}: {
  project: Project;
  blockName: string;
}) {
  const done = project.milestones.filter((m) => m.done).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Code">{project.code}</DetailKV>
        <DetailKV label="Band">
          <span className="font-medium">Band {project.band}</span>
        </DetailKV>
        <DetailKV label="Budget">
          <span className="cf-numeric font-medium">{fmtEtb(project.budgetEtb)}</span>
        </DetailKV>
        <DetailKV label="Block / area">{blockName || "—"}</DetailKV>
        <DetailKV label="Vendor">{project.vendor || "—"}</DetailKV>
        <DetailKV label="Milestones">
          {done}/{project.milestones.length} complete
        </DetailKV>
      </div>
      {project.notes ? (
        <DetailKV label="Submission notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.notes}</p>
        </DetailKV>
      ) : null}
      {project.milestones.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Scope milestones
          </p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {project.milestones.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>{m.title}</span>
                <StatusBadge status={m.done ? "complete" : "planned"} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ReviewGate
        items={[
          { ok: project.budgetEtb > 0, label: "Budget amount is stated" },
          { ok: Boolean(project.vendor), label: "Vendor assigned" },
          { ok: Boolean(project.blockId), label: "Block / farm area linked" },
          {
            ok: project.milestones.length > 0,
            label:
              project.milestones.length > 0
                ? "Scope milestones listed for delivery tracking"
                : "No milestones listed — confirm scope is clear",
          },
        ]}
      />
    </div>
  );
}

function InterventionDetail({
  item,
  blockName,
}: {
  item: Intervention;
  blockName: string;
}) {
  const done = item.steps.filter((s) => s.done).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="Code">{item.code}</DetailKV>
        <DetailKV label="Cost">
          <span className="cf-numeric font-medium">{fmtEtb(item.costEtb)}</span>
        </DetailKV>
        <DetailKV label="Block / area">{blockName || "—"}</DetailKV>
        <DetailKV label="Vendor">{item.vendor || "—"}</DetailKV>
        <DetailKV label="Steps">
          {done}/{item.steps.length} complete
        </DetailKV>
      </div>
      {item.steps.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {item.steps.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>{s.title}</span>
              <StatusBadge status={s.done ? "complete" : "planned"} />
            </li>
          ))}
        </ul>
      ) : null}
      <ReviewGate
        items={[
          { ok: item.costEtb > 0, label: "Intervention cost is stated" },
          { ok: Boolean(item.vendor), label: "Vendor assigned" },
          { ok: item.steps.length > 0, label: "Work steps defined" },
        ]}
      />
    </div>
  );
}

function AfeDetail({
  afe,
  blockName,
  sourceLabel,
}: {
  afe: AfeDoc;
  blockName: string;
  sourceLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailKV label="AFE code">{afe.code}</DetailKV>
        <DetailKV label="Band">
          <span className="font-medium">Band {afe.band}</span>
        </DetailKV>
        <DetailKV label="Amount">
          <span className="cf-numeric font-medium">{fmtEtb(afe.amountEtb)}</span>
        </DetailKV>
        <DetailKV label="Source">{sourceLabel}</DetailKV>
        <DetailKV label="Block / area">{blockName || "—"}</DetailKV>
        <DetailKV label="Title">{afe.title}</DetailKV>
      </div>
      <ReviewGate
        items={[
          { ok: afe.amountEtb > 0, label: "Authority amount is stated" },
          { ok: Boolean(afe.sourceId), label: "Linked to a programme source" },
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
  const projects = useCropfortOpsStore((s) => s.projects);
  const interventions = useCropfortOpsStore((s) => s.interventions);
  const afes = useCropfortOpsStore((s) => s.afes);
  const nodes = useCropfortOpsStore((s) => s.nodes);
  const decide = useCropfortOpsStore((s) => s.decide);
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const decidePromotion = useCoreOpsPlanStore((s) => s.decidePromotion);
  const monthlyOrders = useMonthlyWorkOrderStore((s) => s.orders);
  const decideMonthly = useMonthlyWorkOrderStore((s) => s.decide);
  const weeklyPlans = useWeeklyPlanStore((s) => s.plans);
  const decideWeekly = useWeeklyPlanStore((s) => s.decide);
  const bandAutoApproves = useSpendBandStore((s) => s.bandAutoApproves);

  const [tab, setTab] = useState<Tab>("project");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    setDecisionNote("");
  }, [selectedId, tab]);

  const blockName = (id: string) => nodes.find((n) => n.id === id)?.name || id;

  const queues = useMemo(() => {
    const project: QueueRow[] = projects
      .filter((p) => p.status === "submitted")
      .map((p) => ({
        id: p.id,
        kind: "project" as const,
        title: p.title,
        meta: `${p.code} · ${blockName(p.blockId)} · ${p.vendor || "No vendor"}`,
        amount: p.budgetEtb,
        risk: p.band === "C" || p.band === "D" ? `Band ${p.band}` : undefined,
      }));
    const intervention: QueueRow[] = interventions
      .filter((p) => p.status === "submitted")
      .map((p) => ({
        id: p.id,
        kind: "intervention" as const,
        title: p.title,
        meta: `${p.code} · ${blockName(p.blockId)}`,
        amount: p.costEtb,
      }));
    const afe: QueueRow[] = afes
      .filter((p) => p.status === "submitted")
      .map((p) => ({
        id: p.id,
        kind: "afe" as const,
        title: p.title,
        meta: `${p.code} · Band ${p.band} · ${p.sourceType}`,
        amount: p.amountEtb,
        risk: p.band === "C" || p.band === "D" ? `Band ${p.band} gate` : undefined,
      }));
    const afp: QueueRow[] = (plan?.promotions ?? [])
      .filter((p) => p.status === "pending_silva")
      .map((p) => ({
        id: p.id,
        kind: "afp" as const,
        title: plan?.farmName ? `${plan.farmName} AFP` : "AFP",
        meta: `${plan?.budgetYearLabel ?? ""} · Band ${p.band} · ${Object.values(plan?.activities ?? {}).filter((a) => a.included).length} lines`,
        amount: p.totalEtb,
        risk: `Band ${p.band} · Silva`,
      }));
    const monthly: QueueRow[] = monthlyOrders
      .filter((o) => o.status === "submitted")
      .map((o) => {
        const out = o.lines.filter((l) => !l.inPlan).length;
        return {
          id: o.id,
          kind: "monthly" as const,
          title: o.code,
          meta: `${o.farmName} · ${PLAN_MONTH_LABELS[o.ethiopianMonth]} · ${o.lines.length} lines`,
          amount: o.totalEtb,
          risk: out > 0 ? `${out} out-of-plan` : undefined,
        };
      });
    const weekly: QueueRow[] = weeklyPlans
      .filter((p) => p.status === "submitted")
      .map((p) => ({
        id: p.id,
        kind: "weekly" as const,
        title: p.code,
        meta: `${p.weekLabel} · ${p.lines.length} lines`,
        amount: p.lines.reduce((s, l) => s + l.etb, 0),
      }));
    return { project, intervention, afe, afp, monthly, weekly };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blockName uses nodes
  }, [projects, interventions, afes, plan, monthlyOrders, weeklyPlans, nodes]);

  const rows = queues[tab];
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  const selectedProject =
    selected?.kind === "project" ? projects.find((p) => p.id === selected.id) : null;
  const selectedIntervention =
    selected?.kind === "intervention"
      ? interventions.find((p) => p.id === selected.id)
      : null;
  const selectedAfe =
    selected?.kind === "afe" ? afes.find((p) => p.id === selected.id) : null;
  const selectedPromo =
    selected?.kind === "afp"
      ? plan?.promotions.find((p) => p.id === selected.id) ?? null
      : null;
  const selectedMonthly =
    selected?.kind === "monthly"
      ? monthlyOrders.find((o) => o.id === selected.id) ?? null
      : null;
  const selectedWeekly =
    selected?.kind === "weekly"
      ? weeklyPlans.find((p) => p.id === selected.id) ?? null
      : null;

  const afeSourceLabel = selectedAfe
    ? (() => {
        if (selectedAfe.sourceType === "project") {
          const src = projects.find((p) => p.id === selectedAfe.sourceId);
          return src ? `Project · ${src.code} · ${src.title}` : "Project source";
        }
        if (selectedAfe.sourceType === "intervention") {
          const src = interventions.find((p) => p.id === selectedAfe.sourceId);
          return src ? `Intervention · ${src.code} · ${src.title}` : "Intervention source";
        }
        return "AFP programme source";
      })()
    : "";

  const decideRow = (decision: "approved" | "returned") => {
    if (!selected) return;
    if (decision === "returned" && !decisionNote.trim()) {
      toast.error("Add a return reason so the submitter knows what to fix");
      return;
    }
    const note = decisionNote.trim() || undefined;
    if (selected.kind === "afp") {
      decidePromotion(selected.id, decision, note);
    } else if (selected.kind === "monthly") {
      decideMonthly(selected.id, decision, note);
    } else if (selected.kind === "weekly") {
      decideWeekly(selected.id, decision, note);
    } else {
      decide(selected.kind as ApprovalKind, selected.id, decision, note);
    }
    setSelectedId(null);
    setDecisionNote("");
    toast.success(
      decision === "approved"
        ? `Approved by ${user.name.split(" ")[0] || "reviewer"}`
        : "Returned with comments",
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "project", label: "Projects" },
    { id: "intervention", label: "Interventions" },
    { id: "afe", label: "AFEs" },
    { id: "afp", label: "AFPs" },
    { id: "monthly", label: "Monthly WOs" },
    { id: "weekly", label: "Weekly plans" },
  ];

  const waitingTotal = tabs.reduce((s, t) => s + queues[t.id].length, 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Control"}
        title={area.label}
        description="Review scope, cost, and risk before Silva or asset-owner approval."
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

                {selectedProject ? (
                  <ProjectDetail
                    project={selectedProject}
                    blockName={blockName(selectedProject.blockId)}
                  />
                ) : null}
                {selectedIntervention ? (
                  <InterventionDetail
                    item={selectedIntervention}
                    blockName={blockName(selectedIntervention.blockId)}
                  />
                ) : null}
                {selectedAfe ? (
                  <AfeDetail
                    afe={selectedAfe}
                    blockName={blockName(selectedAfe.blockId)}
                    sourceLabel={afeSourceLabel}
                  />
                ) : null}
                {selectedPromo && plan ? (
                  <AfpDetail
                    plan={plan}
                    promotion={selectedPromo}
                    activities={Object.values(plan.activities)}
                  />
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
                  />
                </div>

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
