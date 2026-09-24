import { create } from "zustand";
import {
  approveRateCardProposal,
  archiveRateCardProposal,
  createRateCardFromSurvey,
  getRateCardProposal,
  listLockedBenchmarks,
  listProgramRateCardProposals,
  rejectRateCardProposal,
  restoreRateCardProposal,
  submitRateCardProposal,
  updateRateCardProposal,
  type LockedBenchmarkDto,
  type RateCardProposalDto,
} from "@/lib/api/rate-card-proposals";
import * as mock from "@/lib/mock-api/rate-card-workflow";
import type { RateCardProposal, StandingKind, WorkflowStatus } from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";

export type RateCardListFilters = {
  status?: WorkflowStatus | "all";
  kind?: StandingKind | "all";
  farmEstateId?: string;
  budgetYear?: number;
  /** Mock / workflow context program id */
  programId?: string;
  /** Mock budget year id (e.g. by-2027-sheka) */
  budgetYearId?: string;
  /** Force program-wide (all farms, ignore farm/year). */
  programWide?: boolean;
};

type LockedRow = LockedBenchmarkDto & { farmAreaName?: string | null };

function mapDto(dto: RateCardProposalDto): RateCardProposal {
  return {
    id: dto.id,
    programId: dto.programId,
    budgetYearId: String(dto.budgetYear),
    farmAreaId: dto.farmEstateId || dto.farmAreaId,
    farmAreaName: dto.farmEstateName || null,
    blockId: dto.blockId,
    activityId: dto.activityId,
    kind: (dto.kind as StandingKind) || "labor",
    sourceSurveyId: dto.sourceSurveyId,
    recommendedRate: dto.recommendedRate,
    proposedRate: dto.proposedRate,
    variancePct: dto.variancePct,
    flagged: dto.flagged,
    norm: dto.norm,
    fallbackRate: dto.fallbackRate,
    sourceBasis: dto.sourceBasis,
    availableFrom: dto.availableFrom || "",
    availableTo: dto.availableTo,
    justificationNote: dto.justificationNote || "",
    sourceEvidence: dto.sourceEvidence || "",
    notes: dto.notes || "",
    status: dto.status,
    returnComment: dto.returnComment,
    submittedAt: dto.submittedAt,
    approvedAt: dto.approvedAt,
    approvedByName: null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    activityCode: dto.activityCode,
    activityName: dto.activityName,
    activityUnit: dto.activityUnit,
  } as RateCardProposal & {
    activityCode?: string | null;
    activityName?: string | null;
    activityUnit?: string | null;
  };
}

function listKeyOf(f: RateCardListFilters) {
  return JSON.stringify({
    status: f.status ?? "all",
    kind: f.kind ?? "all",
    farmEstateId: f.programWide ? "" : f.farmEstateId ?? "",
    budgetYear: f.programWide ? "" : f.budgetYear ?? "",
    programId: f.programId ?? "",
    budgetYearId: f.budgetYearId ?? "",
    programWide: Boolean(f.programWide),
  });
}

function resolveMockContext(filters: RateCardListFilters) {
  const programs = mock.getWorkflowPrograms();
  const programId =
    filters.programId && programs.some((p) => p.id === filters.programId)
      ? filters.programId
      : programs[0]?.id || "prog-sheka";
  const years = mock.getWorkflowBudgetYears(programId);
  const budgetYearId =
    filters.budgetYearId && years.some((y) => y.id === filters.budgetYearId)
      ? filters.budgetYearId
      : years[0]?.id || "by-2027-sheka";
  const farmAreaId =
    filters.programWide || !filters.farmEstateId || filters.farmEstateId === "all"
      ? ("all" as const)
      : filters.farmEstateId;
  return { programId, budgetYearId, farmAreaId };
}

async function listFromMock(filters: RateCardListFilters): Promise<RateCardProposal[]> {
  const ctx = resolveMockContext(filters);
  return mock.listRateCardProposals({
    programId: ctx.programId,
    budgetYearId: ctx.budgetYearId,
    farmAreaId: ctx.farmAreaId,
    status: filters.status,
    kind: filters.kind,
  });
}

