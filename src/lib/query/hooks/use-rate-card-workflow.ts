"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveBenchmarkSurvey as apiApproveSurvey,
  createBenchmarkSurvey as apiCreateSurvey,
  getBenchmarkSurvey as apiGetSurvey,
  listBenchmarkSurveys as apiListSurveys,
  listFarmActivities,
  listFarms,
  lockBenchmarkSurvey as apiLockSurvey,
  rejectBenchmarkSurvey as apiRejectSurvey,
  submitBenchmarkSurvey as apiSubmitSurvey,
  updateBenchmarkSurvey as apiUpdateSurvey,
  getResolvedLaborRate,
  listLaborRateCards,
  listMaterialRateCards,
  listServiceRateCards,
} from "@/lib/api/benchmark-surveys";
import {
  approveRateCardProposal as apiApproveProposal,
  archiveRateCardProposal as apiArchiveProposal,
  createRateCardFromSurvey as apiCreateFromSurvey,
  createRateCardImport as apiCreateImport,
  getRateCardProposal as apiGetProposal,
  listLockedBenchmarks as apiListLocked,
  listRateCardProposals as apiListProposals,
  rejectRateCardProposal as apiRejectProposal,
  restoreRateCardProposal as apiRestoreProposal,
  submitRateCardProposal as apiSubmitProposal,
  updateRateCardProposal as apiUpdateProposal,
} from "@/lib/api/rate-card-proposals";
import * as mock from "@/lib/mock-api/rate-card-workflow";
import type {
  RateCardProposal,
  StandingKind,
  WorkflowContextFilters,
  WorkflowStatus,
} from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { queryKeys } from "@/lib/query/keys";
import type { RateCardProposalDto } from "@/lib/api/rate-card-proposals";

export { USE_RATE_CARD_MOCK };

function mapProposal(dto: RateCardProposalDto): RateCardProposal {
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
  };
}

const keys = {
  all: ["rate-card-workflow"] as const,
  programs: () => [...keys.all, "programs"] as const,
  years: (programId: string) => [...keys.all, "years", programId] as const,
  areas: (programId: string) => [...keys.all, "areas", programId] as const,
  blocks: (farmAreaId: string) => [...keys.all, "blocks", farmAreaId] as const,
  activities: (kind?: StandingKind) => [...keys.all, "activities", kind ?? "all"] as const,
  checker: (programId: string) => [...keys.all, "checker", programId] as const,
  surveys: (f: WorkflowContextFilters & { status?: string }) =>
    [...keys.all, "surveys", f] as const,
  survey: (id: string) => [...keys.all, "survey", id] as const,
  rateCards: (f: WorkflowContextFilters & { status?: string; kind?: string }) =>
    [...keys.all, "rate-cards", f] as const,
  rateCard: (id: string) => [...keys.all, "rate-card", id] as const,
  standing: (f: WorkflowContextFilters & { kind: StandingKind; includeArchived?: boolean }) =>
    [...keys.all, "standing", f] as const,
  versions: (id: string) => [...keys.all, "versions", id] as const,
  audit: (entityId: string) => [...keys.all, "audit", entityId] as const,
  resolve: (q: Record<string, string | null | undefined>) => [...keys.all, "resolve", q] as const,
};

function farmIdOf(filters: WorkflowContextFilters) {
  return filters.farmAreaId === "all" ? "" : filters.farmAreaId;
}

function budgetYearOf(filters: WorkflowContextFilters) {
  const n = Number(String(filters.budgetYearId).replace(/\D/g, "").slice(0, 4));
  return Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear();
}

function useInvalidateWorkflow() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.all });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void qc.invalidateQueries({ queryKey: queryKeys.benchmarkSurveys.all });
    void qc.invalidateQueries({ queryKey: queryKeys.farms.all });
  };
}

