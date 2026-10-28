import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CollectionUnit = "kg" | "quintal";

export const UNIT_TO_KG: Record<CollectionUnit, number> = { kg: 1, quintal: 100 };

/** One day's cherry collection for a field. Saved on this device until the API exists. */
export type CoffeeCollectionEntry = {
  id: string;
  programId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  fieldId: string;
  fieldName: string;
  farmAreaId: string | null;
  unit: CollectionUnit;
  /** Picked by workers, in `unit`. */
  pickedQty: number;
  /** Delivered to the collection yard, in `unit`. */
  deliveredQty: number;
  weighingStaff: string;
  createdAt: string;
  updatedAt: string;
};

export type CoffeeCollectionInput = Omit<CoffeeCollectionEntry, "id" | "createdAt" | "updatedAt">;

type CoffeeCollectionState = {
  entries: CoffeeCollectionEntry[];
  add: (input: CoffeeCollectionInput) => CoffeeCollectionEntry;
  update: (id: string, input: Partial<CoffeeCollectionInput>) => void;
  remove: (id: string) => void;
};

export const useCoffeeCollectionStore = create<CoffeeCollectionState>()(
  persist(
    (set) => ({
      entries: [],

      add: (input) => {
        const now = new Date().toISOString();
        const entry: CoffeeCollectionEntry = { ...input, id: `cc_${crypto.randomUUID()}`, createdAt: now, updatedAt: now };
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
    // v2: records are per field with picked / delivered quantities.
    { name: "cropfort.coffee-collection.v2" },
  ),
);

/** Kg picked on a field up to and including `date` — the "cumulatively picked" figure. */
export function cumulativePickedKg(
  entries: CoffeeCollectionEntry[],
  fieldId: string,
  date: string,
  excludeId?: string,
) {
  return entries
    .filter((e) => e.fieldId === fieldId && e.date <= date && e.id !== excludeId)
    .reduce((sum, e) => sum + e.pickedQty * UNIT_TO_KG[e.unit], 0);
}
