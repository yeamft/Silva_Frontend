/**
 * Farm-scoped benchmark surveys + standing rate cards + resolveLaborRate.
 */
import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

async function call<T>(path: string, options?: Parameters<typeof apiFetch>[1]): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    throw asError(err);
  }
}

export type FarmSummary = {
  id: string;
  name: string;
  approverUserId: string | null;
  status: string;
  isApprover: boolean;
};

export type ActivitySummary = {
  id: string;
  code: string;
  name: string;
  tier?: number;
  category?: string;
  unitOfMeasure?: string;
};

export type BenchmarkSurveyStatus = "draft" | "submitted" | "approved" | "returned";

export type BenchmarkSurvey = {
  id: string;
  programId?: string;
  farmId: string;
  farmEstateId: string;
  farmAreaId?: string;
  farmEstateName?: string | null;
  activityId: string;
  activityCode: string | null;
  activityName: string | null;
  activityUnit?: string | null;
  activityTier?: number | null;
  kind?: string | null;
  neighbor1Name: string | null;
  neighbor2Name: string | null;
  neighbor1Rate: number | null;
  neighbor2Rate: number | null;
  lockedAt: string | null;
  recommendedRate: number | null;
  proposedRate: number | null;
  sourceEvidence?: string;
  notes?: string;
  status: BenchmarkSurveyStatus;
  returnComment?: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  validUntil: string | null;
  availableTo?: string | null;
  approverUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedLaborRate = {
  rate: number;
  source: "benchmark" | "norm_wage";
  surveyId?: string;
  laborRateCardId?: string;
  validUntil?: string | null;
  normMandayPerUnit?: number;
  wageRatePerManday?: number;
};

export type LaborStandingCard = {
  id: string;
  farmId: string;
  activityId: string;
  activityCode: string | null;
  activityName: string | null;
  normMandayPerUnit: number | null;
  wageRatePerManday: number | null;
  effectiveRate: number | null;
};

export type StandingCard = {
  id: string;
  farmId: string;
  activityId: string;
  activityCode: string | null;
  activityName: string | null;
  unit: string;
  rate: number | null;
  currency: string;
};

export const listFarms = () => call<FarmSummary[]>("/farms");
export const listFarmActivities = (farmId: string, opts?: { tier?: number | "all" }) => {
  const q = new URLSearchParams();
  if (opts?.tier === "all") q.set("tier", "all");
  else if (opts?.tier != null) q.set("tier", String(opts.tier));
  const qs = q.toString();
  return call<ActivitySummary[]>(`/farms/${farmId}/activities${qs ? `?${qs}` : ""}`);
};

export const listBenchmarkSurveys = (
  farmId: string,
  opts?: { activityId?: string; status?: string; kind?: string },
) => {
  const q = new URLSearchParams();
  if (opts?.activityId) q.set("activityId", opts.activityId);
  if (opts?.status) q.set("status", opts.status);
  if (opts?.kind) q.set("kind", opts.kind);
  const qs = q.toString();
  return call<BenchmarkSurvey[]>(`/farms/${farmId}/benchmark-surveys${qs ? `?${qs}` : ""}`);
};

/** Single-request list for the active program (all farms). Prefer over farm fan-out. */
export const listProgramBenchmarkSurveys = (opts?: {
  status?: string;
  kind?: string;
  farmEstateId?: string;
  activityId?: string;
  programWide?: boolean;
}) => {
  const q = new URLSearchParams();
  if (opts?.status) q.set("status", opts.status);
  if (opts?.kind) q.set("kind", opts.kind);
  if (opts?.farmEstateId) q.set("farmEstateId", opts.farmEstateId);
  if (opts?.activityId) q.set("activityId", opts.activityId);
  if (opts?.programWide) q.set("programWide", "1");
  const qs = q.toString();
  return call<BenchmarkSurvey[]>(`/benchmark-surveys${qs ? `?${qs}` : ""}`);
};

export const getBenchmarkSurvey = (id: string) => call<BenchmarkSurvey>(`/benchmark-surveys/${id}`);

export const createBenchmarkSurvey = (
  farmId: string,
  input: {
    activityId: string;
    neighbor1Name: string;
    neighbor2Name: string;
    neighbor1Rate: number;
    neighbor2Rate: number;
    proposedRate?: number;
    sourceEvidence?: string;
    notes?: string;
  },
) => call<BenchmarkSurvey>(`/farms/${farmId}/benchmark-surveys`, { method: "POST", body: input });

export const updateBenchmarkSurvey = (id: string, input: Record<string, unknown>) =>
  call<BenchmarkSurvey>(`/benchmark-surveys/${id}`, { method: "PATCH", body: input });

export const lockBenchmarkSurvey = (id: string) =>
  call<BenchmarkSurvey>(`/benchmark-surveys/${id}/lock`, { method: "POST" });
export const submitBenchmarkSurvey = (id: string) =>
  call<BenchmarkSurvey>(`/benchmark-surveys/${id}/submit`, { method: "POST" });
export const approveBenchmarkSurvey = (id: string) =>
  call<BenchmarkSurvey>(`/benchmark-surveys/${id}/approve`, { method: "POST" });
export const rejectBenchmarkSurvey = (id: string, comment: string) =>
  call<BenchmarkSurvey>(`/benchmark-surveys/${id}/reject`, {
    method: "POST",
    body: { comment },
  });

export const getResolvedLaborRate = (farmId: string, activityId: string) =>
  call<ResolvedLaborRate>(`/farms/${farmId}/activities/${activityId}/resolved-rate`);

export const listLaborRateCards = (farmId: string) =>
  call<LaborStandingCard[]>(`/farms/${farmId}/labor-rate-cards`);
export const createLaborRateCard = (
  farmId: string,
  input: { activityId: string; normMandayPerUnit: number; wageRatePerManday: number },
) => call<LaborStandingCard>(`/farms/${farmId}/labor-rate-cards`, { method: "POST", body: input });
export const updateLaborRateCard = (farmId: string, id: string, input: Record<string, unknown>) =>
  call<LaborStandingCard>(`/farms/${farmId}/labor-rate-cards/${id}`, { method: "PATCH", body: input });

export const listMaterialRateCards = (farmId: string) =>
  call<StandingCard[]>(`/farms/${farmId}/material-rate-cards`);
export const createMaterialRateCard = (
  farmId: string,
  input: { activityId: string; unit: string; rate: number; currency?: string },
) => call<StandingCard>(`/farms/${farmId}/material-rate-cards`, { method: "POST", body: input });
export const updateMaterialRateCard = (farmId: string, id: string, input: Record<string, unknown>) =>
  call<StandingCard>(`/farms/${farmId}/material-rate-cards/${id}`, { method: "PATCH", body: input });

export const listServiceRateCards = (farmId: string) =>
  call<StandingCard[]>(`/farms/${farmId}/service-rate-cards`);
export const createServiceRateCard = (
  farmId: string,
  input: { activityId: string; unit: string; rate: number; currency?: string },
) => call<StandingCard>(`/farms/${farmId}/service-rate-cards`, { method: "POST", body: input });
export const updateServiceRateCard = (farmId: string, id: string, input: Record<string, unknown>) =>
  call<StandingCard>(`/farms/${farmId}/service-rate-cards/${id}`, { method: "PATCH", body: input });
