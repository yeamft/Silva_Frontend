"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  getNavItemsForRole,
  type NavItem,
} from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import type { CropfortRole, SyncStatus } from "@/types/cropfort";

export interface UseNavigationResult {
  role: CropfortRole;
  items: NavItem[];
  pathname: string;
  isActive: (href: string, options?: { exact?: boolean }) => boolean;
  isSectionActive: (item: NavItem) => boolean;
  isOnline: boolean;
  queuedItems: number;
  syncStatus: SyncStatus;
}

function pathMatches(pathname: string, href: string, exact = false) {
  if (pathname === href) return true;
  if (!exact && href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

/**
 * Active route detection, role-filtered menu, and offline/sync status.
 */
export function useNavigation(): UseNavigationResult {
  const { user, queuedItems, syncStatus, isOnline } = useCropfortAuth();
  const pathname = usePathname() ?? "";

  const items = useMemo(() => getNavItemsForRole(user.role), [user.role]);

  const isActive = useCallback(
    (href: string, options?: { exact?: boolean }) =>
      pathMatches(pathname, href, options?.exact),
    [pathname]
  );

  const isSectionActive = useCallback(
    (item: NavItem) => {
      if (item.children?.length) {
        return item.children.some((child) => pathMatches(pathname, child.href, true));
      }
      return pathMatches(pathname, item.href);
    },
    [pathname]
  );

  return {
    role: user.role,
    items,
    pathname,
    isActive,
    isSectionActive,
    isOnline,
    queuedItems,
    syncStatus,
  };
}
