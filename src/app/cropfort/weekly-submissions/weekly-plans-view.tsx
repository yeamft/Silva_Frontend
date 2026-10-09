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
import { resolveManualRef } from "@/lib/cropfort/activity-manuals";
import {
  useActivateWeeklyPlan,
  useCreateWeeklyPlan,
  useDecideWeeklyPlan,
  useSetWeeklyPlanLoop,
  useSubmitWeeklyPlan,
  useWeeklyPlans,
} from "@/lib/query/hooks/use-weekly-plans";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import {
  useDirectInstructions,
  usePendingDirectInstructions,
} from "@/lib/query/hooks/use-direct-instructions";
import { EXEC_CREW, fmtEtb } from "@/store/cropfortOpsStore";

export default function WeeklyPlansView() {
  const { activeProgram, user } = useCropfortAuth();
  const monthlyQuery = useMonthlyWorkOrders(Boolean(activeProgram?.id));
  const monthlyOrders = monthlyQuery.data || [];
  const plansQuery = useWeeklyPlans(Boolean(activeProgram?.id));
  const createPlan = useCreateWeeklyPlan();
  const submitPlan = useSubmitWeeklyPlan();
  const decidePlan = useDecideWeeklyPlan();
  const activatePlan = useActivateWeeklyPlan();
  const setLoopMut = useSetWeeklyPlanLoop();

  const plans = plansQuery.data || [];
  const activeMonthly = useMemo(
    () => monthlyOrders.filter((o) => o.status === "active" || o.status === "approved"),
    [monthlyOrders],
  );
  const [monthlyId, setMonthlyId] = useState(activeMonthly[0]?.id ?? "");
  const [weekLabel, setWeekLabel] = useState("W39");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    if (!selectedId || !plans.some((p) => p.id === selectedId)) {
      setSelectedId(plans[0].id);
    }
  }, [plans, selectedId]);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  );

  const diQuery = useDirectInstructions(Boolean(activeProgram?.id));
  const instructions = diQuery.data || [];
  const pendingDiQuery = usePendingDirectInstructions(
    monthlyId || null,
    Boolean(activeProgram?.id && monthlyId),
  );
  const canEdit = canEditPlanScope(user.role);
  const canReview = canReviewWeeklyPlan(user.role);

  const onCreate = async () => {
    if (!canEdit) {
      toast.error("Only SPX can create weekly plans");
      return;
    }
    const mwo = monthlyOrders.find((o) => o.id === monthlyId);
    if (!mwo) {
      toast.error("Select an active monthly WO");
      return;
    }
    try {
      const pendingDi = (pendingDiQuery.data || []).map((d) => d.id);
      const lines = mwo.lines.map((l) => ({
        monthlyLineId: l.id,
        activityId: l.activityId,
        activityCode: l.activityCode,
        activityName: l.activityName,
        blockId: l.blockId,
        blockCode: l.blockCode,
        qty: Math.round((l.plannedQty / 4) * 100) / 100,
        unit: l.unit,
        crew: EXEC_CREW.vendors[0]?.name || "",
        materials: "",
        manualsRef:
          l.manualsRef ||
          resolveManualRef({
            id: l.activityId,
            code: l.activityCode,
            name: l.activityName,
          }),
        etb: Math.round(l.etb / 4),
      }));
      const row = await createPlan.mutateAsync({
        weekLabel: weekLabel.trim() || "W1",
        monthlyWoId: mwo.id,
        monthlyWoCode: mwo.code,
        directInstructionIds: pendingDi,
        note: pendingDi.length ? `Includes ${pendingDi.length} Direct Instruction(s)` : "",
        lines,
      });
      void diQuery.refetch();
      void pendingDiQuery.refetch();
      setSelectedId(row.id);
      toast.success(`Created ${row.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create weekly plan");
    }
  };

  const onActivate = async () => {
    if (!canEdit) {
      toast.error("Only SPX can activate and bridge weekly plans");
      return;
    }
    if (!selected) return;
    try {
      const row = await activatePlan.mutateAsync(selected.id);
      toast.success(
        `Activated · ${row.bridgedWorkOrderIds.length} WO${row.bridgedWorkOrderIds.length === 1 ? "" : "s"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activate failed");
    }
  };

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Execution"}
        title="Weekly plans"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Execution", href: CROPFORT_ROUTES.fieldTickets },
          { label: "Weekly plans" },
        ]}
        meta={
          <OpsDeskMeta
            items={[
              { label: "Plans", value: String(plans.length) },
              { label: "MWO", value: String(activeMonthly.length) },
            ]}
          />
        }
      />

      <OpsDeskControlPanel
        trailing={
          <Button
            size="sm"
            onClick={() => void onCreate()}
            disabled={!monthlyId || !canEdit || createPlan.isPending}
          >
            New
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {activeMonthly.length === 0 ? (
            <span className="text-sm text-muted-foreground">No MWO</span>
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
          plansQuery.isLoading ? (
            <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : plans.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">None</p>
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
                title: "None",
              }}
            />
          ) : (
            <OpsDeskDetail
              title={selected.code}
              description={`Week ${selected.weekLabel} · ${selected.monthlyWoCode || selected.monthlyWoId || "—"} · ${selected.lines.length} lines`}
              badge={<StatusBadge status={selected.status} />}
              actions={
                <>
                  {selected.loop !== "none" ? (
                    <StatusBadge status="at_risk" label="Budget overrun" />
                  ) : null}
                  {(selected.status === "draft" || selected.status === "returned") && canEdit && (
                    <Button
                      size="sm"
                      disabled={submitPlan.isPending}
                      onClick={async () => {
                        try {
                          await submitPlan.mutateAsync(selected.id);
                          toast.success("Submitted");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Submit failed");
                        }
                      }}
                    >
                      Submit
                    </Button>
                  )}
                  {selected.status === "submitted" && canReview && (
                    <>
                      <Button
                        size="sm"
                        disabled={decidePlan.isPending}
                        onClick={async () => {
                          try {
                            await decidePlan.mutateAsync({
                              id: selected.id,
                              decision: "approve",
                            });
                            toast.success("Approved");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Approve failed");
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decidePlan.isPending}
                        onClick={async () => {
                          try {
                            await decidePlan.mutateAsync({
                              id: selected.id,
                              decision: "return",
                              comment: "Revise crew / qty",
                            });
                            toast.message("Returned");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Return failed");
                          }
                        }}
                      >
                        Return
                      </Button>
                    </>
                  )}
                  {(selected.status === "approved" || selected.status === "submitted") && canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={activatePlan.isPending}
                      onClick={() => void onActivate()}
                    >
                      Activate & bridge
                    </Button>
                  )}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setLoopMut.isPending}
                      onClick={async () => {
                        try {
                          await setLoopMut.mutateAsync({
                            id: selected.id,
                            loop: "C_budget_overrun",
                          });
                          toast.message("Spend overrun");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Flag failed");
                        }
                      }}
                    >
                      Flag overrun
                    </Button>
                  ) : null}
                  {selected.bridgedWorkOrderIds.length > 0 && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={CROPFORT_ROUTES.workOrders}>WOs</Link>
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
