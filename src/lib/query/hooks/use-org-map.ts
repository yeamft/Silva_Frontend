"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAssetOwner,
  createBlock,
  createFarmArea,
  createOrganization,
  createVendor,
  deleteAssetOwner,
  deleteBlock,
  deleteFarmArea,
  deleteOrganization,
  deleteVendor,
  getAssetOwners,
  getBlocks,
  getFarmAreas,
  getFarmMapOverview,
  getOrganizations,
  getVendors,
  updateAssetOwner,
  updateBlock,
  updateFarmArea,
  updateOrganization,
  updateVendor,
} from "@/lib/api/org-map";
import type {
  AssetOwner,
  EntityStatus,
  FarmArea,
  OrganizationType,
  VendorRecord,
} from "@/types/cropfort-modules";
import { queryKeys } from "@/lib/query/keys";

function useInvalidateOrgMap() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.orgMap.all });
}

export function useBlocks(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.blocks(),
    queryFn: getBlocks,
    enabled,
  });
}

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.organizations(),
    queryFn: getOrganizations,
    enabled,
  });
}

export function useFarmAreas(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.farmAreas(),
    queryFn: getFarmAreas,
    enabled,
  });
}

export function useVendors(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.vendors(),
    queryFn: getVendors,
    enabled,
  });
}

export function useAssetOwners(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.assetOwners(),
    queryFn: getAssetOwners,
    enabled,
  });
}

export function useFarmMapOverview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgMap.overview(),
    queryFn: getFarmMapOverview,
    enabled,
  });
}

export function useCreateBlock() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: createBlock,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBlock() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        code: string;
        name: string;
        hectares?: number | string | null;
        farmAreaId?: string | null;
        status?: EntityStatus;
      };
    }) => updateBlock(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBlock() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (id: string) => deleteBlock(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateOrganization() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (input: { name: string; type: OrganizationType; status: EntityStatus }) =>
      createOrganization(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateOrganization() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name: string; type: OrganizationType; status: EntityStatus };
    }) => updateOrganization(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteOrganization() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateFarmArea() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (input: Omit<FarmArea, "id" | "createdAt">) => createFarmArea(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateFarmArea() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<FarmArea, "id" | "createdAt"> }) =>
      updateFarmArea(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteFarmArea() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (id: string) => deleteFarmArea(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateVendor() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (input: Omit<VendorRecord, "id" | "createdAt">) => createVendor(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateVendor() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<VendorRecord, "id" | "createdAt"> }) =>
      updateVendor(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteVendor() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateAssetOwner() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (input: Omit<AssetOwner, "id" | "createdAt">) => createAssetOwner(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAssetOwner() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<AssetOwner, "id" | "createdAt"> }) =>
      updateAssetOwner(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteAssetOwner() {
  const invalidate = useInvalidateOrgMap();
  return useMutation({
    mutationFn: (id: string) => deleteAssetOwner(id),
    onSuccess: () => invalidate(),
  });
}
