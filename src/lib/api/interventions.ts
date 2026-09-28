/**
 * Cropfort interventions — `/api/v1/interventions`.
 */
import { apiFetch } from "@/lib/api/http";

export type InterventionBand = "A" | "B" | "C" | "D";

export type InterventionStatus =
  | "draft"
  | "active"
  | "submitted"
  | "approved"
  | "returned"
  | "complete";

export type InterventionStepDto = {
  id: string;
  title: string;
  done: boolean;
};

export type InterventionDto = {
  id: string;
  code: string;
  title: string;
  blockId: string;
  blockCode: string;
  vendor: string;
  costEtb: number;
  band: InterventionBand;
  status: InterventionStatus;
  steps: InterventionStepDto[];
  cropfortAfeId: string | null;
  returnedComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listInterventions(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<InterventionDto[]>(`/interventions${qs ? `?${qs}` : ""}`);
}

export function getIntervention(id: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}`);
}

export function createIntervention(input: {
  title: string;
  costEtb: number;
  blockId: string;
  blockCode?: string;
  vendor?: string;
  band?: InterventionBand;
  code?: string;
}) {
  return apiFetch<InterventionDto>("/interventions", { method: "POST", body: input });
}

export function startIntervention(id: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}/start`, { method: "POST" });
}

export function submitIntervention(id: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}/submit`, { method: "POST" });
}

export function decideIntervention(
  id: string,
  decision: "approve" | "return",
  comment?: string,
) {
  return apiFetch<InterventionDto>(`/interventions/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}

export function completeIntervention(id: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}/complete`, { method: "POST" });
}

export function toggleInterventionStep(id: string, stepId: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}/steps/${stepId}/toggle`, {
    method: "POST",
  });
}

export function linkInterventionAfe(id: string, cropfortAfeId: string) {
  return apiFetch<InterventionDto>(`/interventions/${id}/link-afe`, {
    method: "POST",
    body: { cropfortAfeId },
  });
}
