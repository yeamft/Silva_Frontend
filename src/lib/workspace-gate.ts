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
