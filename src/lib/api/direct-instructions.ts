/**
 * Direct Instructions — `/api/v1/direct-instructions`.
 */
import { apiFetch } from "@/lib/api/http";
import type { DirectInstruction } from "@/types/agronomic-cycle";

export type DirectInstructionDto = DirectInstruction;

export function listDirectInstructions(params?: {
  status?: string;
  monthlyWoId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.monthlyWoId) q.set("monthlyWoId", params.monthlyWoId);
  const qs = q.toString();
  return apiFetch<DirectInstructionDto[]>(`/direct-instructions${qs ? `?${qs}` : ""}`);
}

export function issueDirectInstruction(input: {
  title: string;
  description?: string;
  amountEtb: number;
  blockId?: string;
  blockCode?: string;
  monthlyWoId?: string | null;
  monthlyWoCode?: string | null;
  weeklyPlanId?: string | null;
  weeklyPlanLineId?: string | null;
  workOrderId?: string | null;
  oral?: boolean;
  code?: string;
}) {
  return apiFetch<DirectInstructionDto>("/direct-instructions", {
    method: "POST",
    body: input,
  });
}

export function confirmDirectInstruction(id: string) {
  return apiFetch<DirectInstructionDto>(`/direct-instructions/${id}/confirm`, {
    method: "POST",
  });
}

export function listPendingDirectInstructions(monthlyWoId: string) {
  return apiFetch<DirectInstructionDto[]>(
    `/direct-instructions/pending/${encodeURIComponent(monthlyWoId)}`,
  );
}
