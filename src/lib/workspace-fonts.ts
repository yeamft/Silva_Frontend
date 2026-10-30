/**
 * Workspace UI fonts — selectable body/UI stacks for CropFort.
 * Loaded via next/font CSS variables on <html>.
 */

export type WorkspaceFontId = "ibm-plex" | "inter";

export type WorkspaceFontDef = {
  id: WorkspaceFontId;
  label: string;
  description: string;
  /** CSS variable set by next/font in root layout */
  cssVar: string;
  /** Preview style for the picker row */
  previewWeight?: number;
};

export const WORKSPACE_FONTS: WorkspaceFontDef[] = [
  {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    description: "Default — clear figures and labels for planning",
    cssVar: "--font-ibm-plex",
  },
  {
    id: "inter",
    label: "Inter",
    description: "Neutral and compact",
    cssVar: "--font-inter",
  },
];

export const DEFAULT_WORKSPACE_FONT: WorkspaceFontId = "ibm-plex";

export function getWorkspaceFont(id: WorkspaceFontId | string | undefined | null): WorkspaceFontDef {
  return WORKSPACE_FONTS.find((f) => f.id === id) ?? WORKSPACE_FONTS[0];
}

export function resolveWorkspaceFontId(
  id: WorkspaceFontId | string | undefined | null,
): WorkspaceFontId {
  if (id && WORKSPACE_FONTS.some((f) => f.id === id)) return id as WorkspaceFontId;
  return DEFAULT_WORKSPACE_FONT;
}

/** Point --font-sans at the chosen next/font variable. */
export function applyWorkspaceFont(id: WorkspaceFontId) {
  if (typeof document === "undefined") return;
  const def = getWorkspaceFont(id);
  const root = document.documentElement;
  root.setAttribute("data-font", def.id);
  root.style.setProperty("--font-sans", `var(${def.cssVar})`);
}
