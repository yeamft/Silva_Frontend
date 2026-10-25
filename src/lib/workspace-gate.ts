/** Remove the legacy workspace-picker flag from earlier sessions. */

const KEY = "cropfort.needWorkspace";

export function clearWorkspaceSelectionRequired() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export const WORKSPACE_HOME_PATH = "/cropfort/dashboard";

type ProgramLike = { id: string; status?: string | null };

/** Active (non-archived) programmes available as workspaces. */
export function activeWorkspacePrograms<T extends ProgramLike>(programs: T[] | null | undefined): T[] {
  return (programs ?? []).filter(
    (p) => String(p.status || "").toLowerCase() !== "archived",
  );
}

/** Retained for callers that distinguish a single assigned workspace. */
export function shouldAutoEnterSingleWorkspace(programCount: number): boolean {
  return programCount === 1;
}

/** Show the program switcher only when there is a choice. */
export function canChooseWorkspace(
  _role: string | null | undefined,
  programCount: number,
): boolean {
  return programCount > 1;
}

export type WorkspaceEntryPlan =
  | { action: "home" }
  | { action: "auto"; programId: string };

/**
 * Post-login / gate: keep a valid active workspace, otherwise open the first
 * available workspace. Users can switch workspaces from the global context bar.
 */
export function planWorkspaceEntry(opts: {
  role?: string | null;
  programs: ProgramLike[] | null | undefined;
  activeProgramId?: string | null;
}): WorkspaceEntryPlan {
  const programs = activeWorkspacePrograms(opts.programs);

  if (opts.activeProgramId && programs.some((p) => p.id === opts.activeProgramId)) {
    return { action: "home" };
  }

  const first = programs[0];
  return first ? { action: "auto", programId: first.id } : { action: "home" };
}
