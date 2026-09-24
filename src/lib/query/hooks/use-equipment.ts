"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEquipmentResource,
  deleteEquipmentResource,
  getEquipmentResources,
  updateEquipmentResource,
} from "@/lib/api/equipment-resources";
import { queryKeys } from "@/lib/query/keys";

export function useEquipmentResources(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.equipment.list(includeInactive),
    queryFn: () => getEquipmentResources(includeInactive),
    enabled,
  });
}

function useInvalidateEquipment() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.equipment.all });
}

export function useCreateEquipmentResource() {
  const invalidate = useInvalidateEquipment();
  return useMutation({
    mutationFn: createEquipmentResource,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEquipmentResource() {
  const invalidate = useInvalidateEquipment();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateEquipmentResource>[1];
    }) => updateEquipmentResource(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEquipmentResource() {
  const invalidate = useInvalidateEquipment();
  return useMutation({
    mutationFn: deleteEquipmentResource,
    onSuccess: () => invalidate(),
  });
}
