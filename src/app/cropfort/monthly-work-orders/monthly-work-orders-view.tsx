"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  PLAN_MONTHS,
  PLAN_MONTH_LABELS,
  type PlanMonth,
} from "@/lib/cropfort/ethiopian-year";
import {
  canApproveOutOfPlan,
  canEditPlanScope,
} from "@/lib/cropfort/platform-access";
import { fmtEtb } from "@/store/cropfortOpsStore";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import type { MonthlyWoStatus } from "@/types/agronomic-cycle";

const STATUS_ORDER: MonthlyWoStatus[] = [
  "draft",
  "submitted",
  "approved",
  "returned",
  "active",
];

export default function MonthlyWorkOrdersView() {
  const { activeProgram, user } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const orders = useMonthlyWorkOrderStore((s) => s.orders);
  const createFromPlan = useMonthlyWorkOrderStore((s) => s.createFromPlan);
  const submit = useMonthlyWorkOrderStore((s) => s.submit);
  const decide = useMonthlyWorkOrderStore((s) => s.decide);
  const activate = useMonthlyWorkOrderStore((s) => s.activate);
  const addOutOfPlanLine = useMonthlyWorkOrderStore((s) => s.addOutOfPlanLine);
  const schedule7Blocking = useAgreementConfigStore((s) => s.schedule7Blocking);

  const [month, setMonth] = useState<PlanMonth>("sep");
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null);
  const [outReason, setOutReason] = useState("");
  const [outName, setOutName] = useState("");
  const [outQty, setOutQty] = useState("1");
  const [outEtb, setOutEtb] = useState("5000");

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  );

  const canEdit = canEditPlanScope(user.role);
  const canApprove = canApproveOutOfPlan(user.role);
  const hasOutOfPlan = selected?.lines.some((l) => !l.inPlan) ?? false;
  /** In-plan-only MWOs: SPX may activate; out-of-plan needs Silva approve first. */
  const canActivateScope = canEdit || canApprove;

  const onCreate = () => {
    if (!canEdit) {
      toast.error("Only SPX can create monthly work orders from the plan");
      return;
    }
    if (!plan) {
      toast.error("Open Core Operations and create a plan first");
      return;
    }
    try {
      const row = createFromPlan({
        planId: plan.id,
        month,
        programId: activeProgram?.id,
      });
      setSelectedId(row.id);
      toast.success(`Created ${row.code} from ${PLAN_MONTH_LABELS[month]} calendar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create monthly WO");
    }
  };

  const onAddOutOfPlan = () => {
    if (!canEdit) {
      toast.error("Only SPX can add out-of-plan lines");
      return;
    }
    if (!selected) return;
    try {
      addOutOfPlanLine(
        selected.id,
        {
          activityId: "act-oop",
          activityCode: "OOP",
          activityName: outName.trim() || "Out-of-plan activity",
          blockId: selected.lines[0]?.blockId ?? "blk-sh01",
          blockCode: selected.lines[0]?.blockCode ?? "SH-01",
          plannedQty: Number(outQty) || 1,
          unit: "ha",
          etb: Number(outEtb) || 0,
          manualsRef: "",
        },
        outReason,
      );
      setOutName("");
      setOutReason("");
      toast.success("Out-of-plan line added — Silva approval required");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add line");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Plan"}
        title="Monthly Work Orders"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Monthly Work Orders" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Month</Label>
          <Select value={month} onValueChange={(v) => setMonth(v as PlanMonth)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {PLAN_MONTH_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreate} disabled={!canEdit}>
          Create from Core Ops
        </Button>
        {plan ? (
          <p className="text-xs text-muted-foreground">
            Source: {plan.farmName} · {plan.budgetYearLabel} · {plan.status}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No Core Ops plan loaded</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <SectionCard title="Register">
          <ul className="space-y-1">
            {STATUS_ORDER.map((status) => {
              const group = orders.filter((o) => o.status === status);
              if (!group.length) return null;
              return (
                <li key={status} className="space-y-1">
                  <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {status.replace("_", " ")}
                  </p>
                  {group.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                        selected?.id === o.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                      }`}
                    >
                      <span>
                        <span className="font-medium">{o.code}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {PLAN_MONTH_LABELS[o.ethiopianMonth]}
                        </span>
                      </span>
                      <StatusBadge status={o.status} />
                    </button>
                  ))}
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {selected ? (
          <SectionCard
            title={selected.code}
            description={`${selected.farmName} · ${PLAN_MONTH_LABELS[selected.ethiopianMonth]} · ${fmtEtb(selected.totalEtb)}`}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              {selected.loop !== "none" ? (
                <StatusBadge status="at_risk" label={`Loop ${selected.loop.split("_")[0]}`} />
              ) : null}
              {(selected.status === "draft" || selected.status === "returned") && canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    const blocking = schedule7Blocking();
                    if (blocking.length) {
                      toast.error(
                        `Dependency register incomplete: ${blocking.map((b) => b.label).join(", ")}`,
                      );
                      return;
                    }
                    submit(selected.id);
                    toast.success(
                      hasOutOfPlan
                        ? "Submitted to Silva (out-of-plan items)"
                        : "Submitted — inform Silva",
                    );
                  }}
                >
                  Submit
                </Button>
              )}
              {selected.status === "submitted" && canApprove && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      decide(selected.id, "approved");
                      toast.success("Approved by Silva");
                    }}
                  >
                    Approve (Silva)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      decide(selected.id, "returned", "Returned for revision");
                      toast.message("Returned");
                    }}
                  >
                    Return
                  </Button>
                </>
              )}
              {(selected.status === "approved" ||
                (selected.status === "submitted" &&
                  selected.lines.every((l) => l.inPlan) &&
                  canEdit)) &&
                canActivateScope && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    try {
                      activate(selected.id);
                      toast.success("Monthly WO active");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Activate failed");
                    }
                  }}
                >
                  Activate
                </Button>
              )}
            </div>

            {selected.lastMonthInsights ? (
              <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last month insights
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {selected.lastMonthInsights}
                </p>
              </div>
            ) : null}

            {selected.outOfPlanReason ? (
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
                Out-of-plan (Silva): {selected.outOfPlanReason}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Activity</th>
                    <th className="px-3 py-2">Block</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Manual</th>
                    <th className="px-3 py-2">ETB</th>
                    <th className="px-3 py-2">In plan</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-medium">{l.activityName}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{l.activityCode}</span>
                      </td>
                      <td className="px-3 py-2">{l.blockCode}</td>
                      <td className="px-3 py-2 cf-numeric">
                        {l.plannedQty} {l.unit}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.manualsRef || "—"}
                      </td>
                      <td className="px-3 py-2 cf-numeric">{fmtEtb(l.etb)}</td>
                      <td className="px-3 py-2">
                        {l.inPlan ? (
                          <StatusBadge status="approved" label="Yes" />
                        ) : (
                          <StatusBadge status="at_risk" label="Silva" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(selected.status === "draft" || selected.status === "returned") && canEdit && (
              <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-medium">Add out-of-plan line (Silva approval)</p>
                <div className="space-y-1">
                  <Label>Activity name</Label>
                  <Input value={outName} onChange={(e) => setOutName(e.target.value)} placeholder="e.g. Emergency drainage" />
                </div>
                <div className="space-y-1">
                  <Label>Qty / ETB</Label>
                  <div className="flex gap-2">
                    <Input value={outQty} onChange={(e) => setOutQty(e.target.value)} className="w-20" />
                    <Input value={outEtb} onChange={(e) => setOutEtb(e.target.value)} />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>Reason</Label>
                  <Textarea value={outReason} onChange={(e) => setOutReason(e.target.value)} rows={2} />
                </div>
                <Button size="sm" variant="outline" onClick={onAddOutOfPlan}>
                  Add out-of-plan line
                </Button>
              </div>
            )}
          </SectionCard>
        ) : (
          <SectionCard title="No monthly WO">
            <p className="text-sm text-muted-foreground">
              Create one from the Core Operations calendar for a month with scheduled intensities.
            </p>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
