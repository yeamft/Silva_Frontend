"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLaborActivity,
  deleteLaborActivity,
  getLaborActivities,
  updateLaborActivity,
} from "@/lib/api/labor-activities";
import { queryKeys } from "@/lib/query/keys";

export function useLaborActivities(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.labor.list(includeInactive),
    queryFn: () => getLaborActivities(includeInactive),
    enabled,
  });
}

function useInvalidateLabor() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.labor.all });
}

export function useCreateLaborActivity() {
  const invalidate = useInvalidateLabor();
  return useMutation({
    mutationFn: createLaborActivity,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLaborActivity() {
  const invalidate = useInvalidateLabor();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateLaborActivity>[1] }) =>
      updateLaborActivity(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteLaborActivity() {
  const invalidate = useInvalidateLabor();
  return useMutation({
    mutationFn: deleteLaborActivity,
    onSuccess: () => invalidate(),
  });
}
