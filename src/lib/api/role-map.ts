import type { FieldUserRole } from "@/types/fieldOs";
import type { CropfortRole } from "@/types/cropfort";
import type { AuthUser, MeResponse } from "@/lib/api/types";
import { LEGACY_ROLE_MAP } from "@/lib/rbac";

const VENDOR_PREFIX = "vendor_";
const SILVA_PREFIX = "silva_";
const SPX_PREFIX = "spx_";

export function mapBackendRole(role: string): FieldUserRole {
  if (role in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[role];
  if (role === "vendor_field_lead" || role.startsWith(VENDOR_PREFIX)) return "vendor_lead";
  if (role.startsWith(SILVA_PREFIX)) return "silva_owner";
  if (role.startsWith(SPX_PREFIX) || role === "system_admin") return "spx_principal";
  return "spx_principal";
}

export function mapToCropfortRole(role: string): CropfortRole {
  const desk = mapBackendRole(role);
  if (desk === "silva_owner") return "farm_owner";
  // Vendor users act as the Vendor party on field tickets (not site owner).
  if (desk === "vendor_lead" || role.startsWith("vendor_")) return "bagro_office";
  if (role === "system_admin") return "spx_platform_admin";
  return "spx_validator";
}

export function userFromMe(me: MeResponse) {
  return userFromAuthUser(me.user, me);
}

export function userFromAuthUser(user: AuthUser, me?: MeResponse | null) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: mapBackendRole(user.role),
    organizationId: user.organizationId,
    branchId: user.activeProgramId || me?.activeProgram?.id || undefined,
    backendRole: user.role,
    organizationType: user.organizationType,
    activeProgramId: user.activeProgramId,
  };
}
