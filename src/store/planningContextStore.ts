import { create } from "zustand";
import { persist } from "zustand/middleware";

type PlanningContextState = {
  /** Active programme plan id keyed by workspace program id. */
  activePlanIdByProgram: Record<string, string>;
  setActivePlanId: (programId: string, planId: string | null) => void;
  getActivePlanId: (programId: string | null | undefined) => string | null;
};

export const usePlanningContextStore = create<PlanningContextState>()(
  persist(
    (set, get) => ({
      activePlanIdByProgram: {},

      setActivePlanId: (programId, planId) => {
        if (!programId) return;
        set((state) => {
          const current = state.activePlanIdByProgram[programId] ?? null;
          const nextId = planId || null;
          // Bail out when unchanged — callers in layout sync effects otherwise
          // notify every time and can oscillate with GlobalContextBar clears.
          if (current === nextId) return state;
          const next = { ...state.activePlanIdByProgram };
          if (!nextId) {
            delete next[programId];
          } else {
            next[programId] = nextId;
          }
          return { activePlanIdByProgram: next };
        });
      },

      getActivePlanId: (programId) => {
        if (!programId) return null;
        return get().activePlanIdByProgram[programId] ?? null;
      },
    }),
    {
      name: "cropfort.planning-context.v1",
      partialize: (s) => ({ activePlanIdByProgram: s.activePlanIdByProgram }),
    },
  ),
);
