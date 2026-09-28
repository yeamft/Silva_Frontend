/**
 * Workspace UI fonts — selectable body/UI stacks for CropFort.
 * Loaded via next/font CSS variables on <html>.
 */

export type WorkspaceFontId =
  | "dm-sans"
  | "source-sans"
  | "ibm-plex"
  | "nunito-sans"
  | "libre-franklin"
  | "manrope"
  | "space-grotesk"
  | "fraunces";

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
    id: "dm-sans",
    label: "DM Sans",
    description: "Default — clean operational UI",
    cssVar: "--font-dm-sans",
  },
  {
    id: "source-sans",
    label: "Source Sans",
    description: "Readable + professional",
    cssVar: "--font-source-sans",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex",
    description: "Enterprise + technical",
    cssVar: "--font-ibm-plex",
  },
  {
    id: "nunito-sans",
    label: "Nunito Sans",
    description: "Friendly + approachable",
    cssVar: "--font-nunito-sans",
  },
  {
    id: "libre-franklin",
    label: "Libre Franklin",
    description: "Editorial + clear hierarchy",
    cssVar: "--font-libre-franklin",
  },
  {
    id: "manrope",
    label: "Manrope",
    description: "Modern geometric sans",
    cssVar: "--font-manrope",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    description: "Digital + distinctive",
    cssVar: "--font-space-grotesk",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    description: "Warm display serif for UI",
    cssVar: "--font-fraunces",
  },
];

export const DEFAULT_WORKSPACE_FONT: WorkspaceFontId = "dm-sans";

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