type RateCardStore = {
  items: RateCardProposal[];
  selected: RateCardProposal | null;
  locked: LockedRow[];
  listLoading: boolean;
  detailLoading: boolean;
  actionPending: boolean;
  error: string | null;
  lastListKey: string;
  usingMock: boolean;
  loadList: (filters: RateCardListFilters, opts?: { force?: boolean }) => Promise<void>;
  loadOne: (id: string) => Promise<RateCardProposal | null>;
  loadLocked: (
    farmId: string,
    farmName?: string | null,
    ctx?: { programId?: string; budgetYearId?: string },
  ) => Promise<void>;
  createFromSurvey: (
    farmId: string,
    input: { sourceSurveyId: string; budgetYear?: number },
  ) => Promise<RateCardProposal>;
  update: (id: string, patch: Record<string, unknown>) => Promise<RateCardProposal>;
  submit: (id: string) => Promise<RateCardProposal>;
  approve: (id: string) => Promise<RateCardProposal>;
  reject: (id: string, comment: string) => Promise<RateCardProposal>;
  archive: (id: string) => Promise<RateCardProposal>;
  restore: (id: string) => Promise<RateCardProposal>;
  clearError: () => void;
};

function upsert(items: RateCardProposal[], row: RateCardProposal) {
  const i = items.findIndex((r) => r.id === row.id);
  if (i < 0) return [row, ...items];
  const next = items.slice();
  next[i] = row;
  return next;
}

