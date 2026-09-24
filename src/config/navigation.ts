/**
 * Legacy NavItem bridge — prefer `@/config/cropfort-workspaces` for new UI.
 * Keeps CROPFORT_ROUTES and helpers for existing imports.
 */

import type { LucideIcon } from "lucide-react";
import { Archive, CalendarRange, FileStack, FolderKanban, Hammer, Library, LineChart, ListChecks, Network, ScrollText, Shield, Zap } from "lucide-react";
import type { CropfortRole } from "@/types/cropfort";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import {
  getWorkspacesForRole,
  WORKSPACE_MOBILE_ORDER,
  type WorkspaceId,
} from "@/config/cropfort-workspaces";

export { CROPFORT_ROUTES };

export type NavItemId = string;

export interface NavChild {
  id: string;
  label: string;
  href: string;
  roles?: CropfortRole[] | "all";
}

export interface NavItem {
  id: NavItemId;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: CropfortRole[] | "all";
  children?: NavChild[];
}

/** Workspace-derived primary items (no nested accordion children in sidebar). */
export function getNavItemsForRole(role: CropfortRole): NavItem[] {
  return getWorkspacesForRole(role).map((ws) => ({
    id: ws.id,
    label: ws.label,
    href: ws.href,
    icon: ws.icon,
    roles: ws.roles,
    children: ws.modules.map((m) => ({
      id: m.id,
      label: m.label,
      href: m.href,
      roles: m.roles,
    })),
  }));
}

/** @deprecated Prefer getNavItemsForRole — kept for rare static consumers. */
export const NAVIGATION_ITEMS: NavItem[] = getNavItemsForRole("spx_platform_admin");

export const MOBILE_PRIMARY_NAV: Record<CropfortRole, WorkspaceId[]> = {
  field_supervisor: ["overview", "execution", "control"],
  bagro_office: ["overview", "execution", "control"],
  spx_validator: ["overview", "planning", "execution", "control", "performance"],
  farm_owner: ["overview", "planning", "control", "performance"],
  spx_platform_admin: ["overview", "planning", "execution", "control", "administration"],
};

export function getMobileNavItemsForRole(role: CropfortRole): NavItem[] {
  const byId = new Map(getNavItemsForRole(role).map((item) => [item.id, item]));
  const order = MOBILE_PRIMARY_NAV[role] ?? WORKSPACE_MOBILE_ORDER;
  return order.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
}

export const SETTINGS_ICON = Archive;
export const ARCHIVE_ICON = Archive;
export const LEGACY_ICONS = {
  CalendarRange,
  FolderKanban,
  Hammer,
  Library,
  LineChart,
  ListChecks,
  Network,
  ScrollText,
  Shield,
  FileStack,
  Zap,
};
