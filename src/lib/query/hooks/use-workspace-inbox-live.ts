"use client";

import { useMemo } from "react";
import {
  buildWorkspaceInbox,
  inboxTotal,
  type WorkspaceInboxItem,
} from "@/lib/cropfort/workspace-inbox";
import { useInterventions } from "@/lib/query/hooks/use-interventions";
import { usePerformanceLiveData } from "@/lib/query/hooks/use-performance-live";
import { useProjects } from "@/lib/query/hooks/use-projects";
import { useAuthStore } from "@/store/authStore";

/** Live attention inbox for Cropfort shell + select-workspace (authStore-backed). */
export function useWorkspaceInboxLive(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const me = useAuthStore((s) => s.me);
  const role = user?.role || me?.user?.role || "";
  const userName = user?.name || user?.email || me?.user?.name || "Account";
  const activeProgramId = me?.activeProgram?.id;
  const liveEnabled = enabled && Boolean(activeProgramId);

  const live = usePerformanceLiveData(liveEnabled);
  const projectsQuery = useProjects(liveEnabled);
  const interventionsQuery = useInterventions(liveEnabled);

  const items: WorkspaceInboxItem[] = useMemo(
    () =>
      buildWorkspaceInbox({
        role,
        userName,
        workOrders: live.workOrders,
        tickets: live.tickets,
        afes: live.afes,
        projects: projectsQuery.data || [],
        interventions: interventionsQuery.data || [],
        dfrs: live.dfrs,
        monthly: live.monthly,
        weekly: live.weekly,
      }),
    [
      role,
      userName,
      live.workOrders,
      live.tickets,
      live.afes,
      live.dfrs,
      live.monthly,
      live.weekly,
      projectsQuery.data,
      interventionsQuery.data,
    ],
  );

  const total = useMemo(() => inboxTotal(items), [items]);

  return {
    items,
    total,
    isLoading:
      liveEnabled &&
      (live.isLoading || projectsQuery.isLoading || interventionsQuery.isLoading),
  };
}
