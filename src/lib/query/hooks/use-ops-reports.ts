"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  deleteReport,
  listReports,
  releaseReport,
  returnReport,
  submitReport,
  updateReport,
  type OpsReportDto,
} from "@/lib/api/reports";
import { queryKeys } from "@/lib/query/keys";
import type { ReportCadence } from "@/store/reportsStore";

export function useOpsReports(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.reports.list(status),
    queryFn: () => listReports(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
}

export function useCreateOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (
      input: Partial<OpsReportDto> & { cadence: ReportCadence; periodLabel: string },
    ) => createReport(input),
    onSuccess: invalidate,
  });
}

export function useUpdateOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<OpsReportDto> }) =>
      updateReport(id, patch),
    onSuccess: invalidate,
  });
}

export function useSubmitOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitReport(id),
    onSuccess: invalidate,
  });
}

export function useReleaseOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to?: string }) => releaseReport(id, to),
    onSuccess: invalidate,
  });
}

export function useReturnOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      returnReport(id, comment),
    onSuccess: invalidate,
  });
}

export function useDeleteOpsReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: invalidate,
  });
}
