import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One activity's daily farm-operations record. Saved on this device until the API exists. */
export type FarmOperationEntry = {
  id: string;
  programId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  farmOfficeId: string;
  farmOfficeName: string;
  subFarm: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  unit: string;
  blockId: string | null;
  blockCode: string;
  /** Standard output per man-day, in `unit`. */
  standard: number | null;
  /** Planned quantity for the day, in `unit`. */
  plan: number | null;
  /** Quantity actually done, in `unit`. */
  currentPerformance: number | null;
  /** Man-days worked. */
  labor: number | null;
  /** Labour payment for the day (ETB). */
  payment: number | null;
  comment: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type FarmOperationInput = Omit<FarmOperationEntry, "id" | "createdAt" | "updatedAt">;

type FarmOperationsState = {
  entries: FarmOperationEntry[];
  add: (input: FarmOperationInput) => FarmOperationEntry;
  update: (id: string, input: Partial<FarmOperationInput>) => void;
  remove: (id: string) => void;
};

export const useFarmOperationsStore = create<FarmOperationsState>()(
  persist(
    (set) => ({
      entries: [],

      add: (input) => {
        const now = new Date().toISOString();
        const entry: FarmOperationEntry = { ...input, id: `fo_${crypto.randomUUID()}`, createdAt: now, updatedAt: now };
        set((state) => ({ entries: [entry, ...state.entries] }));
        return entry;
      },

      update: (id, input) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...input, updatedAt: new Date().toISOString() } : e,
          ),
        })),

      remove: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
    }),
    { name: "cropfort.farm-operations.v1" },
  ),
);

/** % of plan achieved, or null without a plan. */
export function achievementPct(e: Pick<FarmOperationEntry, "plan" | "currentPerformance">) {
  if (!e.plan || e.currentPerformance == null) return null;
  return (e.currentPerformance / e.plan) * 100;
}

/** Output per man-day, or null without labour. */
export function outputPerManDay(e: Pick<FarmOperationEntry, "labor" | "currentPerformance">) {
  if (!e.labor || e.currentPerformance == null) return null;
  return e.currentPerformance / e.labor;
}
