import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PLAN_MONTH_LABELS,
  type PlanMonth,
} from "@/lib/cropfort/ethiopian-year";
import { resolveManualRef } from "@/lib/cropfort/activity-manuals";
import {
  applyLoopGAdjustments,
  buildLoopGInsights,
} from "@/lib/cropfort/loop-g";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useReportsStore } from "@/store/reportsStore";
import type {
  MonthlyWoLine,
  MonthlyWoStatus,
  MonthlyWorkOrder,
  ProcessLoop,
} from "@/types/agronomic-cycle";
import type { MonthIntensity } from "@/types/core-ops";

const STORAGE_KEY = "cropfort.monthly-wo.v3";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function intensityShare(intensity: MonthIntensity): number {
  if (intensity === "peak") return 0.4;
  if (intensity === "active") return 0.25;
  if (intensity === "light") return 0.1;
  return 0;
}

function intensityWeightTotal(
  intensities: Record<PlanMonth, MonthIntensity>,
): number {
  return (Object.values(intensities) as MonthIntensity[]).reduce(
    (sum, i) => sum + intensityShare(i),
    0,
  );
}

export function deriveMonthlyLinesFromPlan(
  planId: string,
  month: PlanMonth,
): MonthlyWoLine[] {
  const plan = useCoreOpsPlanStore.getState().plan;
  if (!plan || plan.id !== planId) return [];
  const lines: MonthlyWoLine[] = [];

  for (const act of Object.values(plan.activities)) {
    if (!act.included) continue;
    const intensity = act.intensities[month] ?? "none";
    if (intensity === "none") continue;

    const totalWeight = intensityWeightTotal(act.intensities) || 1;
    const monthShare = intensityShare(intensity) / totalWeight;
    const monthQty = Math.round(act.plannedQty * monthShare * 100) / 100;
    if (monthQty <= 0) continue;

    const allocations =
      act.blockAllocations.length > 0
        ? act.blockAllocations
        : plan.applicableBlockIds.slice(0, 1).map((blockId) => {
            const block = useCoreOpsPlanStore
              .getState()
              .blocks.find((b) => b.id === blockId);
            return {
              blockId,
              blockCode: block?.code ?? blockId,
              qty: act.plannedQty,
            };
          });

    const allocTotal = allocations.reduce((s, a) => s + a.qty, 0) || 1;

    for (const alloc of allocations) {
      const share = alloc.qty / allocTotal;
      const qty = Math.round(monthQty * share * 100) / 100;
      if (qty <= 0) continue;
      const etb = Math.round(act.plannedCost * monthShare * share);
      lines.push({
        id: uid("ml"),
        activityId: act.activityId,
        activityCode: act.activityCode,
        activityName: act.activityName,
        blockId: alloc.blockId,
        blockCode: alloc.blockCode,
        plannedQty: qty,
        unit: act.uom,
        etb,
        manualsRef:
          act.manualsRef ||
          resolveManualRef({
            id: act.activityId,
            code: act.activityCode,
            name: act.activityName,
          }),
        inPlan: true,
      });
    }
  }
  return lines;
}

type Store = {
  orders: MonthlyWorkOrder[];
  createFromPlan: (input: {
    planId: string;
    month: PlanMonth;
    programId?: string;
  }) => MonthlyWorkOrder;
  addOutOfPlanLine: (
    id: string,
    line: Omit<MonthlyWoLine, "id" | "inPlan">,
    reason: string,
  ) => void;
  setAdjustmentAccepted: (mwoId: string, adjustmentId: string, accepted: boolean) => void;
  reapplyAdjustments: (mwoId: string) => void;
  submit: (id: string) => void;
  decide: (id: string, decision: "approved" | "returned", note?: string) => void;
  activate: (id: string) => void;
  setLoop: (id: string, loop: ProcessLoop) => void;
  pendingApproval: () => MonthlyWorkOrder[];
};

