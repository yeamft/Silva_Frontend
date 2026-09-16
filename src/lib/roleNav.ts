import type { UserRole } from "@/store/authStore";
import { hasPermission } from "@/lib/rbac";

/** Nav ids each Field OS desk can access */
export const ROLE_NAV_ACCESS: Record<UserRole, string[]> = {
  silva_owner: ["dashboard", "users"],
  spx_principal: ["dashboard", "users"],
  vendor_lead: ["dashboard"],
};

export function getDefaultViewForRole(_role: UserRole): string {
  return "dashboard";
}

export function canAccessNav(role: UserRole, navId: string): boolean {
  return (ROLE_NAV_ACCESS[role] ?? []).includes(navId);
}

export function canOverrideFEFO(role: UserRole): boolean {
  return hasPermission(role, "afe.approve_owner");
}
