/**
 * Cropfort AFEs — `/api/v1/afes`.
 */
import { apiFetch } from "@/lib/api/http";

export type CropfortAfeDto = {
  id: string;
  programId: string;
  title: string;
  amountEtb: number;
  band: "A" | "B" | "C" | "D";
  sourceType: string;
  sourceId: string | null;
  status: "draft" | "submitted" | "approved" | "returned";
  version: number;
  returnedComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listAfes(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<CropfortAfeDto[]>(`/afes${qs ? `?${qs}` : ""}`);
}

export function getAfe(id: string) {
  return apiFetch<CropfortAfeDto>(`/afes/${id}`);
}

export function createAfe(input: {
  title: string;
  amountEtb: number;
  band?: "A" | "B" | "C" | "D";
  sourceType?: string;
  sourceId?: string | null;
}) {
  return apiFetch<CropfortAfeDto>("/afes", { method: "POST", body: input });
}

export function submitAfe(id: string) {
  return apiFetch<CropfortAfeDto>(`/afes/${id}/submit`, { method: "POST" });
}

export function decideAfe(id: string, decision: "approve" | "return", comment?: string) {
  return apiFetch<CropfortAfeDto>(`/afes/${id}/decide`, {
    method: "POST",
    body: { decision, comment },
  });
}
