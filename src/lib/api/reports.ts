import { apiFetch } from "@/lib/api/http";
import type { OpsReport, ReportCadence } from "@/store/reportsStore";

export type OpsReportDto = OpsReport;

export function listReports(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<OpsReportDto[]>(`/reports${qs ? `?${qs}` : ""}`);
}

export function createReport(input: Partial<OpsReportDto> & {
  cadence: ReportCadence;
  periodLabel: string;
}) {
  return apiFetch<OpsReportDto>("/reports", { method: "POST", body: input });
}

export function updateReport(id: string, patch: Partial<OpsReportDto>) {
  return apiFetch<OpsReportDto>(`/reports/${id}`, { method: "PATCH", body: patch });
}

export function submitReport(id: string) {
  return apiFetch<OpsReportDto>(`/reports/${id}/submit`, { method: "POST" });
}

export function releaseReport(id: string, to?: string) {
  return apiFetch<OpsReportDto>(`/reports/${id}/release`, {
    method: "POST",
    body: { to },
  });
}

export function returnReport(id: string, comment?: string) {
  return apiFetch<OpsReportDto>(`/reports/${id}/return`, {
    method: "POST",
    body: { comment },
  });
}

export function deleteReport(id: string) {
  return apiFetch<{ ok: boolean }>(`/reports/${id}`, { method: "DELETE" });
}