const DEMO: MonthlyWorkOrder[] = [
  {
    id: "mwo-demo-1",
    code: "MWO-2609",
    farmId: "farm-1",
    farmName: "Sheka Estate",
    programId: "prog-1",
    ethiopianMonth: "sep",
    yearGc: 2026,
    status: "active",
    lines: [
      {
        id: "ml-1",
        activityId: "act-prune",
        activityCode: "LAB-PRN",
        activityName: "Selective pruning",
        blockId: "blk-sh01",
        blockCode: "SH-01",
        plannedQty: 4.2,
        unit: "ha",
        etb: 7770,
        manualsRef: "Canopy Manual §4 — Selective pruning",
        inPlan: true,
      },
      {
        id: "ml-2",
        activityId: "act-weed",
        activityCode: "LAB-WED",
        activityName: "Weeding cycle",
        blockId: "blk-sh04",
        blockCode: "SH-04",
        plannedQty: 6,
        unit: "ha",
        etb: 2460,
        manualsRef: "Weeding SOP §2",
        inPlan: true,
      },
    ],
    sourcePlanId: null,
    outOfPlanReason: "",
    loop: "none",
    totalEtb: 10230,
    lastMonthInsights: "",
    structuredInsights: null,
    recommendedAdjustments: [],
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-05T10:00:00.000Z",
    note: "Demo September monthly WO",
  },
  {
    id: "mwo-demo-2",
    code: "MWO-2610",
    farmId: "farm-1",
    farmName: "Sheka Estate",
    programId: "prog-1",
    ethiopianMonth: "oct",
    yearGc: 2026,
    status: "submitted",
    lines: [
      {
        id: "ml-3",
        activityId: "act-fert",
        activityCode: "LAB-NPK",
        activityName: "NPK application",
        blockId: "blk-sh01",
        blockCode: "SH-01",
        plannedQty: 3,
        unit: "ha",
        etb: 5400,
        manualsRef: "Fertiliser Application Manual §3",
        inPlan: true,
      },
      {
        id: "ml-4",
        activityId: "act-drain",
        activityCode: "LAB-DRN",
        activityName: "Drainage clear",
        blockId: "blk-sh04",
        blockCode: "SH-04",
        plannedQty: 1,
        unit: "ha",
        etb: 3200,
        manualsRef: "Drainage clear — Operating Manual",
        inPlan: false,
      },
    ],
    sourcePlanId: null,
    outOfPlanReason: "Storm washout — not on core ops calendar — pending Silva approval",
    loop: "B_out_of_plan",
    totalEtb: 8600,
    lastMonthInsights: "",
    structuredInsights: null,
    recommendedAdjustments: [],
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    note: "October monthly WO awaiting Silva approval (out-of-plan)",
  },
];