export function useWorkflowPrograms() {
  const { activeProgram } = useCropfortAuth();
  return useQuery({
    queryKey: keys.programs(),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getWorkflowPrograms();
      if (!activeProgram) return [];
      return [{ id: activeProgram.id, name: activeProgram.name }];
    },
    enabled: USE_RATE_CARD_MOCK || Boolean(activeProgram),
  });
}

export function useWorkflowBudgetYears(programId: string) {
  const year = new Date().getFullYear();
  return useQuery({
    queryKey: keys.years(programId),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getWorkflowBudgetYears(programId);
      return [year - 1, year, year + 1].map((y) => ({
        id: String(y),
        name: String(y),
        programId,
      }));
    },
    enabled: Boolean(programId),
  });
}

export function useWorkflowFarmAreas(programId: string) {
  return useQuery({
    queryKey: keys.areas(programId),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getWorkflowFarmAreas(programId);
      const farms = await listFarms();
      return farms.map((f) => ({ id: f.id, name: f.name, programId }));
    },
    enabled: Boolean(programId),
  });
}

export function useWorkflowBlocks(farmAreaId: string | null) {
  return useQuery({
    queryKey: keys.blocks(farmAreaId || "none"),
    queryFn: async () => mock.getWorkflowBlocks(farmAreaId || undefined),
    enabled: USE_RATE_CARD_MOCK && Boolean(farmAreaId),
  });
}

export function useWorkflowActivities(kind?: StandingKind) {
  const { activeProgram } = useCropfortAuth();
  return useQuery({
    queryKey: keys.activities(kind),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getWorkflowActivities(kind);
      // Prefer farm-scoped list when we have a farm in session later; platform list via farms needs farmId.
      // Use first farm for activity taxonomy if available.
      const farms = await listFarms();
      const farmId = farms[0]?.id;
      if (!farmId) return [];
      const tier =
        kind === "labor" ? 1 : kind === "materials" ? 2 : kind === "services" ? 3 : undefined;
      const rows = await listFarmActivities(farmId);
      // listFarmActivities defaults tier 1 — call with query via raw if needed
      void tier;
      void activeProgram;
      return rows.map((a) => ({
        id: a.id,
        code: a.code || a.id,
        name: a.name,
        tier: 1 as number,
        category: "Labor",
        uom: "unit",
        defaultNorm: null as number | null,
        defaultWage: null as number | null,
      }));
    },
    enabled: true,
  });
}

export function useEligibleChecker(programId: string, farmAreaId?: string | null) {
  return useQuery({
    queryKey: keys.checker(`${programId}:${farmAreaId ?? "default"}`),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getEligibleChecker(programId, farmAreaId);
      const farms = await listFarms();
      const farm = farmAreaId ? farms.find((f) => f.id === farmAreaId) : farms.find((f) => f.isApprover);
      return {
        userId: farm?.approverUserId || "ao",
        name: farm?.isApprover ? "You (farm approver)" : "Chaka Buna reviewer",
        roleLabel: "Chaka Buna reviewer",
        orgName: "Asset owner",
        assignmentLabel: farm?.name || "Program",
      };
    },
    enabled: Boolean(programId),
  });
}

function mapSurvey(
  s: Awaited<ReturnType<typeof apiGetSurvey>>,
  filters?: WorkflowContextFilters,
) {
  const farmId = s.farmEstateId || s.farmId || filters?.farmAreaId || "";
  return {
    id: s.id,
    programId: s.programId || filters?.programId || "",
    budgetYearId: filters?.budgetYearId || String(new Date().getFullYear()),
    farmAreaId: farmId,
    activityId: s.activityId,
    kind: (s.kind as StandingKind) || "labor",
    neighbor1Name: s.neighbor1Name || "",
    neighbor2Name: s.neighbor2Name || "",
    neighbor1Rate: s.neighbor1Rate ?? 0,
    neighbor2Rate: s.neighbor2Rate ?? 0,
    lockedAt: s.lockedAt,
    recommendedRate: s.recommendedRate,
    proposedRate: s.proposedRate ?? s.recommendedRate ?? 0,
    variancePct: null as number | null,
    flagged: false,
    availableFrom: "",
    availableTo: s.validUntil ? s.validUntil.slice(0, 10) : s.availableTo ?? null,
    fallbackRate: null as number | null,
    justificationNote: "",
    surveyDate: s.createdAt?.slice(0, 10) || "",
    sourceEvidence: s.sourceEvidence || "",
    notes: s.notes || "",
    status: s.status as WorkflowStatus,
    returnComment: s.returnComment ?? null,
    submittedAt: s.submittedAt,
    approvedAt: s.approvedAt,
    approvedByName: null as string | null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    activityCode: s.activityCode,
    activityName: s.activityName,
    activityUnit: s.activityUnit,
    activityTier: s.activityTier,
  };
}

