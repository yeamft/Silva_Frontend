import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoreOpsPlan } from "@/types/core-ops";

export type PlanScenario = {
  id: string;
  name: string;
  note: string;
  savedAt: string;
  snapshot: CoreOpsPlan;
  includedCount: number;
  budgetEtb: number;
  scheduledCount: number;
};

type ScenarioStore = {
  scenarios: PlanScenario[];
  saveFromPlan: (plan: CoreOpsPlan, name: string, note?: string) => PlanScenario;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
};

function uuid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function summarize(plan: CoreOpsPlan) {
  let includedCount = 0;
  let budgetEtb = 0;
  let scheduledCount = 0;
  for (const id of plan.activityIds) {
    const act = plan.activities[id];
    if (!act?.included) continue;
    includedCount += 1;
    budgetEtb += act.plannedCost;
    const scheduled = Object.values(act.intensities).some((i) => i !== "none");
    if (scheduled) scheduledCount += 1;
  }
  return {
    includedCount,
    budgetEtb: Math.round(budgetEtb * 100) / 100,
    scheduledCount,
  };
}

export const useScenarioStore = create<ScenarioStore>()(
  persist(
    (set, get) => ({
      scenarios: [],

      saveFromPlan: (plan, name, note = "") => {
        const stats = summarize(plan);
        const row: PlanScenario = {
          id: uuid("scn"),
          name: name.trim() || `Scenario ${get().scenarios.length + 1}`,
          note: note.trim(),
          savedAt: new Date().toISOString(),
          snapshot: structuredClone(plan),
          ...stats,
        };
        set({ scenarios: [row, ...get().scenarios] });
        return row;
      },

      remove: (id) => set({ scenarios: get().scenarios.filter((s) => s.id !== id) }),

      rename: (id, name) =>
        set({
          scenarios: get().scenarios.map((s) =>
            s.id === id ? { ...s, name: name.trim() || s.name } : s,
          ),
        }),
    }),
    { name: "cropfort.planning.scenarios.v1" },
  ),
);
