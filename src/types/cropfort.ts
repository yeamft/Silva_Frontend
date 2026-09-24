/** Cropfort RBAC roles (PRD §5 / FR-AUTH-005). */
export type CropfortRole =
  | "field_supervisor"
  | "bagro_office"
  | "spx_validator"
  | "farm_owner"
  | "spx_platform_admin";

export interface CropfortUser {
  id: string;
  name: string;
  email: string;
  role: CropfortRole;
  tenantId: string;
  tenantName: string;
}

export interface CropfortSession {
  id: string;
  device: string;
  location: string;
  lastActiveAt: string;
  current: boolean;
}

export type SyncStatus = "pending" | "syncing" | "synced";

export const CROPFORT_ROLE_LABELS: Record<CropfortRole, string> = {
  field_supervisor: "Field Supervisor",
  bagro_office: "RFSP Office",
  spx_validator: "SPX Account Manager",
  farm_owner: "Chaka Buna reviewer",
  spx_platform_admin: "Platform Admin",
};
