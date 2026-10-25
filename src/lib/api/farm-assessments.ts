import { apiFetch, refreshSession } from "@/lib/api/http";
import { API_BASE_URL } from "@/lib/api/config";
import { readTokens } from "@/lib/api/token-storage";
import { ApiError } from "@/lib/api/types";

export type FarmAssessment = {
  planId: string;
  status: "draft" | "submitted" | "approved" | "changes_requested";
  findings: string;
  reportName: string | null;
  reportSize: number | null;
  revision: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  canEdit: boolean;
  canReview: boolean;
  history: { action: "submitted" | "approved" | "changes_requested"; actorName: string; at: string; comment: string; reportName?: string }[];
};

export type FarmAssessmentSummary = {
  planId: string;
  planName: string;
  farmName: string;
  cycleLabel: string;
  status: FarmAssessment["status"];
  exists: boolean;
  reportName: string | null;
  updatedAt: string | null;
};

const path = (planId: string) => `/programme-plans/${encodeURIComponent(planId)}/farm-assessment`;

export function getFarmAssessment(planId: string) {
  return apiFetch<FarmAssessment>(path(planId));
}

export function listFarmAssessments() {
  return apiFetch<FarmAssessmentSummary[]>("/programme-plans/farm-assessments");
}

// Multipart uploads and authenticated binary downloads share the normal session refresh.
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

export async function saveFarmAssessment(planId: string, findings: string, revision: number, report?: File | null) {
  const form = new FormData();
  form.append("findings", findings);
  form.append("revision", String(revision));
  if (report) form.append("report", report);
  const response = await requestFile(path(planId), { method: "PUT", body: form });
  return (await response.json()).data as FarmAssessment;
}

export function submitFarmAssessment(planId: string, revision: number) {
  return apiFetch<FarmAssessment>(`${path(planId)}/submit`, { method: "POST", body: { revision } });
}

export function decideFarmAssessment(planId: string, revision: number, decision: "approve" | "request_changes", comment: string) {
  return apiFetch<FarmAssessment>(`${path(planId)}/decide`, { method: "POST", body: { revision, decision, comment } });
}

export async function downloadFarmAssessment(planId: string, filename: string) {
  const response = await requestFile(`${path(planId)}/report`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
