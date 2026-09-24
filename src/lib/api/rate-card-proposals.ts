/**
 * Rate card proposals: SPX draft → Silva approve/reject → standing.
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

export type RateCardProposalDto = {
  id: string;
  programId: string;
  farmAreaId: string;
  farmEstateId: string;
  farmEstateName?: string | null;
  budgetYear: number;
  blockId: string | null;
  activityId: string;
  activityCode: string | null;
  activityName: string | null;
  activityUnit: string | null;
  activityTier: number | null;
  kind: "labor" | "materials" | "services" | string;
  sourceSurveyId: string | null;
  recommendedRate: number | null;
  proposedRate: number;
  variancePct: number | null;
  flagged: boolean;
  norm: number | null;
  fallbackRate: number | null;
  sourceBasis: string;
  availableFrom: string | null;
  availableTo: string | null;
  justificationNote: string;
  sourceEvidence: string;
  notes: string;
  status: "draft" | "submitted" | "approved" | "returned" | "archived";
  returnComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  archivedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type LockedBenchmarkDto = {
  id: string;
  farmEstateId: string;
  activityId: string;
  activityName: string | null;
  kind: string | null;
  recommendedRate: number | null;
  proposedRate: number | null;
  lockedAt: string | null;
  neighbor1Name: string | null;
  neighbor2Name: string | null;
  neighbor1Rate: number | null;
  neighbor2Rate: number | null;
};

export const listRateCardProposals = (
  farmId: string,
  opts?: { status?: string; kind?: string; budgetYear?: number },
) => {
  const q = new URLSearchParams();
  if (opts?.status) q.set("status", opts.status);
  if (opts?.kind) q.set("kind", opts.kind);
  if (opts?.budgetYear != null) q.set("budgetYear", String(opts.budgetYear));
  const qs = q.toString();
  return call<RateCardProposalDto[]>(
    `/farms/${farmId}/rate-card-proposals${qs ? `?${qs}` : ""}`,
  );
};

/** Single-request list for the active program (all farms). Prefer over farm fan-out. */
export const listProgramRateCardProposals = (opts?: {
  status?: string;
  kind?: string;
  farmEstateId?: string;
  budgetYear?: number;
  programWide?: boolean;
}) => {
  const q = new URLSearchParams();
  if (opts?.status) q.set("status", opts.status);
  if (opts?.kind) q.set("kind", opts.kind);
  if (opts?.farmEstateId) q.set("farmEstateId", opts.farmEstateId);
  if (opts?.budgetYear != null) q.set("budgetYear", String(opts.budgetYear));
  if (opts?.programWide) q.set("programWide", "1");
  const qs = q.toString();
  return call<RateCardProposalDto[]>(`/rate-card-proposals${qs ? `?${qs}` : ""}`);
};

export const listLockedBenchmarks = (farmId: string, opts?: { kind?: string }) => {
  const q = new URLSearchParams();
  if (opts?.kind) q.set("kind", opts.kind);
  const qs = q.toString();
  return call<LockedBenchmarkDto[]>(`/farms/${farmId}/locked-benchmarks${qs ? `?${qs}` : ""}`);
};

export const getRateCardProposal = (id: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}`);

export const createRateCardFromSurvey = (
  farmId: string,
  input: {
    sourceSurveyId: string;
    budgetYear?: number;
    proposedRate?: number;
    availableFrom?: string;
    availableTo?: string | null;
    norm?: number | null;
    fallbackRate?: number | null;
    sourceBasis?: string;
    justificationNote?: string;
    sourceEvidence?: string;
    notes?: string;
    blockId?: string | null;
  },
) =>
  call<RateCardProposalDto>(`/farms/${farmId}/rate-card-proposals`, {
    method: "POST",
    body: input,
  });

export const createRateCardImport = (
  farmId: string,
  input: {
    activityId: string;
    kind: string;
    proposedRate: number;
    budgetYear?: number;
    norm?: number | null;
    sourceBasis?: string;
    availableFrom?: string;
    availableTo?: string | null;
  },
) =>
  call<RateCardProposalDto>(`/farms/${farmId}/rate-card-proposals/import`, {
    method: "POST",
    body: input,
  });

export const updateRateCardProposal = (id: string, input: Record<string, unknown>) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}`, { method: "PATCH", body: input });

export const submitRateCardProposal = (id: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}/submit`, { method: "POST" });

export const approveRateCardProposal = (id: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}/approve`, { method: "POST" });

export const rejectRateCardProposal = (id: string, comment: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}/reject`, {
    method: "POST",
    body: { comment },
  });

export const archiveRateCardProposal = (id: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}/archive`, { method: "POST" });

export const restoreRateCardProposal = (id: string) =>
  call<RateCardProposalDto>(`/rate-card-proposals/${id}/restore`, { method: "POST" });
