import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AfeBand } from "@/lib/cropfort/ethiopian-year";
import {
  DEFAULT_SPEND_BANDS,
  resolveBandFromEtb,
  resolveBandFromUsd,
  validateBandSet,
  type ProgramBandSet,
  type ProgramSpendBand,
} from "@/types/spend-bands";

const STORAGE_KEY = "cropfort.program-bands.v1";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}`;
}

function cloneDefaults(): ProgramSpendBand[] {
  return DEFAULT_SPEND_BANDS.map((b) => ({ ...b }));
}

type SpendBandStore = {
  sets: ProgramBandSet[];
  activeProgramId: string | null;
  ensureProgram: (programId: string, programName: string, year?: number) => ProgramBandSet;
  createSet: (input: {
    programId: string;
    programName: string;
    effectiveYear: number;
    bands?: ProgramSpendBand[];
  }) => ProgramBandSet;
  removeSet: (programId: string) => void;
  setActiveProgram: (programId: string | null) => void;
  getActiveSet: () => ProgramBandSet | null;
  getSetForProgram: (programId: string) => ProgramBandSet | null;
  updateBand: (
    programId: string,
    band: AfeBand,
    patch: Partial<Omit<ProgramSpendBand, "band">>,
  ) => void;
  replaceBands: (programId: string, bands: ProgramSpendBand[]) => void;
  resetToDefaults: (programId: string) => void;
  setEffectiveYear: (programId: string, year: number) => void;
  bandForEtb: (amountEtb: number, programId?: string) => AfeBand;
  bandForUsd: (amountUsd: number, programId?: string) => AfeBand;
  bandAutoApproves: (band: AfeBand, programId?: string) => boolean;
};

export const useSpendBandStore = create<SpendBandStore>()(
  persist(
    (set, get) => ({
      sets: [],
      activeProgramId: null,

      ensureProgram: (programId, programName, year) => {
        const existing = get().sets.find((s) => s.programId === programId);
        if (existing) {
          if (existing.programName !== programName) {
            set({
              sets: get().sets.map((s) =>
                s.programId === programId
                  ? { ...s, programName, updatedAt: nowIso() }
                  : s,
              ),
              activeProgramId: programId,
            });
            return get().sets.find((s) => s.programId === programId)!;
          }
          set({ activeProgramId: programId });
          return existing;
        }
        return get().createSet({
          programId,
          programName,
          effectiveYear: year ?? new Date().getFullYear(),
        });
      },

      createSet: ({ programId, programName, effectiveYear, bands }) => {
        if (get().sets.some((s) => s.programId === programId)) {
          throw new Error("This program already has spend bands");
        }
        const nextBands = bands ? bands.map((b) => ({ ...b })) : cloneDefaults();
        const err = validateBandSet(nextBands);
        if (err) throw new Error(err);
        const row: ProgramBandSet = {
          id: uid("pband"),
          programId,
          programName,
          effectiveYear,
          currency: "ETB",
          bands: nextBands,
          updatedAt: nowIso(),
        };
        set({ sets: [row, ...get().sets], activeProgramId: programId });
        return row;
      },

      removeSet: (programId) => {
        const next = get().sets.filter((s) => s.programId !== programId);
        const active =
          get().activeProgramId === programId
            ? next[0]?.programId ?? null
            : get().activeProgramId;
        set({ sets: next, activeProgramId: active });
      },

      setActiveProgram: (programId) => set({ activeProgramId: programId }),

      getActiveSet: () => {
        const id = get().activeProgramId;
        if (!id) return get().sets[0] ?? null;
        return get().sets.find((s) => s.programId === id) ?? null;
      },

      getSetForProgram: (programId) =>
        get().sets.find((s) => s.programId === programId) ?? null,

      updateBand: (programId, band, patch) => {
        const sets = get().sets.map((s) => {
          if (s.programId !== programId) return s;
          const bands = s.bands.map((b) =>
            b.band === band ? { ...b, ...patch, band } : b,
          );
          return { ...s, bands, updatedAt: nowIso() };
        });
        set({ sets });
      },

      replaceBands: (programId, bands) => {
        const err = validateBandSet(bands);
        if (err) throw new Error(err);
        set({
          sets: get().sets.map((s) =>
            s.programId === programId
              ? { ...s, bands: bands.map((b) => ({ ...b })), updatedAt: nowIso() }
              : s,
          ),
        });
      },

      resetToDefaults: (programId) => {
        set({
          sets: get().sets.map((s) =>
            s.programId === programId
              ? { ...s, bands: cloneDefaults(), updatedAt: nowIso() }
              : s,
          ),
        });
      },

      setEffectiveYear: (programId, year) => {
        set({
          sets: get().sets.map((s) =>
            s.programId === programId
              ? { ...s, effectiveYear: year, updatedAt: nowIso() }
              : s,
          ),
        });
      },

      bandForEtb: (amountEtb, programId) => {
        const setRow =
          (programId && get().getSetForProgram(programId)) || get().getActiveSet();
        return resolveBandFromEtb(amountEtb, setRow?.bands ?? DEFAULT_SPEND_BANDS);
      },

      bandForUsd: (amountUsd, programId) => {
        const setRow =
          (programId && get().getSetForProgram(programId)) || get().getActiveSet();
        return resolveBandFromUsd(amountUsd, setRow?.bands ?? DEFAULT_SPEND_BANDS);
      },

      bandAutoApproves: (band, programId) => {
        const setRow =
          (programId && get().getSetForProgram(programId)) || get().getActiveSet();
        const row = (setRow?.bands ?? DEFAULT_SPEND_BANDS).find((b) => b.band === band);
        return row?.autoApprove ?? (band === "A" || band === "B");
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        sets: s.sets,
        activeProgramId: s.activeProgramId,
      }),
    },
  ),
);
