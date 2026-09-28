/**
 * Daily field records — `/api/v1/daily-field-records`.
 */
import { apiFetch } from "@/lib/api/http";
import type { DailyFieldRecord, MissCause } from "@/types/agronomic-cycle";

export type DailyFieldRecordDto = DailyFieldRecord;

export function listDailyFieldRecords(params?: { status?: string; latestOnly?: boolean }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.latestOnly === false) q.set("latestOnly", "false");
  const qs = q.toString();
  return apiFetch<DailyFieldRecordDto[]>(`/daily-field-records${qs ? `?${qs}` : ""}`);
}

export function createDailyFieldRecord(input: {
  activityName: string;
  activityCode?: string;
  activityId?: string;
  weeklyPlanId?: string;
  weeklyPlanLineId?: string;
  monthlyWoId?: string;
  monthlyWoCode?: string;
  monthlyLineId?: string;
  workOrderId?: string | null;
  date?: string;
  blockId?: string;
  blockCode?: string;
  plannedQty: number;
  actualQty?: number;
  unit?: string;
  laborHours?: number;
  materialsUsed?: string[];
  notes?: string;
  entrySource?: string;
  missCause?: MissCause | null;
}) {
  return apiFetch<DailyFieldRecordDto>("/daily-field-records", { method: "POST", body: input });
}

export function updateDailyFieldRecord(
  id: string,
  patch: Partial<{
    actualQty: number;
    plannedQty: number;
    laborHours: number;
    notes: string;
    materialsUsed: string[];
    date: string;
    missCause: MissCause | null;
  }>,
) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

export function submitDailyFieldRecord(id: string) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}/submit`, { method: "POST" });
}

export function siteCheckDailyFieldRecord(
  id: string,
  input?: { note?: string; qualityScore?: number },
) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}/site-check`, {
    method: "POST",
    body: input || {},
  });
}

export function validateDailyFieldRecord(
  id: string,
  input?: { note?: string; qualityScore?: number; missCause?: MissCause | null },
) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}/validate`, {
    method: "POST",
    body: input || {},
  });
}

export function returnDailyFieldRecord(
  id: string,
  input: { note?: string; comment?: string; failedCriteria?: string[] },
) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}/return`, {
    method: "POST",
    body: input,
  });
}

export function correctDailyFieldRecord(
  id: string,
  patch?: Partial<{
    actualQty: number;
    laborHours: number;
    notes: string;
    materialsUsed: string[];
    date: string;
  }>,
) {
  return apiFetch<DailyFieldRecordDto>(`/daily-field-records/${id}/correct`, {
    method: "POST",
    body: patch || {},
  });
}
