"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveBenchmarkSurvey,
  createBenchmarkSurvey,
  createLaborRateCard,
  createMaterialRateCard,
  createServiceRateCard,
  getBenchmarkSurvey,
  getResolvedLaborRate,
  listBenchmarkSurveys,
  listFarmActivities,
  listFarms,
  listLaborRateCards,
  listMaterialRateCards,
  listServiceRateCards,
  lockBenchmarkSurvey,
  submitBenchmarkSurvey,
  updateBenchmarkSurvey,
  updateLaborRateCard,
  updateMaterialRateCard,
  updateServiceRateCard,
} from "@/lib/api/benchmark-surveys";
import { queryKeys } from "@/lib/query/keys";

export function useFarms(enabled = true) {
  return useQuery({
    queryKey: queryKeys.farms.list(),
    queryFn: listFarms,
    enabled,
  });
}

export function useFarmActivities(farmId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.farms.activities(farmId || ""),
    queryFn: () => listFarmActivities(farmId!),
    enabled: Boolean(farmId) && enabled,
  });
}

export function useBenchmarkSurveys(
  farmId: string | null,
  opts?: { activityId?: string; status?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.benchmarkSurveys.list(farmId || "", opts),
    queryFn: () => listBenchmarkSurveys(farmId!, opts),
    enabled: Boolean(farmId) && enabled,
  });
}

export function useBenchmarkSurvey(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.benchmarkSurveys.detail(id || ""),
    queryFn: () => getBenchmarkSurvey(id!),
    enabled: Boolean(id) && enabled,
  });
}

function useInvalidateSurveys() {
  const qc = useQueryClient();
  return (farmId?: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.benchmarkSurveys.all });
    if (farmId) qc.invalidateQueries({ queryKey: queryKeys.farms.all });
  };
}

export function useCreateBenchmarkSurvey() {
  const invalidate = useInvalidateSurveys();
  return useMutation({
    mutationFn: ({
      farmId,
      input,
    }: {
      farmId: string;
      input: Parameters<typeof createBenchmarkSurvey>[1];
    }) => createBenchmarkSurvey(farmId, input),
    onSuccess: (_d, v) => invalidate(v.farmId),
  });
}

export function useUpdateBenchmarkSurvey() {
  const invalidate = useInvalidateSurveys();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      updateBenchmarkSurvey(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useLockBenchmarkSurvey() {
  const invalidate = useInvalidateSurveys();
  return useMutation({
    mutationFn: lockBenchmarkSurvey,
    onSuccess: () => invalidate(),
  });
}

export function useSubmitBenchmarkSurvey() {
  const invalidate = useInvalidateSurveys();
  return useMutation({
    mutationFn: submitBenchmarkSurvey,
    onSuccess: () => invalidate(),
  });
}

export function useApproveBenchmarkSurvey() {
  const invalidate = useInvalidateSurveys();
  return useMutation({
    mutationFn: approveBenchmarkSurvey,
    onSuccess: () => invalidate(),
  });
}

export function useResolvedLaborRate(farmId: string | null, activityId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.farms.resolvedRate(farmId || "", activityId || ""),
    queryFn: () => getResolvedLaborRate(farmId!, activityId!),
    enabled: Boolean(farmId && activityId) && enabled,
    retry: false,
  });
}

export function useLaborStandingCards(farmId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.standingCards.labor(farmId || ""),
    queryFn: () => listLaborRateCards(farmId!),
    enabled: Boolean(farmId) && enabled,
  });
}

export function useMaterialStandingCards(farmId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.standingCards.material(farmId || ""),
    queryFn: () => listMaterialRateCards(farmId!),
    enabled: Boolean(farmId) && enabled,
  });
}

export function useServiceStandingCards(farmId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.standingCards.service(farmId || ""),
    queryFn: () => listServiceRateCards(farmId!),
    enabled: Boolean(farmId) && enabled,
  });
}

function useInvalidateStanding() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.standingCards.all });
}

export function useCreateLaborStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      input,
    }: {
      farmId: string;
      input: Parameters<typeof createLaborRateCard>[1];
    }) => createLaborRateCard(farmId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLaborStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      id,
      input,
    }: {
      farmId: string;
      id: string;
      input: Record<string, unknown>;
    }) => updateLaborRateCard(farmId, id, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateMaterialStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      input,
    }: {
      farmId: string;
      input: Parameters<typeof createMaterialRateCard>[1];
    }) => createMaterialRateCard(farmId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMaterialStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      id,
      input,
    }: {
      farmId: string;
      id: string;
      input: Record<string, unknown>;
    }) => updateMaterialRateCard(farmId, id, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateServiceStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      input,
    }: {
      farmId: string;
      input: Parameters<typeof createServiceRateCard>[1];
    }) => createServiceRateCard(farmId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateServiceStandingCard() {
  const invalidate = useInvalidateStanding();
  return useMutation({
    mutationFn: ({
      farmId,
      id,
      input,
    }: {
      farmId: string;
      id: string;
      input: Record<string, unknown>;
    }) => updateServiceRateCard(farmId, id, input),
    onSuccess: () => invalidate(),
  });
}
