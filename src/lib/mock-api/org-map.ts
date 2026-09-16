/**
 * Organization → farm area → vendors & asset owners mock API.
 * Replace each function with tenant-scoped REST calls later.
 */
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
import { recordAudit } from "./audit";
import { isoNow, mockDelay, newId } from "./delay";
import {
  SEED_ASSET_OWNERS,
  SEED_BLOCKS,
  SEED_FARM_AREAS,
  SEED_ORGANIZATIONS,
  SEED_VENDORS,
} from "./seed";

let organizations: AdminOrganization[] = structuredClone(SEED_ORGANIZATIONS);
let farmAreas: FarmArea[] = structuredClone(SEED_FARM_AREAS);
let vendors: VendorRecord[] = structuredClone(SEED_VENDORS);
let assetOwners: AssetOwner[] = structuredClone(SEED_ASSET_OWNERS);
let blocks: FarmBlockRef[] = structuredClone(SEED_BLOCKS);

const ACTOR = { actorId: "u-pa-1", actorName: "Platform Admin" };

export async function getBlocks(): Promise<FarmBlockRef[]> {
  await mockDelay(80);
  return structuredClone(blocks);
}

export async function createBlock(input: {
  code: string;
  name: string;
  hectares?: number | string | null;
  farmAreaId?: string | null;
  status?: EntityStatus;
}): Promise<FarmBlockRef> {
  await mockDelay();
  const hectares =
    input.hectares === null || input.hectares === undefined || input.hectares === ""
      ? 0
      : Number(input.hectares);
  const created: FarmBlockRef = {
    id: newId("blk"),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    hectares: Number.isFinite(hectares) ? hectares : 0,
    farmAreaId: input.farmAreaId || null,
    status: input.status || "active",
  };
  blocks = [created, ...blocks];
  if (created.farmAreaId) {
    farmAreas = farmAreas.map((fa) =>
      fa.id === created.farmAreaId && !fa.blockIds.includes(created.id)
        ? { ...fa, blockIds: [...fa.blockIds, created.id] }
        : fa,
    );
  }
  recordAudit({
    ...ACTOR,
    action: "block.create",
    entityType: "block",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
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
  await mockDelay();
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Block not found");
  const before = blocks[idx];
  const hectares =
    input.hectares === null || input.hectares === undefined || input.hectares === ""
      ? 0
      : Number(input.hectares);
  const updated: FarmBlockRef = {
    ...before,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    hectares: Number.isFinite(hectares) ? hectares : 0,
    farmAreaId: input.farmAreaId || null,
    status: input.status || "active",
  };
  blocks[idx] = updated;
  farmAreas = farmAreas.map((fa) => {
    const without = fa.blockIds.filter((bid) => bid !== id);
    if (updated.farmAreaId === fa.id) return { ...fa, blockIds: [...without, id] };
    return { ...fa, blockIds: without };
  });
  recordAudit({
    ...ACTOR,
    action: "block.update",
    entityType: "block",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteBlock(id: string): Promise<void> {
  await mockDelay();
  const existing = blocks.find((b) => b.id === id);
  if (!existing) throw new Error("Block not found");
  blocks = blocks.filter((b) => b.id !== id);
  farmAreas = farmAreas.map((fa) => ({
    ...fa,
    blockIds: fa.blockIds.filter((bid) => bid !== id),
  }));
  recordAudit({
    ...ACTOR,
    action: "block.delete",
    entityType: "block",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getOrganizations(): Promise<AdminOrganization[]> {
  await mockDelay();
  return structuredClone(organizations);
}

export async function createOrganization(input: {
  name: string;
  type: OrganizationType;
  status: EntityStatus;
}): Promise<AdminOrganization> {
  await mockDelay();
  const created: AdminOrganization = {
    id: newId("org"),
    name: input.name.trim(),
    type: input.type,
    status: input.status,
    createdAt: isoNow(),
  };
  organizations = [created, ...organizations];
  recordAudit({
    ...ACTOR,
    action: "organization.create",
    entityType: "organization",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateOrganization(
  id: string,
  input: { name: string; type: OrganizationType; status: EntityStatus }
): Promise<AdminOrganization> {
  await mockDelay();
  const idx = organizations.findIndex((o) => o.id === id);
  if (idx < 0) throw new Error("Organization not found");
  const before = organizations[idx];
  const updated = { ...before, name: input.name.trim(), type: input.type, status: input.status };
  organizations[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "organization.update",
    entityType: "organization",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteOrganization(id: string): Promise<void> {
  await mockDelay();
  if (farmAreas.some((f) => f.organizationId === id)) {
    throw new Error("Cannot delete an organization that still has farm areas");
  }
  if (assetOwners.some((a) => a.organizationId === id)) {
    throw new Error("Cannot delete an organization that still has asset owners");
  }
  const existing = organizations.find((o) => o.id === id);
  if (!existing) throw new Error("Organization not found");
  organizations = organizations.filter((o) => o.id !== id);
  recordAudit({
    ...ACTOR,
    action: "organization.delete",
    entityType: "organization",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getFarmAreas(): Promise<FarmArea[]> {
  await mockDelay();
  return structuredClone(farmAreas);
}

export async function createFarmArea(input: Omit<FarmArea, "id" | "createdAt">): Promise<FarmArea> {
  await mockDelay();
  if (!input.organizationId) throw new Error("A farm area must belong to an organization");
  const created: FarmArea = { ...input, id: newId("fa"), name: input.name.trim(), createdAt: isoNow() };
  farmAreas = [created, ...farmAreas];
  recordAudit({
    ...ACTOR,
    action: "farm_area.create",
    entityType: "farm_area",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateFarmArea(id: string, input: Omit<FarmArea, "id" | "createdAt">): Promise<FarmArea> {
  await mockDelay();
  const idx = farmAreas.findIndex((f) => f.id === id);
  if (idx < 0) throw new Error("Farm area not found");
  const before = farmAreas[idx];
  const updated: FarmArea = { ...before, ...input, id, name: input.name.trim() };
  farmAreas[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "farm_area.update",
    entityType: "farm_area",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteFarmArea(id: string): Promise<void> {
  await mockDelay();
  const existing = farmAreas.find((f) => f.id === id);
  if (!existing) throw new Error("Farm area not found");
  farmAreas = farmAreas.filter((f) => f.id !== id);
  vendors = vendors.map((v) => ({ ...v, farmAreaIds: v.farmAreaIds.filter((fid) => fid !== id) }));
  assetOwners = assetOwners.map((a) => ({ ...a, farmAreaIds: a.farmAreaIds.filter((fid) => fid !== id) }));
  recordAudit({
    ...ACTOR,
    action: "farm_area.delete",
    entityType: "farm_area",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getVendors(): Promise<VendorRecord[]> {
  await mockDelay();
  return structuredClone(vendors);
}

export async function createVendor(input: Omit<VendorRecord, "id" | "createdAt">): Promise<VendorRecord> {
  await mockDelay();
  if (input.farmAreaIds.length === 0 && input.blockIds.length === 0) {
    throw new Error("Assign the vendor to at least one farm area or block");
  }
  const created: VendorRecord = { ...input, id: newId("vnd"), name: input.name.trim(), createdAt: isoNow() };
  vendors = [created, ...vendors];
  recordAudit({
    ...ACTOR,
    action: "vendor.create",
    entityType: "vendor",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateVendor(id: string, input: Omit<VendorRecord, "id" | "createdAt">): Promise<VendorRecord> {
  await mockDelay();
  if (input.farmAreaIds.length === 0 && input.blockIds.length === 0) {
    throw new Error("Assign the vendor to at least one farm area or block");
  }
  const idx = vendors.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Vendor not found");
  const before = vendors[idx];
  const updated: VendorRecord = { ...before, ...input, id, name: input.name.trim() };
  vendors[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "vendor.update",
    entityType: "vendor",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteVendor(id: string): Promise<void> {
  await mockDelay();
  const linked = farmAreas.filter((f) => f.vendorIds.includes(id));
  if (linked.length > 0) {
    throw new Error("Unlink this vendor from farm areas before deleting");
  }
  const existing = vendors.find((v) => v.id === id);
  if (!existing) throw new Error("Vendor not found");
  vendors = vendors.filter((v) => v.id !== id);
  recordAudit({
    ...ACTOR,
    action: "vendor.delete",
    entityType: "vendor",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getAssetOwners(): Promise<AssetOwner[]> {
  await mockDelay();
  return structuredClone(assetOwners);
}

export async function createAssetOwner(input: Omit<AssetOwner, "id" | "createdAt">): Promise<AssetOwner> {
  await mockDelay();
  const created: AssetOwner = { ...input, id: newId("ao"), name: input.name.trim(), createdAt: isoNow() };
  assetOwners = [created, ...assetOwners];
  recordAudit({
    ...ACTOR,
    action: "asset_owner.create",
    entityType: "asset_owner",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateAssetOwner(id: string, input: Omit<AssetOwner, "id" | "createdAt">): Promise<AssetOwner> {
  await mockDelay();
  const idx = assetOwners.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Asset owner not found");
  const before = assetOwners[idx];
  const updated: AssetOwner = { ...before, ...input, id, name: input.name.trim() };
  assetOwners[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "asset_owner.update",
    entityType: "asset_owner",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteAssetOwner(id: string): Promise<void> {
  await mockDelay();
  const linked = farmAreas.filter((f) => f.assetOwnerIds.includes(id));
  if (linked.length > 0) {
    throw new Error("Unlink this asset owner from farm areas before deleting");
  }
  const existing = assetOwners.find((a) => a.id === id);
  if (!existing) throw new Error("Asset owner not found");
  assetOwners = assetOwners.filter((a) => a.id !== id);
  recordAudit({
    ...ACTOR,
    action: "asset_owner.delete",
    entityType: "asset_owner",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getFarmMapOverview(): Promise<FarmMapRow[]> {
  await mockDelay();
  return farmAreas.map((fa) => {
    const org = organizations.find((o) => o.id === fa.organizationId);
    return {
      farmAreaId: fa.id,
      farmAreaName: fa.name,
      organizationId: fa.organizationId,
      organizationName: org?.name ?? "—",
      organizationType: org?.type ?? "other",
      assetOwners: fa.assetOwnerIds
        .map((id) => assetOwners.find((a) => a.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
      primaryVendors: fa.vendorIds
        .map((id) => vendors.find((v) => v.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
      blocksCount: fa.blockIds.length,
      hectares: fa.totalHectares,
      status: fa.status,
    };
  });
}

export function orgLinkedCounts(orgId: string) {
  return {
    farmAreas: farmAreas.filter((f) => f.organizationId === orgId).length,
    vendors: vendors.filter((v) =>
      farmAreas.some((f) => f.organizationId === orgId && f.vendorIds.includes(v.id))
    ).length,
  };
}

export function resetOrgMapMock(): void {
  organizations = structuredClone(SEED_ORGANIZATIONS);
  farmAreas = structuredClone(SEED_FARM_AREAS);
  vendors = structuredClone(SEED_VENDORS);
  assetOwners = structuredClone(SEED_ASSET_OWNERS);
}

export type { VendorStatus };
