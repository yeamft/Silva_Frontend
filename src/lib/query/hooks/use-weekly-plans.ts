"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateWeeklyPlan,
  createWeeklyPlan,
  decideWeeklyPlan,
  listWeeklyPlans,
  setWeeklyPlanLoop,
  submitWeeklyPlan,
} from "@/lib/api/weekly-plans";
import { queryKeys } from "@/lib/query/keys";
import type { ProcessLoop } from "@/types/agronomic-cycle";

export function useWeeklyPlans(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.weeklyPlans.list(status),
    queryFn: () => listWeeklyPlans(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidateWeeklyPlans() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.weeklyPlans.all });
    void qc.invalidateQueries({ queryKey: queryKeys.workOrders.all });
    void qc.invalidateQueries({ queryKey: queryKeys.directInstructions.all });
  };
}

export function useCreateWeeklyPlan() {
  const invalidate = useInvalidateWeeklyPlans();
  return useMutation({
    mutationFn: createWeeklyPlan,
    onSuccess: () => invalidate(),
  });
}

export function useSubmitWeeklyPlan() {
  const invalidate = useInvalidateWeeklyPlans();
  return useMutation({
    mutationFn: (id: string) => submitWeeklyPlan(id),
    onSuccess: () => invalidate(),
  });
}

export function useDecideWeeklyPlan() {
  const invalidate = useInvalidateWeeklyPlans();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
    }) => decideWeeklyPlan(id, decision, comment),
    onSuccess: () => invalidate(),
  });
}

export function useActivateWeeklyPlan() {
  const invalidate = useInvalidateWeeklyPlans();
  return useMutation({
    mutationFn: (id: string) => activateWeeklyPlan(id),
    onSuccess: () => invalidate(),
  });
}

export function useSetWeeklyPlanLoop() {
  const invalidate = useInvalidateWeeklyPlans();
  return useMutation({
    mutationFn: ({ id, loop }: { id: string; loop: ProcessLoop | string }) =>
      setWeeklyPlanLoop(id, loop),
    onSuccess: () => invalidate(),
  });
}
