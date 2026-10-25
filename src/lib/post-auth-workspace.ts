"use client";

import { useAuthStore } from "@/store/authStore";
import {
  clearWorkspaceSelectionRequired,
  planWorkspaceEntry,
  WORKSPACE_HOME_PATH,
} from "@/lib/workspace-gate";
import { toast } from "sonner";

/**
 * After login / MFA, enter the current workspace or choose a default.
 */
export async function continueAfterAuth(): Promise<string> {
  const state = useAuthStore.getState();
  const me = state.me;
  const user = state.user;
  const plan = planWorkspaceEntry({
    programs: me?.programs,
    activeProgramId: me?.activeProgram?.id || user?.activeProgramId || null,
  });

  if (plan.action === "home") {
    clearWorkspaceSelectionRequired();
    return WORKSPACE_HOME_PATH;
  }

  if (plan.action === "auto") {
    const result = await state.switchProgram(plan.programId);
    if (result.ok === false) {
      toast.error(result.error || "Could not open your workspace");
    }
  }

  clearWorkspaceSelectionRequired();
  return WORKSPACE_HOME_PATH;
}
