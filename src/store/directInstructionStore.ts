import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DirectInstruction,
  DirectInstructionStatus,
} from "@/types/agronomic-cycle";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import { useCropfortOpsStore } from "@/store/cropfortOpsStore";

const STORAGE_KEY = "cropfort.direct-instruction.v1";

/** Default DI value (ETB) when Operating Standards not configured — RB03.8. */
export const DEFAULT_DI_VALUE_ETB = 50_000;

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

type IssueInput = {
  title: string;
  description?: string;
  amountEtb: number;
  blockId: string;
  blockCode: string;
  monthlyWoId?: string | null;
  monthlyWoCode?: string | null;
  weeklyPlanId?: string | null;
  weeklyPlanLineId?: string | null;
  workOrderId?: string | null;
  oral?: boolean;
};

type Store = {
  instructions: DirectInstruction[];
  diValueEtb: () => number;
  issue: (input: IssueInput) => DirectInstruction;
  confirmWritten: (id: string) => void;
  pendingForMonthly: (monthlyWoId: string) => DirectInstruction[];
  rollIntoWeekly: (ids: string[], weeklyPlanId: string) => void;
  escalateOverThreshold: (id: string) => void;
};

export const useDirectInstructionStore = create<Store>()(
  persist(
    (set, get) => ({
      instructions: [],

      diValueEtb: () => {
        const fromAgreement = useAgreementConfigStore.getState().directInstructionValueEtb;
        return typeof fromAgreement === "number" && fromAgreement > 0
          ? fromAgreement
          : DEFAULT_DI_VALUE_ETB;
      },

      issue: (input) => {
        const threshold = get().diValueEtb();
        const amount = Math.max(0, Math.round(input.amountEtb));
        const over = amount > threshold;
        const now = new Date().toISOString();
        const n = 100 + get().instructions.length;
        const row: DirectInstruction = {
          id: uid("di"),
          code: `DI-${n}`,
          title: input.title.trim() || "Direct Instruction",
          description: (input.description || "").trim(),
          monthlyWoId: input.monthlyWoId ?? null,
          monthlyWoCode: input.monthlyWoCode ?? null,
          weeklyPlanId: input.weeklyPlanId ?? null,
          weeklyPlanLineId: input.weeklyPlanLineId ?? null,
          workOrderId: input.workOrderId ?? null,
          blockId: input.blockId,
          blockCode: input.blockCode,
          amountEtb: amount,
          overThreshold: over,
          oralPendingConfirm: !!input.oral,
          status: over ? "escalated" : input.oral ? "issued" : "confirmed",
          issuedAt: now,
          confirmedAt: input.oral || over ? null : now,
          rolledIntoWeeklyPlanId: null,
          note: over
            ? `Above DI value (${threshold.toLocaleString()} ETB) — route as Intervention / Approvals`
            : "",
        };

        if (over) {
          // Escalate: create Intervention draft so Control can pick it up (RB10.11).
          const ops = useCropfortOpsStore.getState();
          const intervention = {
            id: uid("int"),
            code: `INT-DI-${n}`,
            title: `DI escalate: ${row.title}`,
            blockId: row.blockId,
            vendor: "RFSP",
            costEtb: amount,
            status: "draft" as const,
            steps: [
              { id: uid("ms"), title: "Silva approve scope & fee effect", done: false },
              { id: uid("ms"), title: "Add to plan via work orders", done: false },
            ],
          };
          useCropfortOpsStore.setState({
            interventions: [intervention, ...ops.interventions],
          });
          row.note = `${row.note} · Linked ${intervention.code}`;
        }

        set({ instructions: [row, ...get().instructions] });
        return row;
      },

      confirmWritten: (id) => {
        set({
          instructions: get().instructions.map((d) =>
            d.id === id
              ? {
                  ...d,
                  oralPendingConfirm: false,
                  status:
                    d.status === "issued"
                      ? ("confirmed" as DirectInstructionStatus)
                      : d.status,
                  confirmedAt: new Date().toISOString(),
                }
              : d,
          ),
        });
      },

      pendingForMonthly: (monthlyWoId) =>
        get().instructions.filter(
          (d) =>
            d.monthlyWoId === monthlyWoId &&
            !d.overThreshold &&
            (d.status === "issued" || d.status === "confirmed") &&
            !d.rolledIntoWeeklyPlanId,
        ),

      rollIntoWeekly: (ids, weeklyPlanId) => {
        const setIds = new Set(ids);
        set({
          instructions: get().instructions.map((d) =>
            setIds.has(d.id)
              ? {
                  ...d,
                  status: "rolled_into_weekly" as DirectInstructionStatus,
                  rolledIntoWeeklyPlanId: weeklyPlanId,
                }
              : d,
          ),
        });
      },

      escalateOverThreshold: (id) => {
        set({
          instructions: get().instructions.map((d) =>
            d.id === id
              ? { ...d, status: "escalated" as DirectInstructionStatus, overThreshold: true }
              : d,
          ),
        });
      },
    }),
    { name: STORAGE_KEY },
  ),
);
