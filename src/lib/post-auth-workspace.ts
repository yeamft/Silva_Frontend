"use client";

import { useAuthStore } from "@/store/authStore";
import {
  clearWorkspaceSelectionRequired,
  markWorkspaceSelectionRequired,
  planWorkspaceEntry,
  SELECT_WORKSPACE_PATH,
  WORKSPACE_HOME_PATH,
} from "@/lib/workspace-gate";

/**
 * After login / MFA: a single assigned workspace goes straight in;
 * otherwise open the workspace picker.
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
    if (result.ok) {
      clearWorkspaceSelectionRequired();
      return WORKSPACE_HOME_PATH;
    }
  }

  markWorkspaceSelectionRequired();
  return SELECT_WORKSPACE_PATH;
}
