/**
 * Cropfort projects — `/api/v1/projects`.
 */
import { apiFetch } from "@/lib/api/http";

export type ProjectBand = "A" | "B" | "C" | "D";

export type ProjectStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "returned"
  | "in_progress"
  | "complete";

export type ProjectMilestoneDto = {
  id: string;
  title: string;
  done: boolean;
};

export type ProjectDto = {
  id: string;
  code: string;
  title: string;
  blockId: string;
  blockCode: string;
  vendor: string;
  budgetEtb: number;
  band: ProjectBand;
  status: ProjectStatus;
  notes: string;
  milestones: ProjectMilestoneDto[];
  cropfortAfeId: string | null;
  returnedComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listProjects(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<ProjectDto[]>(`/projects${qs ? `?${qs}` : ""}`);
}

export function getProject(id: string) {
  return apiFetch<ProjectDto>(`/projects/${id}`);
}

export function createProject(input: {
  title: string;
  budgetEtb: number;
  blockId: string;
  blockCode?: string;
  vendor?: string;
  band?: ProjectBand;
  notes?: string;
  code?: string;
}) {
  return apiFetch<ProjectDto>("/projects", { method: "POST", body: input });
}

export function submitProject(id: string) {
  return apiFetch<ProjectDto>(`/projects/${id}/submit`, { method: "POST" });
}

export function decideProject(id: string, decision: "approve" | "return", comment?: string) {
  return apiFetch<ProjectDto>(`/projects/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}

export function startProject(id: string) {
  return apiFetch<ProjectDto>(`/projects/${id}/start`, { method: "POST" });
}

export function toggleProjectMilestone(id: string, milestoneId: string) {
  return apiFetch<ProjectDto>(`/projects/${id}/milestones/${milestoneId}/toggle`, {
    method: "POST",
  });
}

export function linkProjectAfe(id: string, cropfortAfeId: string) {
  return apiFetch<ProjectDto>(`/projects/${id}/link-afe`, {
    method: "POST",
    body: { cropfortAfeId },
  });
}
