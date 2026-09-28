import { create } from "zustand";
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

type RemoteBlob = {
  schedule5?: unknown;
  schedule7?: unknown;
  processCalendar?: unknown;
  reservedMatters?: unknown;
  establishment?: unknown;
  sixMonthReviews?: unknown[];
  directInstructionValueEtb?: number;
};

type Store = {
  schedule5: Schedule5Config;
  schedule7: Schedule7Dependency[];
  processCalendar: ProcessCalendarItem[];
  reservedMatters: ReservedMatterFlags;
  establishment: EstablishmentPhase | null;
  sixMonthReviews: SixMonthReview[];
  directInstructionValueEtb: number;
  /** Bumps on every local edit — drives debounced auto-save. */
  revision: number;
  dirty: boolean;
  hydratedProgramId: string | null;
  setSchedule5: (patch: Partial<Schedule5Config>) => void;
  setReservedMatters: (patch: Partial<ReservedMatterFlags>) => void;
  setDirectInstructionValueEtb: (value: number) => void;
  toggleSchedule7: (id: string) => void;
  updateProcessCalendarItem: (id: string, patch: Partial<ProcessCalendarItem>) => void;
  startEstablishment: (input: {
    programId: string;
    farmName: string;
    startDate?: string;
  }) => EstablishmentPhase;
  toggleDeliverable: (id: string) => void;
  createSixMonthReview: () => SixMonthReview;
  updateSixMonthReview: (
    id: string,
    patch: Partial<Pick<SixMonthReview, "findings" | "correctiveActions" | "status">>,
  ) => void;
  schedule7Blocking: () => Schedule7Dependency[];
  hydrateFromRemote: (data: RemoteBlob, programId: string) => void;
  markClean: () => void;
  toRemotePayload: () => {
    schedule5: Schedule5Config;
    schedule7: Schedule7Dependency[];
    processCalendar: ProcessCalendarItem[];
    reservedMatters: ReservedMatterFlags;
    establishment: EstablishmentPhase | null;
    sixMonthReviews: SixMonthReview[];
    directInstructionValueEtb: number;
  };
};

function touch(set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void, get: () => Store, partial: Partial<Store>) {
  set({
    ...partial,
    dirty: true,
    revision: get().revision + 1,
  });
}

export const useAgreementConfigStore = create<Store>()((set, get) => ({
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
  establishment: null,
  sixMonthReviews: [],
  directInstructionValueEtb: 50_000,
  revision: 0,
  dirty: false,
  hydratedProgramId: null,

  setSchedule5: (patch) =>
    touch(set, get, { schedule5: { ...get().schedule5, ...patch } }),

  setReservedMatters: (patch) =>
    touch(set, get, { reservedMatters: { ...get().reservedMatters, ...patch } }),

  setDirectInstructionValueEtb: (value) =>
    touch(set, get, {
      directInstructionValueEtb: Math.max(0, Math.round(value)),
    }),

  toggleSchedule7: (id) =>
    touch(set, get, {
      schedule7: get().schedule7.map((d) =>
        d.id === id ? { ...d, met: !d.met } : d,
      ),
    }),

  updateProcessCalendarItem: (id, patch) =>
    touch(set, get, {
      processCalendar: get().processCalendar.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }),

  schedule7Blocking: () => get().schedule7.filter((d) => d.required && !d.met),

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
    touch(set, get, { establishment: row });
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
    touch(set, get, {
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
      farmName: plan?.farmName ?? "Farm",
      budgetYearLabel: plan?.budgetYearLabel ?? "",
      status: "draft",
      findings: "",
      varianceEtb: 0,
      variancePct: 0,
      correctiveActions: "",
      createdAt: now,
      updatedAt: now,
    };
    void planned;
    touch(set, get, { sixMonthReviews: [row, ...get().sixMonthReviews] });
    return row;
  },

  updateSixMonthReview: (id, patch) => {
    touch(set, get, {
      sixMonthReviews: get().sixMonthReviews.map((r) =>
        r.id === id
          ? { ...r, ...patch, updatedAt: new Date().toISOString() }
          : r,
      ),
    });
  },

  hydrateFromRemote: (data, programId) => {
    // Already hydrated for this workspace — skip notify (prevents sync loops).
    if (get().hydratedProgramId === programId && !get().dirty) return;
    set({
      schedule5: (data.schedule5 as Schedule5Config) || { ...DEFAULT_SCHEDULE5 },
      schedule7: Array.isArray(data.schedule7)
        ? (data.schedule7 as Schedule7Dependency[])
        : DEFAULT_SCHEDULE7.map((d) => ({ ...d })),
      processCalendar: Array.isArray(data.processCalendar)
        ? (data.processCalendar as ProcessCalendarItem[])
        : DEFAULT_PROCESS_CALENDAR.map((c) => ({ ...c })),
      reservedMatters: (data.reservedMatters as ReservedMatterFlags) || {
        procurementAboveBand: true,
        permanentHire: true,
        relatedParty: true,
        landDisposition: true,
        financing: true,
      },
      establishment: (data.establishment as EstablishmentPhase | null) ?? null,
      sixMonthReviews: Array.isArray(data.sixMonthReviews)
        ? (data.sixMonthReviews as SixMonthReview[])
        : [],
      directInstructionValueEtb:
        data.directInstructionValueEtb != null
          ? Math.max(0, Math.round(Number(data.directInstructionValueEtb) || 0))
          : 50_000,
      dirty: false,
      hydratedProgramId: programId,
      revision: get().revision,
    });
  },

  markClean: () => set({ dirty: false }),

  toRemotePayload: () => {
    const s = get();
    return {
      schedule5: s.schedule5,
      schedule7: s.schedule7,
      processCalendar: s.processCalendar,
      reservedMatters: s.reservedMatters,
      establishment: s.establishment,
      sixMonthReviews: s.sixMonthReviews,
      directInstructionValueEtb: s.directInstructionValueEtb,
    };
  },
}));
