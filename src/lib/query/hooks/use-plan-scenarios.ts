"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanScenario,
  deletePlanScenario,
  listPlanScenarios,
  renamePlanScenario,
} from "@/lib/api/plan-scenarios";
import { queryKeys } from "@/lib/query/keys";
import type { CoreOpsPlan } from "@/types/core-ops";

export function usePlanScenarios(enabled = true) {
  return useQuery({
    queryKey: queryKeys.planScenarios.list(),
    queryFn: listPlanScenarios,
    enabled,
  });
}

export function useCreatePlanScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      note?: string;
      snapshot: CoreOpsPlan;
      includedCount?: number;
      budgetEtb?: number;
      scheduledCount?: number;
    }) => createPlanScenario(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.planScenarios.all }),
  });
}

export function useRenamePlanScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renamePlanScenario(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.planScenarios.all }),
  });
}

export function useDeletePlanScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlanScenario(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.planScenarios.all }),
  });
}
