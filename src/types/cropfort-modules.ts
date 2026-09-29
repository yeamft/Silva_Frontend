import type { CropfortRole } from "@/types/cropfort";

/** Rate card line lifecycle. Farm owners never see draft/returned. */
export type RateCardStatus = "draft" | "submitted" | "approved" | "returned";

/** Category slug stored on rate lines (e.g. labour, material). Configurable per tenant. */
export type RateCardCategory = string;

export interface RateCardCategoryConfig {
  id: string;
  value: string;
  label: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RateCardCategoryInput = {
  label: string;
  value?: string;
  active?: boolean;
};

/** Default seed categories — tenants can add, rename, or deactivate. */
export const DEFAULT_RATE_CARD_CATEGORIES: Omit<RateCardCategoryConfig, "id" | "createdAt" | "updatedAt">[] = [
  { value: "labour", label: "Labour", active: true },
  { value: "material", label: "Material", active: true },
  { value: "machinery", label: "Machinery", active: true },
  { value: "transport", label: "Transport", active: true },
  { value: "other", label: "Other", active: true },
];

/** @deprecated Prefer loading categories from the rate-card categories API. */
export const RATE_CARD_CATEGORIES = DEFAULT_RATE_CARD_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

export interface RateCardLine {
  id: string;
  resourceCode: string;
  resourceName: string;
  category: RateCardCategory;
  unitOfMeasure: string;
  rateBirr: number;
  benchmarkFarmARate: number | null;
  benchmarkFarmBRate: number | null;
  /** Client/server preview; backend is authoritative. */
  variancePct: number | null;
  flagged: boolean;
  justificationNote: string;
  status: RateCardStatus;
  /** Fiscal year start (e.g. 2026 = FY 2026/27). */
  budgetYear: number;
  budgetYearLabel?: string;
  archivedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RateCardLineInput = Omit<
  RateCardLine,
  "id" | "variancePct" | "flagged" | "status" | "createdAt" | "updatedAt" | "archivedAt" | "budgetYearLabel"
> & {
  status?: RateCardStatus;
  archivedAt?: string | null;
};

export interface RateCardBudgetYear {
  budgetYear: number;
  label: string;
  total: number;
  activeCount: number;
  archivedCount: number;
}

/** Ethiopian coffee FY starts in July. */
export function currentBudgetYear(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
}

export function formatBudgetYearLabel(budgetYear: number): string {
  return `FY ${budgetYear}/${String(budgetYear + 1).slice(-2)}`;
}

export type AccountStatus = "invited" | "active" | "suspended";

/** Organization affiliation on a user record (not CropfortRole). */
export type UserOrgKind = "spx" | "bagro" | "silva";

export interface TenantAssignment {
  tenantId: string;
  tenantName: string;
  roles: CropfortRole[];
  blockIds: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  organization: UserOrgKind;
  roles: CropfortRole[];
  tenants: TenantAssignment[];
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
  /** True when the account has never authenticated — delete is allowed. */
  neverLoggedIn: boolean;
}

export type AdminUserInput = {
  name: string;
  email: string;
  organization: UserOrgKind;
  status: AccountStatus;
  roles: CropfortRole[];
  tenants: TenantAssignment[];
};

export type OrganizationType = "spx" | "bagro" | "silva_estate" | "vendor_org" | "other";
export type EntityStatus = "active" | "inactive";
export type VendorStatus = "active" | "pending" | "expired" | "terminated";

export const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "spx", label: "SPX (Silva)" },
  { value: "bagro", label: "RFSP" },
  { value: "silva_estate", label: "Chaka Buna (Farm Co.)" },
  { value: "vendor_org", label: "Vendor" },
  { value: "other", label: "Other" },
];

/** Canonical vendor service categories for create/edit dropdowns. */
export const VENDOR_CATEGORIES = [
  "Estate execution",
  "Civil / stumping",
  "Civil",
  "Seasonal labour",
  "Transport",
  "Processing",
  "Plant material",
  "Planting",
  "Inputs",
  "Security",
  "Machinery hire",
  "Laboratory",
] as const;

export interface FarmBlockRef {
  id: string;
  code: string;
  name: string;
  hectares: number;
  farmAreaId?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  status?: EntityStatus;
}

export interface AdminOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: EntityStatus;
  createdAt: string;
}

export interface FarmArea {
  id: string;
  name: string;
  organizationId: string;
  totalHectares: number;
  status: EntityStatus;
  blockIds: string[];
  vendorIds: string[];
  assetOwnerIds: string[];
  createdAt: string;
}

export interface VendorRecord {
  id: string;
  name: string;
  category: string;
  status: VendorStatus;
  prequalified: boolean;
  insuranceOnFile: boolean;
  farmAreaIds: string[];
  blockIds: string[];
  createdAt: string;
}

export interface AssetOwner {
  id: string;
  name: string;
  organizationId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  farmAreaIds: string[];
  blockIds: string[];
  createdAt: string;
}

export interface FarmMapRow {
  farmAreaId: string;
  farmAreaName: string;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  assetOwners: string[];
  primaryVendors: string[];
  blocksCount: number;
  hectares: number;
  status: EntityStatus;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export const USER_ORG_LABELS: Record<UserOrgKind, string> = {
  spx: "SPX",
  bagro: "RFSP",
  silva: "Chaka Buna",
};

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  spx: "SPX (Silva)",
  bagro: "RFSP",
  silva_estate: "Chaka Buna (Farm Co.)",
  vendor_org: "Vendor",
  other: "Other",
};