export function useMockBenchmarkSurveys(
  filters: WorkflowContextFilters & {
    status?: WorkflowStatus | "all";
    kind?: StandingKind | "all";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: keys.surveys(filters),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.listBenchmarkSurveys(filters);
      const farmId = farmIdOf(filters);
      if (!farmId) return [];
      const rows = await apiListSurveys(farmId, {
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        kind: filters.kind && filters.kind !== "all" ? filters.kind : undefined,
      });
      return rows.map((s) => mapSurvey(s, filters));
    },
    enabled: enabled && Boolean(filters.programId) && Boolean(farmIdOf(filters)),
  });
}

export function useMockBenchmarkSurvey(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.survey(id),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getBenchmarkSurvey(id);
      return mapSurvey(await apiGetSurvey(id));
    },
    enabled: enabled && Boolean(id),
  });
}

export function useMockRateCardProposals(
  filters: WorkflowContextFilters & {
    status?: WorkflowStatus | "all";
    kind?: StandingKind | "all";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: keys.rateCards(filters),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.listRateCardProposals(filters);
      const farmId = farmIdOf(filters);
      const statusOpt =
        filters.status && filters.status !== "all" ? String(filters.status) : undefined;
      const kindOpt = filters.kind && filters.kind !== "all" ? filters.kind : undefined;
      // Reviewer lists: ignore farm + budget-year; scan all farms in the program.
      const programWide =
        statusOpt === "submitted" || statusOpt === "approved" || statusOpt === "returned";
      const listOpts = {
        status: statusOpt,
        kind: kindOpt,
        ...(programWide ? {} : { budgetYear: budgetYearOf(filters) }),
      };

      if (programWide) {
        const farms = await listFarms();
        if (farms.length === 0) return [];
        const nested = await Promise.all(farms.map((f) => apiListProposals(f.id, listOpts)));
        return nested.flat().map(mapProposal);
      }

      if (!farmId) {
        const farms = await listFarms();
        if (farms.length === 0) return [];
        const nested = await Promise.all(
          farms.map((f) =>
            apiListProposals(f.id, {
              ...listOpts,
              budgetYear: budgetYearOf(filters),
            }),
          ),
        );
        return nested.flat().map(mapProposal);
      }

      const rows = await apiListProposals(farmId, listOpts);
      return rows.map(mapProposal);
    },
    enabled: enabled && Boolean(filters.programId),
  });
}

export function useMockRateCardProposal(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.rateCard(id),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.getRateCardProposal(id);
      return mapProposal(await apiGetProposal(id));
    },
    enabled: enabled && Boolean(id),
  });
}

