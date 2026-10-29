import { apiFetch, refreshSession } from "@/lib/api/http";
import { API_BASE_URL } from "@/lib/api/config";
import { readTokens } from "@/lib/api/token-storage";
import { ApiError } from "@/lib/api/types";

export type AssessmentStatus = "draft" | "submitted" | "approved" | "changes_requested";
export type AssessmentPurpose = "annual_baseline" | "follow_up" | "special";

export type FarmAssessment = {
  id: string;
  /** Null for standalone assessments. */
  planId: string | null;
  farmEstateId: string | null;
  programId: string | null;
  planYear: number | null;
  cycleLabel: string;
  title: string;
  assessmentDate: string | null;
  assessorName: string | null;
  assessorUserId: string | null;
  assessmentPurpose: AssessmentPurpose;
  assessedAreaHa: number | null;
  cropStage: string | null;
  generalCondition: "good" | "fair" | "poor" | null;
  findings: string;
  recommendedOps: unknown[];
  blockIds: string[];
  reportName: string | null;
  reportSize: number | null;
  revision: number;
  status: AssessmentStatus;
  returnedComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  canReview: boolean;
  history: {
    action: "submitted" | "approved" | "changes_requested";
    actorName: string;
    at: string;
    comment: string;
    reportName?: string;
  }[];
};

export type FarmAssessmentSummary = {
  id: string;
  planId: string | null;
  planName: string | null;
  farmName: string | null;
  farmEstateId: string | null;
  planYear: number | null;
  cycleLabel: string;
  title: string;
  assessmentDate: string | null;
  assessmentPurpose: AssessmentPurpose;
  assessedAreaHa: number | null;
  status: AssessmentStatus;
  reportName: string | null;
  findingsCount: number;
  recommendationsCount: number;
  updatedAt: string | null;
};

export type AssessmentCounts = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  changes_requested: number;
};

export type CreateAssessmentBody = {
  farmEstateId: string;
  planId?: string;
  planYear?: number;
  planningCycle?: string;
  title?: string;
  assessmentDate?: string;
  assessorName?: string;
  assessorUserId?: string;
  assessmentPurpose?: AssessmentPurpose;
  blockIds?: string[];
};

export type ListAssessmentFilters = {
  farmEstateId?: string;
  planYear?: number;
  status?: AssessmentStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

// ── Canonical id-based API ─────────────────────────────────────────────────

const base = "/farm-assessments";

export function listFarmAssessments(filters: ListAssessmentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.farmEstateId) params.set("farmEstateId", filters.farmEstateId);
  if (filters.planYear) params.set("planYear", String(filters.planYear));
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return apiFetch<FarmAssessmentSummary[]>(`${base}${qs ? `?${qs}` : ""}`);
}

export function getAssessmentCounts() {
  return apiFetch<AssessmentCounts>(`${base}/counts`);
}

export function createFarmAssessment(body: CreateAssessmentBody) {
  return apiFetch<FarmAssessment>(base, { method: "POST", body });
}

export function getFarmAssessment(id: string) {
  return apiFetch<FarmAssessment>(`${base}/${encodeURIComponent(id)}`);
}

/** Attaches the assessment to a Core Operations plan, or detaches it with null. */
export function linkFarmAssessmentToPlan(id: string, planId: string | null) {
  return apiFetch<FarmAssessment>(`${base}/${encodeURIComponent(id)}/link-plan`, {
    method: "POST",
    body: { planId },
  });
}

export function submitFarmAssessment(id: string, revision: number) {
  return apiFetch<FarmAssessment>(`${base}/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: { revision },
  });
}

export function decideFarmAssessment(
  id: string,
  revision: number,
  decision: "approve" | "request_changes",
  comment: string,
) {
  return apiFetch<FarmAssessment>(`${base}/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: { revision, decision, comment },
  });
}

// ── Multipart / binary helpers ─────────────────────────────────────────────

async function requestFile(url: string, options: RequestInit = {}) {
  const run = () => {
    const headers = new Headers(options.headers);
    const tokens = readTokens();
    if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    return fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  };
  let response = await run();
  if (response.status === 401) {
    const tokens = await refreshSession();
    if (tokens?.accessToken) response = await run();
  }
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(response.status, json?.error?.code || "HTTP_ERROR", json?.error?.message || "Could not transfer the report");
  }
  return response;
}

export async function saveFarmAssessment(
  id: string,
  body: Record<string, unknown>,
  report?: File | null,
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v == null) continue;
    if (Array.isArray(v)) form.append(k, JSON.stringify(v));
    else form.append(k, String(v));
  }
  if (report) form.append("report", report);
  const response = await requestFile(`${base}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: form,
  });
  return (await response.json()).data as FarmAssessment;
}

export async function downloadFarmAssessment(id: string, filename: string) {
  const response = await requestFile(`${base}/${encodeURIComponent(id)}/report`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Legacy planId-based helpers (backward-compatible) ─────────────────────

const planPath = (planId: string) =>
  `/programme-plans/${encodeURIComponent(planId)}/farm-assessment`;

/**
 * Resolve a planId to its assessment id(s).
 * Used by the legacy [planId] route to redirect to the canonical [id] route.
 */
export function resolveAssessmentByPlanId(planId: string) {
  return apiFetch<{ assessments: { id: string; title: string; status: AssessmentStatus }[] }>(
    `${planPath(planId)}/resolve`,
  );
}

/** @deprecated Use getFarmAssessment(id) instead. */
export function getFarmAssessmentByPlanId(planId: string) {
  return apiFetch<FarmAssessment>(planPath(planId));
}
