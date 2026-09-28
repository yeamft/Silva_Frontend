"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  correctDailyFieldRecord,
  createDailyFieldRecord,
  listDailyFieldRecords,
  returnDailyFieldRecord,
  siteCheckDailyFieldRecord,
  submitDailyFieldRecord,
  updateDailyFieldRecord,
  validateDailyFieldRecord,
} from "@/lib/api/daily-field-records";
import { queryKeys } from "@/lib/query/keys";
import type { MissCause } from "@/types/agronomic-cycle";

export function useDailyFieldRecords(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.dailyFieldRecords.list(status),
    queryFn: () => listDailyFieldRecords(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.dailyFieldRecords.all });
  };
}

export function useCreateDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createDailyFieldRecord,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateDailyFieldRecord>[1];
    }) => updateDailyFieldRecord(id, patch),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitDailyFieldRecord(id),
    onSuccess: () => invalidate(),
  });
}

export function useSiteCheckDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      note,
      qualityScore,
    }: {
      id: string;
      note?: string;
      qualityScore?: number;
    }) => siteCheckDailyFieldRecord(id, { note, qualityScore }),
    onSuccess: () => invalidate(),
  });
}

export function useValidateDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      note,
      qualityScore,
      missCause,
    }: {
      id: string;
      note?: string;
      qualityScore?: number;
      missCause?: MissCause | null;
    }) => validateDailyFieldRecord(id, { note, qualityScore, missCause }),
    onSuccess: () => invalidate(),
  });
}

export function useReturnDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      note,
      failedCriteria,
    }: {
      id: string;
      note: string;
      failedCriteria?: string[];
    }) => returnDailyFieldRecord(id, { note, failedCriteria }),
    onSuccess: () => invalidate(),
  });
}

export function useCorrectDailyFieldRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch?: Parameters<typeof correctDailyFieldRecord>[1];
    }) => correctDailyFieldRecord(id, patch),
    onSuccess: () => invalidate(),
  });
}