export function useLockedBenchmarksForRateCard(
  filters: WorkflowContextFilters & { kind?: StandingKind | "all" },
  enabled = true,
) {
  return useQuery({
    queryKey: [...keys.all, "locked", filters],
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.listLockedBenchmarksForRateCard(filters);
      const farmId = farmIdOf(filters);
      if (!farmId) return [];
      const farms = await listFarms();
      const farmName = farms.find((f) => f.id === farmId)?.name || null;
      const rows = await apiListLocked(farmId, {
        kind: filters.kind && filters.kind !== "all" ? filters.kind : undefined,
      });
      return rows.map((s) => ({
        id: s.id,
        programId: filters.programId,
        budgetYearId: filters.budgetYearId,
        farmAreaId: s.farmEstateId,
        farmAreaName: farmName,
        activityId: s.activityId,
        kind: (s.kind as StandingKind) || "labor",
        neighbor1Name: s.neighbor1Name || "",
        neighbor2Name: s.neighbor2Name || "",
        neighbor1Rate: s.neighbor1Rate ?? 0,
        neighbor2Rate: s.neighbor2Rate ?? 0,
        lockedAt: s.lockedAt,
        recommendedRate: s.recommendedRate,
        proposedRate: s.proposedRate ?? s.recommendedRate ?? 0,
        variancePct: null as number | null,
        flagged: false,
        availableFrom: "",
        availableTo: null as string | null,
        fallbackRate: null as number | null,
        justificationNote: "",
        surveyDate: "",
        sourceEvidence: "",
        notes: "",
        status: "draft" as WorkflowStatus,
        createdAt: s.lockedAt || "",
        updatedAt: s.lockedAt || "",
        activityName: s.activityName,
      }));
    },
    enabled: enabled && Boolean(filters.programId),
  });
}

export function useStandingLines(
  filters: WorkflowContextFilters & { kind: StandingKind; includeArchived?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: keys.standing(filters),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.listStandingLines(filters);
      const farmId = farmIdOf(filters);
      if (!farmId) return [];
      if (filters.kind === "labor") return listLaborRateCards(farmId);
      if (filters.kind === "materials") return listMaterialRateCards(farmId);
      return listServiceRateCards(farmId);
    },
    enabled: enabled && Boolean(filters.programId),
  });
}

export function useStandingVersions(lineId: string, enabled = true) {
  return useQuery({
    queryKey: keys.versions(lineId),
    queryFn: async () => (USE_RATE_CARD_MOCK ? mock.listStandingVersions(lineId) : []),
    enabled: USE_RATE_CARD_MOCK && enabled && Boolean(lineId),
  });
}

export function useWorkflowAudit(entityId: string, enabled = true) {
  return useQuery({
    queryKey: keys.audit(entityId),
    queryFn: async () => (USE_RATE_CARD_MOCK ? mock.listAuditEvents(entityId) : []),
    enabled: USE_RATE_CARD_MOCK && enabled && Boolean(entityId),
  });
}

export function useAllWorkflowAudit(enabled = true) {
  return useQuery({
    queryKey: [...keys.audit("all")],
    queryFn: async () => (USE_RATE_CARD_MOCK ? mock.listAllAuditEvents() : []),
    enabled: USE_RATE_CARD_MOCK && enabled,
  });
}

export function useResolveRate(
  input: {
    programId: string;
    budgetYearId: string;
    activityId: string | null;
    farmAreaId?: string | null;
    blockId?: string | null;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: keys.resolve({
      programId: input.programId,
      budgetYearId: input.budgetYearId,
      activityId: input.activityId,
      farmAreaId: input.farmAreaId,
      blockId: input.blockId,
    }),
    queryFn: async () => {
      if (USE_RATE_CARD_MOCK) return mock.resolveRate(input);
      if (!input.farmAreaId || !input.activityId) return null;
      return getResolvedLaborRate(input.farmAreaId, input.activityId);
    },
    enabled:
      enabled &&
      Boolean(input.programId && input.budgetYearId && input.activityId && input.farmAreaId),
  });
}

