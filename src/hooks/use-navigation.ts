"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { getNavItemsForRole, type NavItem } from "@/config/navigation";
import {
  getWorkspacesForRole,
  pathMatches,
  resolveWorkspaceFromPath,
  type CropfortWorkspace,
  type WorkspaceId,
} from "@/config/cropfort-workspaces";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import type { CropfortRole, SyncStatus } from "@/types/cropfort";

export interface UseNavigationResult {
  role: CropfortRole;
  items: NavItem[];
  workspaces: CropfortWorkspace[];
  activeWorkspace: CropfortWorkspace | null;
  pathname: string;
  isActive: (href: string, options?: { exact?: boolean }) => boolean;
  isSectionActive: (item: NavItem) => boolean;
  isWorkspaceActive: (id: WorkspaceId) => boolean;
  isOnline: boolean;
  queuedItems: number;
  syncStatus: SyncStatus;
}

export function useNavigation(): UseNavigationResult {
  const { user, queuedItems, syncStatus, isOnline } = useCropfortAuth();
  const pathname = usePathname() ?? "";

  const workspaces = useMemo(() => getWorkspacesForRole(user.role), [user.role]);
  const items = useMemo(() => getNavItemsForRole(user.role), [user.role]);
  const resolved = useMemo(
    () => resolveWorkspaceFromPath(pathname, user.role),
    [pathname, user.role],
  );

  const isActive = useCallback(
    (href: string, options?: { exact?: boolean }) =>
      pathMatches(pathname, href, options?.exact),
    [pathname],
  );

  const isSectionActive = useCallback(
    (item: NavItem) => {
      if (pathMatches(pathname, item.href)) return true;
      if (item.children?.length) {
        return item.children.some((child) => pathMatches(pathname, child.href));
      }
      return false;
    },
    [pathname],
  );

  const isWorkspaceActive = useCallback(
    (id: WorkspaceId) => resolved.workspace?.id === id,
    [resolved.workspace?.id],
  );

  return {
    role: user.role,
    items,
    workspaces,
    activeWorkspace: resolved.workspace,
    pathname,
    isActive,
    isSectionActive,
    isWorkspaceActive,
    isOnline,
    queuedItems,
    syncStatus,
  };
}
