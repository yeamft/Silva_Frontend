import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EXEC_CREW,
  useCropfortOpsStore,
} from "@/store/cropfortOpsStore";
import { useDirectInstructionStore } from "@/store/directInstructionStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { resolveManualRef } from "@/lib/cropfort/activity-manuals";
import type {
  ProcessLoop,
  WeeklyPlan,
  WeeklyPlanLine,
  WeeklyPlanStatus,
} from "@/types/agronomic-cycle";

const STORAGE_KEY = "cropfort.weekly-plan.v3";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

type Store = {
  plans: WeeklyPlan[];
  createFromMonthly: (input: {
    monthlyWoId: string;
    weekLabel: string;
  }) => WeeklyPlan;
  submit: (id: string) => void;
  decide: (id: string, decision: "approved" | "returned", note?: string) => void;
  activateAndBridge: (id: string) => WeeklyPlan;
  setLoop: (id: string, loop: ProcessLoop) => void;
};

const DEMO: WeeklyPlan[] = [
  {
    id: "wp-demo-1",
    code: "WIP-W38",
    monthlyWoId: "mwo-demo-1",
    monthlyWoCode: "MWO-2609",
    weekLabel: "W38",
    status: "active",
    lines: [
      {
        id: "wl-1",
        monthlyLineId: "ml-1",
        activityId: "act-prune",
        activityCode: "LAB-PRN",
        activityName: "Selective pruning",
        blockId: "blk-sh01",
        blockCode: "SH-01",
        qty: 1.5,
        unit: "ha",
        crew: "Abebe Bekele",
        materials: "Pruning saws",
        manualsRef: "Canopy Manual §4 — Selective pruning",
        etb: 2775,
      },
      {
        id: "wl-2",
        monthlyLineId: "ml-2",
        activityId: "act-weed",
        activityCode: "LAB-WED",
        activityName: "Weeding cycle",
        blockId: "blk-sh04",
        blockCode: "SH-04",
        qty: 2,
        unit: "ha",
        crew: "Solomon Desta",
        materials: "Hand tools",
        manualsRef: "Weeding SOP §2",
        etb: 820,
      },
    ],
    bridgedWorkOrderIds: [],
    directInstructionIds: [],
    loop: "none",
    createdAt: "2026-09-08T08:00:00.000Z",
    updatedAt: "2026-09-09T10:00:00.000Z",
    note: "Demo week plan",
  },
  {
    id: "wp-demo-2",
    code: "WIP-W39",
    monthlyWoId: "mwo-demo-1",
    monthlyWoCode: "MWO-2609",
    weekLabel: "W39",
    status: "submitted",
    lines: [
      {
        id: "wl-3",
        monthlyLineId: "ml-1",
        activityId: "act-prune",
        activityCode: "LAB-PRN",
        activityName: "Selective pruning",
        blockId: "blk-sh01",
        blockCode: "SH-01",
        qty: 1.2,
        unit: "ha",
        crew: "Abebe Bekele",
        materials: "Pruning saws",
        manualsRef: "Canopy Manual §4 — Selective pruning",
        etb: 2220,
      },
    ],
    bridgedWorkOrderIds: [],
    directInstructionIds: [],
    loop: "none",
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-16T10:00:00.000Z",
    note: "Submitted for review",
  },
];

