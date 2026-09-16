import type { FieldUserRole } from "@/types/fieldOs";

/** @deprecated alias — farm roles map into Field OS desks */
export type FarmUserRole = FieldUserRole;

export type Permission =
  | "dashboard.view"
  | "afp.view"
  | "afp.approve"
  | "afe.view"
  | "afe.author"
  | "afe.approve_owner"
  | "afe.issue"
  | "wo.view"
  | "wo.issue"
  | "ft.view"
  | "ft.submit"
  | "ft.validate"
  | "pr.view"
  | "pr.submit"
  | "pr.approve"
  | "settlement.view"
  | "settlement.release"
  | "budget.view"
  | "vendors.view"
  | "vendors.manage"
  | "revenue.view"
  | "calendar.view"
  | "forms.view"
  | "reports.view"
  | "reports.release"
  | "users.view"
  | "users.manage"
  | "settings.manage";

const SPX_ALL: Permission[] = [
  "dashboard.view",
  "afp.view",
  "afe.view",
  "afe.author",
  "afe.issue",
  "wo.view",
  "wo.issue",
  "ft.view",
  "ft.validate",
  "pr.view",
  "pr.approve",
  "settlement.view",
  "settlement.release",
  "budget.view",
  "vendors.view",
  "vendors.manage",
  "revenue.view",
  "calendar.view",
  "forms.view",
  "reports.view",
  "reports.release",
  "users.view",
  "users.manage",
  "settings.manage",
];

const SILVA: Permission[] = [
  "dashboard.view",
  "afp.view",
  "afp.approve",
  "afe.view",
  "afe.approve_owner",
  "wo.view",
  "settlement.view",
  "budget.view",
  "vendors.view",
  "calendar.view",
  "reports.view",
  "users.view",
  "settings.manage",
];

const VENDOR: Permission[] = [
  "dashboard.view",
  "afe.view",
  "wo.view",
  "ft.view",
  "ft.submit",
  "pr.view",
  "pr.submit",
  "calendar.view",
  "forms.view",
  "reports.view",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<FieldUserRole, Permission[]> = {
  silva_owner: SILVA,
  spx_principal: SPX_ALL,
  vendor_lead: VENDOR,
};

let ROLE_PERMISSION_OVERRIDES: Partial<Record<FieldUserRole, Permission[]>> = {};

export function setRolePermissions(role: FieldUserRole, permissions: Permission[]) {
  ROLE_PERMISSION_OVERRIDES = { ...ROLE_PERMISSION_OVERRIDES, [role]: permissions };
}

export function getPermissionsForRole(role: FieldUserRole): Permission[] {
  return ROLE_PERMISSION_OVERRIDES[role] ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: FieldUserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export const ROLE_LABELS: Record<FieldUserRole, string> = {
  silva_owner: "Silva · Owner",
  spx_principal: "SPX · Account Manager",
  vendor_lead: "Vendor · Lead",
};

/** Map legacy + Farm OS roles → Field OS desks */
export const LEGACY_ROLE_MAP: Record<string, FieldUserRole> = {
  admin: "spx_principal",
  super_admin: "spx_principal",
  org_owner: "silva_owner",
  farm_owner: "silva_owner",
  farm_manager: "spx_principal",
  block_supervisor: "vendor_lead",
  silva_owner: "silva_owner",
  spx_principal: "spx_principal",
  vendor_lead: "vendor_lead",
  vendor_field_lead: "vendor_lead",
  manager: "spx_principal",
  supervisor: "vendor_lead",
};