export const useRateCardStore = create<RateCardStore>((set, get) => ({
  items: [],
  selected: null,
  locked: [],
  listLoading: false,
  detailLoading: false,
  actionPending: false,
  error: null,
  lastListKey: "",
  usingMock: USE_RATE_CARD_MOCK,

  clearError: () => set({ error: null }),

  loadList: async (filters, opts) => {
    const key = listKeyOf(filters);
    if (!opts?.force && get().lastListKey === key && get().items.length > 0) {
      return;
    }
    set({ listLoading: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK) {
        const rows = await listFromMock(filters);
        set({
          items: rows,
          listLoading: false,
          lastListKey: key,
          usingMock: true,
        });
        return;
      }

      const status =
        filters.status && filters.status !== "all" ? String(filters.status) : undefined;
      const kind = filters.kind && filters.kind !== "all" ? filters.kind : undefined;
      const programWide =
        Boolean(filters.programWide) ||
        status === "submitted" ||
        status === "approved" ||
        status === "returned";
      const rows = await listProgramRateCardProposals({
        status,
        kind,
        programWide,
        farmEstateId: programWide ? undefined : filters.farmEstateId,
        budgetYear: programWide ? undefined : filters.budgetYear,
      });

      if (rows.length === 0) {
        const seeded = await listFromMock(filters);
        set({
          items: seeded.length > 0 ? seeded : [],
          listLoading: false,
          lastListKey: key,
          usingMock: seeded.length > 0,
          error: seeded.length > 0 ? null : null,
        });
        return;
      }

      set({
        items: rows.map(mapDto),
        listLoading: false,
        lastListKey: key,
        usingMock: false,
      });
    } catch (err) {
      try {
        const seeded = await listFromMock(filters);
        set({
          items: seeded,
          listLoading: false,
          lastListKey: key,
          usingMock: true,
          error:
            seeded.length > 0
              ? null
              : err instanceof Error
                ? err.message
                : "Failed to load rate cards",
        });
      } catch {
        set({
          listLoading: false,
          error: err instanceof Error ? err.message : "Failed to load rate cards",
        });
      }
    }
  },

  loadOne: async (id) => {
    const cached = get().items.find((r) => r.id === id) || get().selected;
    if (cached?.id === id) {
      set({ selected: cached });
    }
    set({ detailLoading: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.getRateCardProposal(id);
        if (!row) {
          set({ detailLoading: false, selected: null, error: "Rate card not found" });
          return null;
        }
        set({
          selected: row,
          items: upsert(get().items, row),
          detailLoading: false,
          usingMock: true,
        });
        return row;
      }
      const row = mapDto(await getRateCardProposal(id));
      set({
        selected: row,
        items: upsert(get().items, row),
        detailLoading: false,
      });
      return row;
    } catch (err) {
      const seeded = await mock.getRateCardProposal(id);
      if (seeded) {
        set({
          selected: seeded,
          items: upsert(get().items, seeded),
          detailLoading: false,
          usingMock: true,
        });
        return seeded;
      }
      set({
        detailLoading: false,
        selected: null,
        error: err instanceof Error ? err.message : "Rate card not found",
      });
      return null;
    }
  },

  loadLocked: async (farmId, farmName, ctx) => {
    if (!farmId || farmId === "all") {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const resolved = resolveMockContext({
          programId: ctx?.programId,
          budgetYearId: ctx?.budgetYearId,
          farmEstateId: farmId,
          programWide: true,
        });
        const rows = await mock.listLockedBenchmarksForRateCard({
          programId: resolved.programId,
          budgetYearId: resolved.budgetYearId,
          farmAreaId: "all",
        });
        set({
          locked: rows.map((s) => {
            const e = mock.enrichSurvey(s);
            return {
              id: s.id,
              farmEstateId: s.farmAreaId,
              activityId: s.activityId,
              activityName: e.activity.name,
              kind: s.kind,
              recommendedRate: s.recommendedRate,
              proposedRate: s.proposedRate,
              lockedAt: s.lockedAt,
              neighbor1Name: s.neighbor1Name,
              neighbor2Name: s.neighbor2Name,
              neighbor1Rate: s.neighbor1Rate,
              neighbor2Rate: s.neighbor2Rate,
              farmAreaName: farmName || e.farmArea.name || null,
            };
          }),
        });
        return;
      }
      set({ locked: [] });
      return;
    }
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const resolved = resolveMockContext({
          programId: ctx?.programId,
          budgetYearId: ctx?.budgetYearId,
          farmEstateId: farmId,
        });
        const rows = await mock.listLockedBenchmarksForRateCard({
          programId: resolved.programId,
          budgetYearId: resolved.budgetYearId,
          farmAreaId: farmId,
        });
        set({
          locked: rows.map((s) => {
            const e = mock.enrichSurvey(s);
            return {
              id: s.id,
              farmEstateId: s.farmAreaId,
              activityId: s.activityId,
              activityName: e.activity.name,
              kind: s.kind,
              recommendedRate: s.recommendedRate,
              proposedRate: s.proposedRate,
              lockedAt: s.lockedAt,
              neighbor1Name: s.neighbor1Name,
              neighbor2Name: s.neighbor2Name,
              neighbor1Rate: s.neighbor1Rate,
              neighbor2Rate: s.neighbor2Rate,
              farmAreaName: farmName || e.farmArea.name || null,
            };
          }),
        });
        return;
      }
      const rows = await listLockedBenchmarks(farmId);
      set({
        locked: rows.map((r) => ({ ...r, farmAreaName: farmName || null })),
      });
    } catch (err) {
      set({
        locked: [],
        error: err instanceof Error ? err.message : "Failed to load locked benchmarks",
      });
    }
  },

  createFromSurvey: async (farmId, input) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.createRateCardProposal(
          { sourceSurveyId: input.sourceSurveyId },
          "spx",
        );
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
          usingMock: true,
        });
        return row;
      }
      const row = mapDto(await createRateCardFromSurvey(farmId, input));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Create failed",
      });
      throw err;
    }
  },

  update: async (id, patch) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.updateRateCardProposal(id, patch as never, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
        });
        return row;
      }
      const row = mapDto(await updateRateCardProposal(id, patch));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Update failed",
      });
      throw err;
    }
  },

  submit: async (id) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.submitRateCardProposal(id, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await submitRateCardProposal(id));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Submit failed",
      });
      throw err;
    }
  },

  approve: async (id) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.approveRateCardProposal(id, "asset_owner");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await approveRateCardProposal(id));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Approve failed",
      });
      throw err;
    }
  },

  reject: async (id, comment) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.returnRateCardProposal(id, comment, "asset_owner");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await rejectRateCardProposal(id, comment));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Reject failed",
      });
      throw err;
    }
  },

  archive: async (id) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.archiveRateCardProposal(id, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await archiveRateCardProposal(id));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Archive failed",
      });
      throw err;
    }
  },

  restore: async (id) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK || get().usingMock) {
        const row = await mock.restoreRateCardProposal(id, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await restoreRateCardProposal(id));
      set({
        items: upsert(get().items, row),
        selected: row,
        actionPending: false,
        lastListKey: "",
      });
      return row;
    } catch (err) {
      set({
        actionPending: false,
        error: err instanceof Error ? err.message : "Restore failed",
      });
      throw err;
    }
  },
}));