export const useWeeklyPlanStore = create<Store>()(
  persist(
    (set, get) => ({
      plans: DEMO,

      createFromMonthly: ({ monthlyWoId, weekLabel }) => {
        const mwo = useMonthlyWorkOrderStore
          .getState()
          .orders.find((o) => o.id === monthlyWoId);
        if (!mwo) throw new Error("Monthly work order not found");
        if (mwo.status !== "active" && mwo.status !== "approved") {
          throw new Error("Monthly WO must be active (or approved) before weekly planning");
        }
        const lines: WeeklyPlanLine[] = mwo.lines.map((l) => ({
          id: uid("wl"),
          monthlyLineId: l.id,
          activityId: l.activityId,
          activityCode: l.activityCode,
          activityName: l.activityName,
          blockId: l.blockId,
          blockCode: l.blockCode,
          qty: Math.round((l.plannedQty / 4) * 100) / 100,
          unit: l.unit,
          crew: EXEC_CREW.vendors[0].name,
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
        const n = get().plans.length + 1;
        const now = new Date().toISOString();
        const pendingDi = useDirectInstructionStore
          .getState()
          .pendingForMonthly(mwo.id)
          .map((d) => d.id);
        const row: WeeklyPlan = {
          id: uid("wp"),
          code: `WIP-${weekLabel || `W${n}`}`,
          monthlyWoId,
          monthlyWoCode: mwo.code,
          weekLabel: weekLabel.trim() || `W${n}`,
          status: "draft",
          lines,
          bridgedWorkOrderIds: [],
          directInstructionIds: pendingDi,
          loop: "none",
          createdAt: now,
          updatedAt: now,
          note: pendingDi.length
            ? `Includes ${pendingDi.length} Direct Instruction(s)`
            : "",
        };
        if (pendingDi.length) {
          useDirectInstructionStore.getState().rollIntoWeekly(pendingDi, row.id);
        }
        set({ plans: [row, ...get().plans] });
        return row;
      },

      submit: (id) => {
        set({
          plans: get().plans.map((p) =>
            p.id === id
              ? { ...p, status: "submitted" as WeeklyPlanStatus, updatedAt: new Date().toISOString() }
              : p,
          ),
        });
      },

      decide: (id, decision, note) => {
        const status: WeeklyPlanStatus = decision === "approved" ? "approved" : "returned";
        set({
          plans: get().plans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status,
                  loop: decision === "returned" ? ("none" as ProcessLoop) : p.loop,
                  note: note?.trim() || p.note,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        });
      },

      activateAndBridge: (id) => {
        const plan = get().plans.find((p) => p.id === id);
        if (!plan) throw new Error("Weekly plan not found");
        if (plan.status !== "approved" && plan.status !== "submitted") {
          throw new Error("Approve or submit the weekly plan before activating");
        }

        const mwo = useMonthlyWorkOrderStore
          .getState()
          .orders.find((o) => o.id === plan.monthlyWoId);
        const ops = useCropfortOpsStore.getState();
        const bridged: string[] = [...plan.bridgedWorkOrderIds];

        for (const line of plan.lines) {
          if (line.etb <= 0) continue;
          const afe = ops.raiseAfe({
            title: `${line.activityName} · ${line.blockCode} · ${plan.weekLabel}`,
            sourceType: "afp",
            sourceId: `${plan.monthlyWoCode || plan.monthlyWoId}:${plan.id}:${line.id}`,
            blockId: line.blockId,
            amountEtb: line.etb,
          });
          useCropfortOpsStore.setState({
            afes: useCropfortOpsStore
              .getState()
              .afes.map((a) => (a.id === afe.id ? { ...a, status: "approved" as const } : a)),
          });
          const wo = useCropfortOpsStore.getState().issueWorkOrder(afe.id, {
            week: plan.weekLabel,
            activity: line.activityName,
            title: line.activityName,
            monthlyWoId: plan.monthlyWoId,
            monthlyWoCode: plan.monthlyWoCode || mwo?.code || "",
            monthlyLineId: line.monthlyLineId,
            weeklyPlanId: plan.id,
            weeklyPlanLineId: line.id,
            manualsRef: line.manualsRef,
          });
          bridged.push(wo.id);
        }

        const next: WeeklyPlan = {
          ...plan,
          status: "active",
          bridgedWorkOrderIds: bridged,
          updatedAt: new Date().toISOString(),
          note: plan.note || `Bridged ${bridged.length} work order(s) under ${plan.monthlyWoCode}`,
        };
        set({
          plans: get().plans.map((p) => (p.id === id ? next : p)),
        });
        return next;
      },

      setLoop: (id, loop) => {
        set({
          plans: get().plans.map((p) =>
            p.id === id ? { ...p, loop, updatedAt: new Date().toISOString() } : p,
          ),
        });
      },
    }),
    { name: STORAGE_KEY },
  ),
);
