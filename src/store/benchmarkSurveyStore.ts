import { create } from "zustand";
import { listActivities } from "@/lib/api/activities";
import {
  createBenchmarkSurvey as apiCreateBenchmarkSurvey,
  getBenchmarkSurvey as apiGetBenchmarkSurvey,
  listFarms as apiListFarms,
  listProgramBenchmarkSurveys as apiListProgramBenchmarkSurveys,
  lockBenchmarkSurvey as apiLockBenchmarkSurvey,
  updateBenchmarkSurvey as apiUpdateBenchmarkSurvey,
  type ActivitySummary,
  type BenchmarkSurvey,
  type FarmSummary,
} from "@/lib/api/benchmark-surveys";
import * as mock from "@/lib/mock-api/rate-card-workflow";
import type {
  BenchmarkSurveyRecord,
  StandingKind,
  WorkflowStatus,
} from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";

function kindToTier(kind: StandingKind): 1 | 2 | 3 {
  if (kind === "materials") return 2;
  if (kind === "services") return 3;
  return 1;
}

function toActivitySummary(row: {
  id: string;
  name: string;
  tier?: number;
  category?: string;
  unitOfMeasure?: string;
  code?: string;
}): ActivitySummary {
  return {
    id: row.id,
    code: row.code || row.id,
    name: row.name,
    tier: row.tier,
    category: row.category,
    unitOfMeasure: row.unitOfMeasure,
  };
}

export type BenchmarkListFilters = {
  status?: WorkflowStatus | "all";
  kind?: StandingKind | "all";
  farmEstateId?: string;
  programWide?: boolean;
  programId?: string;
  budgetYearId?: string;
};

function mapDto(s: BenchmarkSurvey, budgetYearId = String(new Date().getFullYear())): BenchmarkSurveyRecord {
  const kind = (s.kind as StandingKind) || "labor";
  return {
    id: s.id,
    programId: s.programId || "",
    budgetYearId,
    farmAreaId: s.farmEstateId || s.farmId || s.farmAreaId || "",
    farmAreaName: s.farmEstateName || null,
    activityId: s.activityId,
    kind,
    neighbor1Name: s.neighbor1Name || "",
    neighbor2Name: s.neighbor2Name || "",
    neighbor1Rate: s.neighbor1Rate ?? 0,
    neighbor2Rate: s.neighbor2Rate ?? 0,
    lockedAt: s.lockedAt,
    recommendedRate: s.recommendedRate ?? 0,
    proposedRate: s.proposedRate ?? s.recommendedRate ?? 0,
    variancePct: null,
    flagged: false,
    availableFrom: "",
    availableTo: s.availableTo ?? null,
    fallbackRate: null,
    justificationNote: "",
    surveyDate: s.createdAt?.slice(0, 10) || "",
    sourceEvidence: s.sourceEvidence || "",
    notes: s.notes || "",
    status: s.status as WorkflowStatus,
    returnComment: s.returnComment,
    submittedAt: s.submittedAt,
    approvedAt: s.approvedAt,
    approvedByName: null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    activityCode: s.activityCode,
    activityName: s.activityName,
    activityUnit: s.activityUnit,
    activityTier: s.activityTier,
  } as BenchmarkSurveyRecord & {
    activityCode?: string | null;
    activityName?: string | null;
    activityUnit?: string | null;
    activityTier?: number | null;
  };
}

function listKeyOf(f: BenchmarkListFilters) {
  return JSON.stringify({
    status: f.status ?? "all",
    kind: f.kind ?? "all",
    farmEstateId: f.programWide ? "" : f.farmEstateId ?? "",
    programWide: Boolean(f.programWide),
    programId: f.programId ?? "",
    budgetYearId: f.budgetYearId ?? "",
  });
}

function upsert(items: BenchmarkSurveyRecord[], row: BenchmarkSurveyRecord) {
  const i = items.findIndex((r) => r.id === row.id);
  if (i < 0) return [row, ...items];
  const next = items.slice();
  next[i] = row;
  return next;
}

function resolveMockProgramYear(filters: BenchmarkListFilters) {
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
  return { programId, budgetYearId };
}

