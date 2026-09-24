import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_ESTABLISHMENT_DELIVERABLES,
  DEFAULT_PROCESS_CALENDAR,
  DEFAULT_SCHEDULE5,
  DEFAULT_SCHEDULE7,
  type EstablishmentDeliverable,
  type EstablishmentPhase,
  type ProcessCalendarItem,
  type ReservedMatterFlags,
  type Schedule5Config,
  type Schedule7Dependency,
  type SixMonthReview,
} from "@/types/agronomic-cycle";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";

const STORAGE_KEY = "cropfort.agreement-config.v1";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedDeliverables(): EstablishmentDeliverable[] {
  return DEFAULT_ESTABLISHMENT_DELIVERABLES.map((d) => ({
    ...d,
    done: false,
    doneAt: null,
  }));
}

type Store = {
  schedule5: Schedule5Config;
  schedule7: Schedule7Dependency[];
  processCalendar: ProcessCalendarItem[];
  reservedMatters: ReservedMatterFlags;
  establishment: EstablishmentPhase | null;
  sixMonthReviews: SixMonthReview[];
  /** Operating Standards — Direct Instruction value (ETB). RB03.8 */
  directInstructionValueEtb: number;
  setSchedule5: (patch: Partial<Schedule5Config>) => void;
  setReservedMatters: (patch: Partial<ReservedMatterFlags>) => void;
  setDirectInstructionValueEtb: (value: number) => void;
  toggleSchedule7: (id: string) => void;
  updateProcessCalendarItem: (id: string, patch: Partial<ProcessCalendarItem>) => void;
  startEstablishment: (input: { programId: string; farmName: string; startDate?: string }) => EstablishmentPhase;
  toggleDeliverable: (id: string) => void;
  createSixMonthReview: () => SixMonthReview;
  updateSixMonthReview: (
    id: string,
    patch: Partial<Pick<SixMonthReview, "findings" | "correctiveActions" | "status">>,
  ) => void;
  schedule7Blocking: () => Schedule7Dependency[];
};

const DEMO_ESTABLISHMENT: EstablishmentPhase = {
  id: "est-demo-1",
  programId: "prog-1",
  farmName: "Sheka Estate",
  startDate: "2026-06-01",
  day90Due: "2026-08-30",
  day120Due: "2026-09-29",
  status: "in_progress",
  deliverables: seedDeliverables().map((d, i) =>
    i < 3 ? { ...d, done: true, doneAt: "2026-08-15T00:00:00.000Z" } : d,
  ),
  notes: "Phase 0 establishment under Farm Management Agreement",
};

export const useAgreementConfigStore = create<Store>()(
  persist(
    (set, get) => ({
      schedule5: { ...DEFAULT_SCHEDULE5 },
      schedule7: DEFAULT_SCHEDULE7.map((d) => ({ ...d })),
      processCalendar: DEFAULT_PROCESS_CALENDAR.map((c) => ({ ...c })),
      reservedMatters: {
        procurementAboveBand: true,
        permanentHire: true,
        relatedParty: true,
        landDisposition: true,
        financing: true,
      },
      establishment: DEMO_ESTABLISHMENT,
      sixMonthReviews: [],
      directInstructionValueEtb: 50_000,

      setSchedule5: (patch) =>
        set({ schedule5: { ...get().schedule5, ...patch } }),

      setReservedMatters: (patch) =>
        set({ reservedMatters: { ...get().reservedMatters, ...patch } }),

      setDirectInstructionValueEtb: (value) =>
        set({ directInstructionValueEtb: Math.max(0, Math.round(value)) }),

      toggleSchedule7: (id) =>
        set({
          schedule7: get().schedule7.map((d) =>
            d.id === id ? { ...d, met: !d.met } : d,
          ),
        }),

      updateProcessCalendarItem: (id, patch) =>
        set({
          processCalendar: get().processCalendar.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }),

      schedule7Blocking: () =>
        get().schedule7.filter((d) => d.required && !d.met),

      startEstablishment: ({ programId, farmName, startDate }) => {
        const start = startDate ?? new Date().toISOString().slice(0, 10);
        const startMs = new Date(start).getTime();
        const day90 = new Date(startMs + 90 * 86400000).toISOString().slice(0, 10);
        const day120 = new Date(startMs + 120 * 86400000).toISOString().slice(0, 10);
        const row: EstablishmentPhase = {
          id: uid("est"),
          programId,
          farmName,
          startDate: start,
          day90Due: day90,
          day120Due: day120,
          status: "in_progress",
          deliverables: seedDeliverables(),
          notes: "",
        };
        set({ establishment: row });
        return row;
      },

      toggleDeliverable: (id) => {
        const est = get().establishment;
        if (!est) return;
        const deliverables = est.deliverables.map((d) =>
          d.id === id
            ? {
                ...d,
                done: !d.done,
                doneAt: !d.done ? new Date().toISOString() : null,
              }
            : d,
        );
        const allDone = deliverables.every((d) => d.done);
        set({
          establishment: {
            ...est,
            deliverables,
            status: allDone ? "complete" : "in_progress",
          },
        });
      },

      createSixMonthReview: () => {
        const plan = useCoreOpsPlanStore.getState().plan;
        const mwos = useMonthlyWorkOrderStore.getState().orders;
        const planned = mwos.reduce((s, o) => s + o.totalEtb, 0);
        const now = new Date().toISOString();
        const row: SixMonthReview = {
          id: uid("smr"),
          planId: plan?.id ?? "none",
          farmName: plan?.farmName ?? "Sheka Estate",
          budgetYearLabel: plan?.budgetYearLabel ?? "FY 2026/27",
          status: "draft",
          findings: "",
          varianceEtb: 0,
          variancePct: 0,
          correctiveActions: "",
          createdAt: now,
          updatedAt: now,
        };
        // Seed variance placeholder from plan spend until DFR actuals are linked in UI
        void planned;
        set({ sixMonthReviews: [row, ...get().sixMonthReviews] });
        return row;
      },

      updateSixMonthReview: (id, patch) => {
        set({
          sixMonthReviews: get().sixMonthReviews.map((r) =>
            r.id === id
              ? { ...r, ...patch, updatedAt: new Date().toISOString() }
              : r,
          ),
        });
      },
    }),
    { name: STORAGE_KEY },
  ),
);