export const useMonthlyWorkOrderStore = create<Store>()(
  persist(
    (set, get) => ({
      orders: DEMO,

      createFromPlan: ({ planId, month, programId }) => {
        const plan = useCoreOpsPlanStore.getState().plan;
        if (!plan || plan.id !== planId) {
          throw new Error("Core Ops plan not found — open Core Operations first");
        }
        const baseLines = deriveMonthlyLinesFromPlan(planId, month);
        if (!baseLines.length) {
          throw new Error(
            `No scheduled activities for ${PLAN_MONTH_LABELS[month]} — set calendar intensities first`,
          );
        }
        const priorMonthly = useReportsStore
          .getState()
          .reports.filter((r) => r.cadence === "monthly" && r.status === "released")
          .sort((a, b) => (a.releasedAt || a.updatedAt).localeCompare(b.releasedAt || b.updatedAt));
        const lastReport = priorMonthly[priorMonthly.length - 1];
        const { narrative, structured, adjustments } = buildLoopGInsights(lastReport);
        const lines = applyLoopGAdjustments(baseLines, adjustments);
        const loopG =
          Boolean(structured) || adjustments.some((a) => a.accepted)
            ? ("G_monthly_feedback" as ProcessLoop)
            : ("none" as ProcessLoop);
        const n = 2600 + get().orders.length;
        const now = new Date().toISOString();
        const row: MonthlyWorkOrder = {
          id: uid("mwo"),
          code: `MWO-${n}`,
          farmId: plan.farmEstateId,
          farmName: plan.farmName,
          programId: programId ?? "prog-1",
          ethiopianMonth: month,
          yearGc: plan.budgetYearGc,
          status: "draft",
          lines,
          sourcePlanId: plan.id,
          outOfPlanReason: "",
          loop: loopG,
          totalEtb: lines.reduce((s, l) => s + l.etb, 0),
          lastMonthInsights: narrative,
          structuredInsights: structured,
          recommendedAdjustments: adjustments,
          createdAt: now,
          updatedAt: now,
          note: narrative
            ? "Loop G — seeded from last released monthly report"
            : "",
        };
        set({ orders: [row, ...get().orders] });
        return row;
      },

      addOutOfPlanLine: (id, line, reason) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) throw new Error("Monthly WO not found");
        if (order.status !== "draft" && order.status !== "returned") {
          throw new Error("Only draft or returned monthly WOs can add lines");
        }
        const nextLine: MonthlyWoLine = {
          ...line,
          id: uid("ml"),
          inPlan: false,
          manualsRef:
            line.manualsRef ||
            resolveManualRef({
              code: line.activityCode,
              name: line.activityName,
            }),
        };
        const lines = [...order.lines, nextLine];
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  lines,
                  totalEtb: lines.reduce((s, l) => s + l.etb, 0),
                  outOfPlanReason: reason.trim() || o.outOfPlanReason,
                  loop: "B_out_of_plan",
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        });
      },

      setAdjustmentAccepted: (mwoId, adjustmentId, accepted) => {
        const order = get().orders.find((o) => o.id === mwoId);
        if (!order || (order.status !== "draft" && order.status !== "returned")) return;
        const recommendedAdjustments = order.recommendedAdjustments.map((a) =>
          a.id === adjustmentId ? { ...a, accepted } : a,
        );
        set({
          orders: get().orders.map((o) =>
            o.id === mwoId
              ? { ...o, recommendedAdjustments, updatedAt: new Date().toISOString() }
              : o,
          ),
        });
        get().reapplyAdjustments(mwoId);
      },

      reapplyAdjustments: (mwoId) => {
        const order = get().orders.find((o) => o.id === mwoId);
        if (!order || !order.sourcePlanId) return;
        if (order.status !== "draft" && order.status !== "returned") return;
        const base = deriveMonthlyLinesFromPlan(order.sourcePlanId, order.ethiopianMonth);
        const outOfPlan = order.lines.filter((l) => !l.inPlan);
        const adjusted = applyLoopGAdjustments(base, order.recommendedAdjustments);
        const lines = [...adjusted, ...outOfPlan];
        const hasG = order.recommendedAdjustments.some((a) => a.accepted) || order.structuredInsights;
        set({
          orders: get().orders.map((o) =>
            o.id === mwoId
              ? {
                  ...o,
                  lines,
                  totalEtb: lines.reduce((s, l) => s + l.etb, 0),
                  loop: outOfPlan.length
                    ? "B_out_of_plan"
                    : hasG
                      ? "G_monthly_feedback"
                      : "none",
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        });
      },

      submit: (id) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        const hasOut = order.lines.some((l) => !l.inPlan);
        const status: MonthlyWoStatus = "submitted";
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  loop: hasOut ? "B_out_of_plan" : o.loop,
                  updatedAt: new Date().toISOString(),
                  note: hasOut
                    ? o.note || "Contains out-of-plan lines — Farm Co. approval required"
                    : o.note,
                }
              : o,
          ),
        });
      },

      decide: (id, decision, note) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order || order.status !== "submitted") return;
        const status: MonthlyWoStatus = decision === "approved" ? "approved" : "returned";
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  loop: decision === "returned" ? "A_plan_return" : o.loop === "B_out_of_plan" ? "none" : o.loop,
                  note: note?.trim() || o.note,
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        });
      },

      activate: (id) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        const allInPlan = order.lines.every((l) => l.inPlan);
        const allowed =
          order.status === "approved" ||
          (order.status === "submitted" && allInPlan);
        if (!allowed) {
          throw new Error(
            allInPlan
              ? "Approve or submit the monthly WO before activating"
              : "Silva must approve out-of-plan items before activating",
          );
        }
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "active" as const,
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        });
      },

      setLoop: (id, loop) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, loop, updatedAt: new Date().toISOString() } : o,
          ),
        });
      },

      pendingApproval: () =>
        get().orders.filter(
          (o) =>
            o.status === "submitted" &&
            (o.lines.some((l) => !l.inPlan) || o.loop === "B_out_of_plan"),
        ),
    }),
    { name: STORAGE_KEY },
  ),
);
