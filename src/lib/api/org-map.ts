import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";
import type {
  AdminOrganization,
  AssetOwner,
  EntityStatus,
  FarmArea,
  FarmBlockRef,
  FarmMapRow,
  OrganizationType,
  VendorRecord,
  VendorStatus,
} from "@/types/cropfort-modules";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

async function call<T>(path: string, options?: Parameters<typeof apiFetch>[1]): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    throw asError(err);
  }
}

export async function getBlocks(): Promise<FarmBlockRef[]> {
  return call("/org-map/blocks");
}

export async function createBlock(input: {
  code: string;
  name: string;
  hectares?: number | string | null;
  farmAreaId?: string | null;
  status?: EntityStatus;
}): Promise<FarmBlockRef> {
  return call("/org-map/blocks", { method: "POST", body: input });
}

export async function updateBlock(
  id: string,
  input: {
    code: string;
    name: string;
    hectares?: number | string | null;
    farmAreaId?: string | null;
    status?: EntityStatus;
  },
): Promise<FarmBlockRef> {
  return call(`/org-map/blocks/${id}`, { method: "PATCH", body: input });
}

export async function deleteBlock(id: string): Promise<void> {
  await call(`/org-map/blocks/${id}`, { method: "DELETE" });
}

export async function getOrganizations(): Promise<AdminOrganization[]> {
  return call("/org-map/organizations");
}

export async function createOrganization(input: {
  name: string;
  type: OrganizationType;
  status: EntityStatus;
}): Promise<AdminOrganization> {
  return call("/org-map/organizations", { method: "POST", body: input });
}

export async function updateOrganization(
  id: string,
  input: { name: string; type: OrganizationType; status: EntityStatus },
): Promise<AdminOrganization> {
  return call(`/org-map/organizations/${id}`, { method: "PATCH", body: input });
}

export async function deleteOrganization(id: string): Promise<void> {
  await call(`/org-map/organizations/${id}`, { method: "DELETE" });
}

export async function getFarmAreas(): Promise<FarmArea[]> {
  return call("/org-map/farm-areas");
}

export async function createFarmArea(input: Omit<FarmArea, "id" | "createdAt">): Promise<FarmArea> {
  return call("/org-map/farm-areas", { method: "POST", body: input });
}

export async function updateFarmArea(
  id: string,
  input: Omit<FarmArea, "id" | "createdAt">,
): Promise<FarmArea> {
  return call(`/org-map/farm-areas/${id}`, { method: "PATCH", body: input });
}

export async function deleteFarmArea(id: string): Promise<void> {
  await call(`/org-map/farm-areas/${id}`, { method: "DELETE" });
}

export async function getVendors(): Promise<VendorRecord[]> {
  return call("/org-map/vendors");
}

export async function createVendor(input: Omit<VendorRecord, "id" | "createdAt">): Promise<VendorRecord> {
  return call("/org-map/vendors", { method: "POST", body: input });
}

export async function updateVendor(
  id: string,
  input: Omit<VendorRecord, "id" | "createdAt">,
): Promise<VendorRecord> {
  return call(`/org-map/vendors/${id}`, { method: "PATCH", body: input });
}

export async function deleteVendor(id: string): Promise<void> {
  await call(`/org-map/vendors/${id}`, { method: "DELETE" });
}

export async function getAssetOwners(): Promise<AssetOwner[]> {
  return call("/org-map/asset-owners");
}

export async function createAssetOwner(input: Omit<AssetOwner, "id" | "createdAt">): Promise<AssetOwner> {
  return call("/org-map/asset-owners", { method: "POST", body: input });
}

export async function updateAssetOwner(
  id: string,
  input: Omit<AssetOwner, "id" | "createdAt">,
): Promise<AssetOwner> {
  return call(`/org-map/asset-owners/${id}`, { method: "PATCH", body: input });
}

export async function deleteAssetOwner(id: string): Promise<void> {
  await call(`/org-map/asset-owners/${id}`, { method: "DELETE" });
}

export async function getFarmMapOverview(): Promise<FarmMapRow[]> {
  return call("/org-map/overview");
}

export type { VendorStatus };
