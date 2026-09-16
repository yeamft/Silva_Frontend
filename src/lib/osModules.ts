import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, UsersRound } from "lucide-react";

export type OsModuleId = "dashboard" | "users";

export interface OsNavItem {
  id: OsModuleId;
  labelKey: string;
  icon: LucideIcon;
}

export interface OsNavGroup {
  id: string;
  labelKey: string;
  items: OsNavItem[];
}

export const OS_NAV_GROUPS: OsNavGroup[] = [
  {
    id: "main",
    labelKey: "nav_group_admin",
    items: [
      { id: "dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard },
      { id: "users", labelKey: "nav_users", icon: UsersRound },
    ],
  },
];

export const MOBILE_PRIMARY_NAV: OsModuleId[] = ["dashboard", "users"];
