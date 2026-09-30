/** Session-only gate: after login, user must pick a workspace before Cropfort. */

const KEY = "cropfort.needWorkspace";

export function markWorkspaceSelectionRequired() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, "1");
}

export function clearWorkspaceSelectionRequired() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function needsWorkspaceSelection() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "1";
}

export const SELECT_WORKSPACE_PATH = "/select-workspace";
export const WORKSPACE_HOME_PATH = "/cropfort/dashboard";

type ProgramLike = { id: string; status?: string | null };

/** Active (non-archived) programmes available as workspaces. */
export function activeWorkspacePrograms<T extends ProgramLike>(programs: T[] | null | undefined): T[] {
  return (programs ?? []).filter(
    (p) => String(p.status || "").toLowerCase() !== "archived",
  );
}

/** Any role with exactly one workspace skips the picker and enters it. */
export function shouldAutoEnterSingleWorkspace(programCount: number): boolean {
  return programCount === 1;
}

/** Show workspace switcher / “All workspaces” only when there is a choice. */
export function canChooseWorkspace(
  _role: string | null | undefined,
  programCount: number,
): boolean {
  return programCount > 1;
}

export type WorkspaceEntryPlan =
  | { action: "home" }
  | { action: "auto"; programId: string }
  | { action: "pick" };

/**
 * Post-login / gate: one assigned workspace → home or auto-enter;
 * zero or multiple → workspace picker.
 */
export function planWorkspaceEntry(opts: {
  role?: string | null;
  programs: ProgramLike[] | null | undefined;
  activeProgramId?: string | null;
}): WorkspaceEntryPlan {
  const programs = activeWorkspacePrograms(opts.programs);

  if (shouldAutoEnterSingleWorkspace(programs.length)) {
    const only = programs[0]!;
    if (opts.activeProgramId === only.id) return { action: "home" };
    return { action: "auto", programId: only.id };
  }

  return { action: "pick" };
}
