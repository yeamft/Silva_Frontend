/** Org / branch types used by Field OS shell (legacy pharmacy-shaped, farm-oriented). */

export type OrgType =
  | "community_pharmacy"
  | "hospital"
  | "clinic"
  | "wholesale"
  | "medical_store"
  | "ngo_pharmacy"
  | "chain_pharmacy"
  | "regional_warehouse"
  | "coffee_farm";

export type StorageCondition = "normal" | "cold" | "controlled" | "frozen";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  licenseNumber?: string;
  tin?: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isWarehouse: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BinLocation {
  id: string;
  shelfId: string;
  code: string;
  active: boolean;
}

export interface Shelf {
  id: string;
  zoneId: string;
  name: string;
  bins: BinLocation[];
}

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  storageCondition: StorageCondition;
  shelves: Shelf[];
  active: boolean;
}

/** @deprecated Prefer Warehouse — kept for orgStore seed compatibility */
export type PharmacyWarehouse = Warehouse;

export interface Warehouse {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  zones: WarehouseZone[];
  active: boolean;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  branchId?: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
  userName: string;
  ip?: string;
  device?: string;
  reason?: string;
  createdAt: number;
  immutable: true;
}