export function useCreateMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      party,
      input,
    }: {
      party?: "spx" | "asset_owner";
      input: {
        programId: string;
        budgetYearId: string;
        farmAreaId: string;
        activityId: string;
        kind: StandingKind;
        neighbor1Name: string;
        neighbor2Name: string;
        neighbor1Rate: number;
        neighbor2Rate: number;
        surveyDate?: string;
        sourceEvidence: string;
        notes: string;
      };
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.createBenchmarkSurvey(input, party);
      return mapSurvey(
        await apiCreateSurvey(input.farmAreaId, {
          activityId: input.activityId,
          neighbor1Name: input.neighbor1Name,
          neighbor2Name: input.neighbor2Name,
          neighbor1Rate: input.neighbor1Rate,
          neighbor2Rate: input.neighbor2Rate,
          sourceEvidence: input.sourceEvidence,
          notes: input.notes,
        }),
        {
          programId: input.programId,
          budgetYearId: input.budgetYearId,
          farmAreaId: input.farmAreaId,
        },
      );
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      id,
      party,
      patch,
    }: {
      id: string;
      party?: "spx" | "asset_owner";
      patch: Record<string, unknown>;
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.updateBenchmarkSurvey(id, patch as never, party);
      return mapSurvey(await apiUpdateSurvey(id, patch));
    },
    onSuccess: () => invalidate(),
  });
}

export function useLockMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.lockBenchmarkSurvey(id, party);
      return mapSurvey(await apiLockSurvey(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useSubmitMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.submitBenchmarkSurvey(id, party);
      return mapSurvey(await apiSubmitSurvey(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useApproveMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.approveBenchmarkSurvey(id, party);
      return mapSurvey(await apiApproveSurvey(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useReturnMockBenchmarkSurvey() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      id,
      comment,
      party,
    }: {
      id: string;
      comment: string;
      party?: "spx" | "asset_owner";
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.returnBenchmarkSurvey(id, comment, party);
      return mapSurvey(await apiRejectSurvey(id, comment));
    },
    onSuccess: () => invalidate(),
  });
}

export function useCreateMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      party,
      input,
      farmId,
    }: {
      party?: "spx" | "asset_owner";
      farmId?: string;
      input: { sourceSurveyId: string; budgetYear?: number } & Record<string, unknown>;
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.createRateCardProposal(input as never, party);
      if (!farmId) throw new Error("Select a farm area before creating a rate card");
      return mapProposal(
        await apiCreateFromSurvey(farmId, {
          sourceSurveyId: input.sourceSurveyId,
          budgetYear: input.budgetYear,
        }),
      );
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      party,
    }: {
      id: string;
      patch: Record<string, unknown>;
      party?: "spx" | "asset_owner";
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.updateRateCardProposal(id, patch as never, party);
      return mapProposal(await apiUpdateProposal(id, patch));
    },
    onSuccess: () => invalidate(),
  });
}

export function useSubmitMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.submitRateCardProposal(id, party);
      return mapProposal(await apiSubmitProposal(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useApproveMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.approveRateCardProposal(id, party);
      return mapProposal(await apiApproveProposal(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useReturnMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({
      id,
      comment,
      party,
    }: {
      id: string;
      comment: string;
      party?: "spx" | "asset_owner";
    }) => {
      if (USE_RATE_CARD_MOCK) return mock.returnRateCardProposal(id, comment, party);
      return mapProposal(await apiRejectProposal(id, comment));
    },
    onSuccess: () => invalidate(),
  });
}

export function useArchiveMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.archiveRateCardProposal(id, party);
      return mapProposal(await apiArchiveProposal(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useRestoreMockRateCardProposal() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: async ({ id, party }: { id: string; party?: "spx" | "asset_owner" }) => {
      if (USE_RATE_CARD_MOCK) return mock.restoreRateCardProposal(id, party);
      return mapProposal(await apiRestoreProposal(id));
    },
    onSuccess: () => invalidate(),
  });
}

export function useReviseStandingLine() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof mock.reviseStandingLine>[1];
    }) => mock.reviseStandingLine(id, patch),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveStandingLine() {
  const invalidate = useInvalidateWorkflow();
  return useMutation({
    mutationFn: mock.archiveStandingLine,
    onSuccess: () => invalidate(),
  });
}

/** Used by import dialog against live API. */
export { apiCreateImport as createRateCardImportApi };
