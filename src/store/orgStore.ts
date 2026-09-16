import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Branch, Organization, OrgType, PharmacyWarehouse, StorageCondition } from "@/types/org";

const now = Date.now();

const seedOrgs: Organization[] = [
  {
    id: "org-1",
    name: "Shecha Coffee Estate",
    type: "coffee_farm",
    licenseNumber: "FARM-ET-2026-001",
    tin: "0009876543",
    address: "Yirgacheffe Highlands, Gedeo",
    phone: "+251-46-555-0100",
    email: "ops@cropfort.et",
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const seedBranches: Branch[] = [
  {
    id: "br-1",
    organizationId: "org-1",
    name: "North Blocks Unit",
    code: "N-UNIT",
    address: "Upper Slope & River Bench",
    phone: "+251-46-555-0101",
    isWarehouse: false,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "br-2",
    organizationId: "org-1",
    name: "East Shade Unit",
    code: "E-UNIT",
    address: "Shade Lot & Nursery Adjacent",
    phone: "+251-46-555-0102",
    isWarehouse: false,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "br-3",
    organizationId: "org-1",
    name: "Central Input Store",
    code: "WH-01",
    address: "Estate warehouse",
    phone: "+251-46-555-0199",
    isWarehouse: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const seedWarehouses: PharmacyWarehouse[] = [
  {
    id: "pwh-1",
    organizationId: "org-1",
    branchId: "br-1",
    name: "Bole Dispensary Store",
    code: "BOL-STORE",
    active: true,
    zones: [
      {
        id: "zn-1",
        warehouseId: "pwh-1",
        name: "Normal Storage",
        storageCondition: "normal",
        active: true,
        shelves: [
          {
            id: "sh-1",
            zoneId: "zn-1",
            name: "Shelf A",
            bins: [
              { id: "bin-1", shelfId: "sh-1", code: "A-01", active: true },
              { id: "bin-2", shelfId: "sh-1", code: "A-02", active: true },
            ],
          },
        ],
      },
      {
        id: "zn-2",
        warehouseId: "pwh-1",
        name: "Cold Chain",
        storageCondition: "cold",
        active: true,
        shelves: [
          {
            id: "sh-2",
            zoneId: "zn-2",
            name: "Fridge 1",
            bins: [{ id: "bin-3", shelfId: "sh-2", code: "C-01", active: true }],
          },
        ],
      },
      {
        id: "zn-3",
        warehouseId: "pwh-1",
        name: "Controlled Drugs Vault",
        storageCondition: "controlled",
        active: true,
        shelves: [
          {
            id: "sh-3",
            zoneId: "zn-3",
            name: "Vault Shelf",
            bins: [{ id: "bin-4", shelfId: "sh-3", code: "CD-01", active: true }],
          },
        ],
      },
    ],
  },
  {
    id: "pwh-2",
    organizationId: "org-1",
    branchId: "br-3",
    name: "Regional Central Warehouse",
    code: "REG-WH",
    active: true,
    zones: [
      {
        id: "zn-4",
        warehouseId: "pwh-2",
        name: "Bulk Normal",
        storageCondition: "normal",
        active: true,
        shelves: [
          {
            id: "sh-4",
            zoneId: "zn-4",
            name: "Rack 1",
            bins: [{ id: "bin-5", shelfId: "sh-4", code: "R1-01", active: true }],
          },
        ],
      },
    ],
  },
];

interface OrgStore {
  organizations: Organization[];
  branches: Branch[];
  warehouses: PharmacyWarehouse[];
  currentOrganizationId: string;
  currentBranchId: string;
  setCurrentOrg: (id: string) => void;
  setCurrentBranch: (id: string) => void;
  addOrganization: (o: Omit<Organization, "id" | "createdAt" | "updatedAt">) => string;
  addBranch: (b: Omit<Branch, "id" | "createdAt" | "updatedAt">) => string;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  addWarehouse: (w: Omit<PharmacyWarehouse, "id" | "zones"> & { zones?: PharmacyWarehouse["zones"] }) => string;
  getCurrentOrg: () => Organization | undefined;
  getCurrentBranch: () => Branch | undefined;
  getBranchesForOrg: (orgId?: string) => Branch[];
  getWarehousesForBranch: (branchId?: string) => PharmacyWarehouse[];
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set, get) => ({
      organizations: seedOrgs,
      branches: seedBranches,
      warehouses: seedWarehouses,
      currentOrganizationId: "org-1",
      currentBranchId: "br-1",

      setCurrentOrg: (id) => {
        const firstBranch = get().branches.find((b) => b.organizationId === id && b.active);
        set({
          currentOrganizationId: id,
          currentBranchId: firstBranch?.id ?? get().currentBranchId,
        });
      },

      setCurrentBranch: (id) => set({ currentBranchId: id }),

      addOrganization: (o) => {
        const id = `org-${Date.now()}`;
        const ts = Date.now();
        set((s) => ({
          organizations: [...s.organizations, { ...o, id, createdAt: ts, updatedAt: ts }],
        }));
        return id;
      },

      addBranch: (b) => {
        const id = `br-${Date.now()}`;
        const ts = Date.now();
        set((s) => ({
          branches: [...s.branches, { ...b, id, createdAt: ts, updatedAt: ts }],
        }));
        return id;
      },

      updateBranch: (id, updates) =>
        set((s) => ({
          branches: s.branches.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
          ),
        })),

      addWarehouse: (w) => {
        const id = `pwh-${Date.now()}`;
        set((s) => ({
          warehouses: [...s.warehouses, { ...w, id, zones: w.zones ?? [] }],
        }));
        return id;
      },

      getCurrentOrg: () => get().organizations.find((o) => o.id === get().currentOrganizationId),
      getCurrentBranch: () => get().branches.find((b) => b.id === get().currentBranchId),
      getBranchesForOrg: (orgId) => {
        const oid = orgId ?? get().currentOrganizationId;
        return get().branches.filter((b) => b.organizationId === oid && b.active);
      },
      getWarehousesForBranch: (branchId) => {
        const bid = branchId ?? get().currentBranchId;
        return get().warehouses.filter((w) => w.branchId === bid && w.active);
      },
    }),
    { name: "hestia-pharmacy-org" }
  )
);

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  community_pharmacy: "Community Pharmacy",
  hospital: "Hospital",
  clinic: "Clinic",
  wholesale: "Wholesale Distributor",
  medical_store: "Medical Store",
  ngo_pharmacy: "NGO Pharmacy",
  chain_pharmacy: "Chain Pharmacy",
  regional_warehouse: "Regional Warehouse",
  coffee_farm: "Coffee Estate",
};

export const STORAGE_LABELS: Record<StorageCondition, string> = {
  normal: "Normal",
  cold: "Cold Chain",
  controlled: "Controlled Drugs",
  frozen: "Frozen",
};