type BenchmarkSurveyStore = {
  items: BenchmarkSurveyRecord[];
  selected: BenchmarkSurveyRecord | null;
  farms: FarmSummary[];
  /** Activities from Activity Taxonomy for the selected kind + category. */
  activities: ActivitySummary[];
  /** Distinct taxonomy categories for the selected kind (tier). */
  categories: string[];
  listLoading: boolean;
  detailLoading: boolean;
  actionPending: boolean;
  error: string | null;
  lastListKey: string;
  loadList: (filters: BenchmarkListFilters, opts?: { force?: boolean }) => Promise<void>;
  loadOne: (id: string) => Promise<BenchmarkSurveyRecord | null>;
  loadFarms: (programId?: string) => Promise<FarmSummary[]>;
  /**
   * Load Activity Taxonomy rows for a kind (tier).
   * Pass `category` to filter the activity picker; omit to refresh category options.
   */
  loadActivities: (kind: StandingKind, category?: string) => Promise<void>;
  create: (
    farmId: string,
    input: {
      activityId: string;
      kind?: StandingKind;
      neighbor1Name: string;
      neighbor2Name: string;
      neighbor1Rate: number;
      neighbor2Rate: number;
      sourceEvidence?: string;
      notes?: string;
      surveyDate?: string;
      programId?: string;
      budgetYearId?: string;
    },
  ) => Promise<BenchmarkSurveyRecord>;
  update: (id: string, patch: Record<string, unknown>) => Promise<BenchmarkSurveyRecord>;
  lock: (id: string) => Promise<BenchmarkSurveyRecord>;
  clearError: () => void;
};

