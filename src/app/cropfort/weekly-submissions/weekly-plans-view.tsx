"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import {
  OpsDeskControlPanel,
  OpsDeskDetail,
  OpsDeskHeader,
  OpsDeskMeta,
  OpsDeskPage,
  OpsDeskRegisterItem,
  OpsDeskSplit,
} from "@/components/cropfort/ops-desk";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canEditPlanScope,
  canReviewWeeklyPlan,
} from "@/lib/cropfort/platform-access";
import { fmtEtb } from "@/store/cropfortOpsStore";
import { useDirectInstructionStore } from "@/store/directInstructionStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";

export default function WeeklyPlansView() {
  const { activeProgram, user } = useCropfortAuth();
  const monthlyOrders = useMonthlyWorkOrderStore((s) => s.orders);
  const plans = useWeeklyPlanStore((s) => s.plans);
  const createFromMonthly = useWeeklyPlanStore((s) => s.createFromMonthly);
  const submit = useWeeklyPlanStore((s) => s.submit);
  const decide = useWeeklyPlanStore((s) => s.decide);
  const activateAndBridge = useWeeklyPlanStore((s) => s.activateAndBridge);
  const setLoop = useWeeklyPlanStore((s) => s.setLoop);

  const activeMonthly = useMemo(
    () => monthlyOrders.filter((o) => o.status === "active" || o.status === "approved"),
    [monthlyOrders],
  );
  const [monthlyId, setMonthlyId] = useState(activeMonthly[0]?.id ?? "");
  const [weekLabel, setWeekLabel] = useState("W39");
  const [selectedId, setSelectedId] = useState<string | null>(plans[0]?.id ?? null);

  useEffect(() => {
    if (!activeMonthly.length) {
      if (monthlyId) setMonthlyId("");
      return;
    }
    if (!activeMonthly.some((o) => o.id === monthlyId)) {
      setMonthlyId(activeMonthly[0].id);
    }
  }, [activeMonthly, monthlyId]);

  useEffect(() => {
    if (!plans.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (selectedId && !plans.some((p) => p.id === selectedId)) {
      setSelectedId(plans[0].id);
    }
  }, [plans, selectedId]);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  );

  const instructions = useDirectInstructionStore((s) => s.instructions);
  const canEdit = canEditPlanScope(user.role);
  const canReview = canReviewWeeklyPlan(user.role);

  const onCreate = () => {
    if (!canEdit) {
      toast.error("Only SPX can create weekly plans");
      return;
    }
    try {
      const row = createFromMonthly({ monthlyWoId: monthlyId, weekLabel });
      setSelectedId(row.id);
      toast.success(`Created ${row.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create weekly plan");
    }
  };

  const onActivate = () => {
    if (!canEdit) {
      toast.error("Only SPX can activate and bridge weekly plans");
      return;
    }
    if (!selected) return;
    try {
      const row = activateAndBridge(selected.id);
      toast.success(
        `Activated — bridged ${row.bridgedWorkOrderIds.length} AFE work order(s) under ${row.monthlyWoCode}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activate failed");
    }
  };

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Execution"}
        title="Weekly Implementation Plans"
        description="Break the monthly WO into week plans, then activate and bridge to work orders."
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Execution", href: CROPFORT_ROUTES.fieldTickets },
          { label: "Weekly Plans" },
        ]}
        meta={
          <OpsDeskMeta
            items={[
              { label: "plans", value: String(plans.length) },
              { label: "active MWO", value: String(activeMonthly.length) },
            ]}
          />
        }
      />

      <OpsDeskControlPanel
        trailing={
          <Button size="sm" onClick={onCreate} disabled={!monthlyId || !canEdit}>
            Create weekly plan
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {activeMonthly.length === 0 ? (
            <span className="text-sm text-muted-foreground">No active monthly WO</span>
          ) : (
            <Select value={monthlyId} onValueChange={setMonthlyId}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Monthly WO" />
              </SelectTrigger>
              <SelectContent>
                {activeMonthly.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            className="h-8 w-24"
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            aria-label="Week label"
            placeholder="Week"
          />
        </div>
      </OpsDeskControlPanel>

      <OpsDeskSplit
        registerTitle="Plans"
        register={
          plans.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
              No weekly plans yet.
            </p>
          ) : (
            plans.map((p) => (
              <OpsDeskRegisterItem
                key={p.id}
                active={selected?.id === p.id}
                title={p.code}
                subtitle={`Week ${p.weekLabel}`}
                trailing={<StatusBadge status={p.status} />}
                onClick={() => setSelectedId(p.id)}
              />
            ))
          )
        }
        detail={
          !selected ? (
            <OpsDeskDetail
              empty={{
                icon: CalendarRange,
                title: "Select a weekly plan",
                description: "Create a plan from an active monthly WO, then open it here.",
              }}
            />
          ) : (
            <OpsDeskDetail
              title={selected.code}
              description={`Week ${selected.weekLabel} · ${selected.monthlyWoCode || selected.monthlyWoId} · ${selected.lines.length} lines`}
              badge={<StatusBadge status={selected.status} />}
              actions={
                <>
                  {selected.loop !== "none" ? (
                    <StatusBadge status="at_risk" label="Budget overrun" />
                  ) : null}
                  {(selected.status === "draft" || selected.status === "returned") && canEdit && (
                    <Button
                      size="sm"
                      onClick={() => {
                        submit(selected.id);
                        toast.success("Submitted for review");
                      }}
                    >
                      Submit
                    </Button>
                  )}
                  {selected.status === "submitted" && canReview && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          decide(selected.id, "approved");
                          toast.success("Approved");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          decide(selected.id, "returned", "Revise crew / qty");
                          toast.message("Returned");
                        }}
                      >
                        Return
                      </Button>
                    </>
                  )}
                  {(selected.status === "approved" || selected.status === "submitted") && canEdit && (
                    <Button size="sm" variant="secondary" onClick={onActivate}>
                      Activate & bridge
                    </Button>
                  )}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLoop(selected.id, "C_budget_overrun");
                        toast.message("Spend overrun flagged for review");
                      }}
                    >
                      Flag overrun
                    </Button>
                  ) : null}
                  {selected.bridgedWorkOrderIds.length > 0 && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={CROPFORT_ROUTES.workOrders}>Open WOs</Link>
                    </Button>
                  )}
                </>
              }
            >
              {(selected.directInstructionIds?.length ?? 0) > 0 ? (
                <div className="mb-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Direct Instructions in this week
                  </p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {selected.directInstructionIds.map((id) => {
                      const di = instructions.find((d) => d.id === id);
                      return (
                        <li key={id}>
                          {di ? `${di.code} · ${di.title} · ${fmtEtb(di.amountEtb)}` : id}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Activity</th>
                      <th className="px-3 py-2">Block</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Crew</th>
                      <th className="px-3 py-2">Manuals</th>
                      <th className="px-3 py-2">ETB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{l.activityName}</td>
                        <td className="px-3 py-2">{l.blockCode}</td>
                        <td className="cf-numeric px-3 py-2">
                          {l.qty} {l.unit}
                        </td>
                        <td className="px-3 py-2">{l.crew}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.manualsRef || "—"}</td>
                        <td className="cf-numeric px-3 py-2">{fmtEtb(l.etb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </OpsDeskDetail>
          )
        }
      />
    </OpsDeskPage>
  );
}
