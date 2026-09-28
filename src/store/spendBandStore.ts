import { create } from "zustand";
import type { AfeBand } from "@/lib/cropfort/ethiopian-year";
import {
  DEFAULT_SPEND_BANDS,
  resolveBandFromEtb,
  resolveBandFromUsd,
  validateBandSet,
  type ProgramBandSet,
  type ProgramSpendBand,
} from "@/types/spend-bands";

/** Legacy persist key — cleared so QuotaExceeded from runaway hydrates does not stick. */
const LEGACY_STORAGE_KEYS = [
  "cropfort.program-bands.v1",
  "cropfort.ops.v2",
];

function purgeLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

purgeLegacyStorage();

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

function capsSignature(
  bands: ProgramSpendBand[],
): string {
  const a = bands.find((b) => b.band === "A")?.maxEtb;
  const b = bands.find((x) => x.band === "B")?.maxEtb;
  const c = bands.find((x) => x.band === "C")?.maxEtb;
  return `${a ?? ""}|${b ?? ""}|${c ?? ""}`;
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
  hydrateFromPrograms: (
    programs: {
      id: string;
      name: string;
      cropfortAfeBandAMaxEtb?: number;
      cropfortAfeBandBMaxEtb?: number;
      cropfortAfeBandCMaxEtb?: number;
    }[],
    activeProgramId?: string | null,
  ) => void;
};

export const useSpendBandStore = create<SpendBandStore>()((set, get) => ({
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
      // No-op when already active — avoids notify loops with sync hydrates.
      if (get().activeProgramId !== programId) {
        set({ activeProgramId: programId });
      }
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

  /**
   * Align in-memory band resolution with program API A/B/C ETB caps.
   * No-ops when caps / active program are unchanged (avoids render loops).
   */
  hydrateFromPrograms: (programs, activeProgramId) => {
    if (!programs.length) return;
    const existingById = new Map(get().sets.map((s) => [s.programId, s]));
    const nextSets: ProgramBandSet[] = programs.map((p) => {
      const aMax = Number(p.cropfortAfeBandAMaxEtb) || 500_000;
      const bMax = Number(p.cropfortAfeBandBMaxEtb) || 2_000_000;
      const cMax = Number(p.cropfortAfeBandCMaxEtb) || 5_000_000;
      const prev = existingById.get(p.id);
      const base = prev?.bands ?? cloneDefaults();
      const byBand = new Map(base.map((b) => [b.band, { ...b }]));
      const a = byBand.get("A")!;
      const b = byBand.get("B")!;
      const c = byBand.get("C")!;
      const d = byBand.get("D")!;
      a.minEtb = 0;
      a.maxEtb = aMax;
      b.minEtb = aMax + 1;
      b.maxEtb = bMax;
      c.minEtb = bMax + 1;
      c.maxEtb = cMax;
      d.minEtb = cMax + 1;
      d.maxEtb = null;
      const bands = [a, b, c, d];
      return {
        id: prev?.id ?? uid("pband"),
        programId: p.id,
        programName: p.name,
        effectiveYear: prev?.effectiveYear ?? new Date().getFullYear(),
        currency: "ETB" as const,
        bands,
        reservedMatters: prev?.reservedMatters,
        updatedAt: prev?.updatedAt ?? nowIso(),
      };
    });

    const active =
      activeProgramId && nextSets.some((s) => s.programId === activeProgramId)
        ? activeProgramId
        : get().activeProgramId && nextSets.some((s) => s.programId === get().activeProgramId)
          ? get().activeProgramId
          : nextSets[0]?.programId ?? null;

    const prev = get().sets;
    const sameCount = prev.length === nextSets.length;
    const sameCaps =
      sameCount &&
      nextSets.every((n) => {
        const o = existingById.get(n.programId);
        return (
          o &&
          o.programName === n.programName &&
          capsSignature(o.bands) === capsSignature(n.bands)
        );
      });
    if (sameCaps && get().activeProgramId === active) return;

    set({
      sets: nextSets.map((s) => ({ ...s, updatedAt: nowIso() })),
      activeProgramId: active,
    });
  },
}));