export const useBenchmarkSurveyStore = create<BenchmarkSurveyStore>((set, get) => ({
  items: [],
  selected: null,
  farms: [],
  activities: [],
  categories: [],
  listLoading: false,
  detailLoading: false,
  actionPending: false,
  error: null,
  lastListKey: "",

  clearError: () => set({ error: null }),

  loadList: async (filters, opts) => {
    const key = listKeyOf(filters);
    if (!opts?.force && get().lastListKey === key && get().items.length > 0) return;
    set({ listLoading: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK) {
        const { programId, budgetYearId } = resolveMockProgramYear(filters);
        const rows = await mock.listBenchmarkSurveys({
          programId,
          budgetYearId,
          farmAreaId: filters.programWide || !filters.farmEstateId ? "all" : filters.farmEstateId,
          status: filters.status,
          kind: filters.kind,
        });
        set({ items: rows, listLoading: false, lastListKey: key });
        return;
      }

      const status =
        filters.status && filters.status !== "all" ? String(filters.status) : undefined;
      const kind = filters.kind && filters.kind !== "all" ? filters.kind : undefined;
      const programWide = Boolean(filters.programWide) || !filters.farmEstateId;
      const rows = await apiListProgramBenchmarkSurveys({
        status,
        kind,
        programWide,
        farmEstateId: programWide ? undefined : filters.farmEstateId,
      });
      set({
        items: rows.map((r) => mapDto(r)),
        listLoading: false,
        lastListKey: key,
      });
    } catch (err) {
      set({
        listLoading: false,
        error: err instanceof Error ? err.message : "Failed to load benchmarks",
      });
    }
  },

  loadOne: async (id) => {
    const cached = get().items.find((r) => r.id === id) || get().selected;
    if (cached?.id === id) set({ selected: cached });
    set({ detailLoading: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK) {
        const row = await mock.getBenchmarkSurvey(id);
        if (!row) {
          set({ detailLoading: false, selected: null, error: "Survey not found" });
          return null;
        }
        set({
          selected: row,
          items: upsert(get().items, row),
          detailLoading: false,
        });
        return row;
      }
      const row = mapDto(await apiGetBenchmarkSurvey(id));
      set({
        selected: row,
        items: upsert(get().items, row),
        detailLoading: false,
      });
      return row;
    } catch (err) {
      set({
        detailLoading: false,
        selected: null,
        error: err instanceof Error ? err.message : "Survey not found",
      });
      return null;
    }
  },

  loadFarms: async (programId) => {
    try {
      if (USE_RATE_CARD_MOCK) {
        const areas = mock.getWorkflowFarmAreas(programId);
        const farms: FarmSummary[] = areas.map((a) => ({
          id: a.id,
          name: a.name,
          approverUserId: null,
          status: "active",
          isApprover: false,
        }));
        set({ farms });
        return farms;
      }
      const farms = await apiListFarms();
      set({ farms });
      return farms;
    } catch (err) {
      set({
        farms: [],
        error: err instanceof Error ? err.message : "Failed to load farms",
      });
      return [];
    }
  },

  loadActivities: async (kind, category) => {
    const tier = kindToTier(kind);
    try {
      let forTier: ActivitySummary[] = [];
      try {
        const rows = await listActivities({ tier });
        forTier = rows.map((a) =>
          toActivitySummary({
            id: a.id,
            code: a.id,
            name: a.name,
            tier: a.tier,
            category: a.category,
            unitOfMeasure: a.unitOfMeasure,
          }),
        );
        if (USE_RATE_CARD_MOCK) {
          for (const a of forTier) {
            mock.registerWorkflowActivity({
              id: a.id,
              code: a.code,
              name: a.name,
              category: a.category || kind,
              unitOfMeasure: a.unitOfMeasure,
              tier: a.tier ?? tier,
            });
          }
        }
      } catch {
        if (!USE_RATE_CARD_MOCK) {
          set({ activities: [], categories: [] });
          return;
        }
        forTier = mock.getWorkflowActivities(kind).map((a) =>
          toActivitySummary({
            id: a.id,
            code: a.code,
            name: a.name,
            tier: a.tier,
            category: a.category,
            unitOfMeasure: a.uom,
          }),
        );
      }

      const categories = Array.from(
        new Set(
          forTier
            .map((a) => a.category)
            .filter((c): c is string => Boolean(c?.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b));

      const activities = category
        ? forTier.filter((a) => a.category === category)
        : [];

      set({ activities, categories });
    } catch {
      set({ activities: [], categories: [] });
    }
  },

  create: async (farmId, input) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK) {
        const { programId, budgetYearId } = resolveMockProgramYear({
          programId: input.programId,
          budgetYearId: input.budgetYearId,
        });
        const selected = get().activities.find((a) => a.id === input.activityId);
        if (selected) {
          mock.registerWorkflowActivity({
            id: selected.id,
            code: selected.code,
            name: selected.name,
            category: selected.category || input.kind || "labor",
            unitOfMeasure: selected.unitOfMeasure,
            tier: selected.tier ?? kindToTier(input.kind || "labor"),
          });
        }
        const kind =
          input.kind ||
          (mock.getWorkflowActivities("labor").some((a) => a.id === input.activityId)
            ? "labor"
            : mock.getWorkflowActivities("materials").some((a) => a.id === input.activityId)
              ? "materials"
              : "services");
        const row = await mock.createBenchmarkSurvey(
          {
            programId,
            budgetYearId,
            farmAreaId: farmId,
            activityId: input.activityId,
            kind,
            neighbor1Name: input.neighbor1Name,
            neighbor2Name: input.neighbor2Name,
            neighbor1Rate: input.neighbor1Rate,
            neighbor2Rate: input.neighbor2Rate,
            surveyDate: input.surveyDate || new Date().toISOString().slice(0, 10),
            sourceEvidence: input.sourceEvidence || "",
            notes: input.notes || "",
          },
          "spx",
        );
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }

      const row = mapDto(
        await apiCreateBenchmarkSurvey(farmId, {
          activityId: input.activityId,
          neighbor1Name: input.neighbor1Name,
          neighbor2Name: input.neighbor2Name,
          neighbor1Rate: input.neighbor1Rate,
          neighbor2Rate: input.neighbor2Rate,
          sourceEvidence: input.sourceEvidence,
          notes: input.notes,
        }),
      );
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
      if (USE_RATE_CARD_MOCK) {
        const row = await mock.updateBenchmarkSurvey(id, patch as never, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
        });
        return row;
      }
      const row = mapDto(await apiUpdateBenchmarkSurvey(id, patch));
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

  lock: async (id) => {
    set({ actionPending: true, error: null });
    try {
      if (USE_RATE_CARD_MOCK) {
        const row = await mock.lockBenchmarkSurvey(id, "spx");
        set({
          items: upsert(get().items, row),
          selected: row,
          actionPending: false,
          lastListKey: "",
        });
        return row;
      }
      const row = mapDto(await apiLockBenchmarkSurvey(id));
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
        error: err instanceof Error ? err.message : "Lock failed",
      });
      throw err;
    }
  },
}));
