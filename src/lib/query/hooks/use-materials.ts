"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from "@/lib/api/materials";
import { queryKeys } from "@/lib/query/keys";

export function useMaterials(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.materials.list(includeInactive),
    queryFn: () => getMaterials(includeInactive),
    enabled,
  });
}

function useInvalidateMaterials() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.materials.all });
}

export function useCreateMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: createMaterial,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateMaterial>[1] }) =>
      updateMaterial(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => invalidate(),
  });
}
