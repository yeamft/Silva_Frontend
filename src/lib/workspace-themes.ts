/**
 * Workspace color palettes — accent + tinted workspace surfaces.
 * Cards stay white/elevated; canvas, sidebar, muted, and borders shift with the theme.
 */

import type { CropfortRole } from "@/types/cropfort";

export type WorkspaceColorId =
  | "forest"
  | "upwork"
  | "mint"
  | "navy"
  | "slate"
  | "coffee"
  | "olive"
  | "teal"
  | "gold";

export type WorkspaceColorTokens = {
  background: string;
  sidebarBackground: string;
  muted: string;
  secondary: string;
  border: string;
  input: string;
  mutedForeground: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentForeground: string;
  ring: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  surfaceOverlay: string;
  /** Preview swatch for the picker UI */
  swatch: string;
};

export type WorkspaceColorDef = {
  id: WorkspaceColorId;
  label: string;
  description: string;
  light: WorkspaceColorTokens;
  dark: WorkspaceColorTokens;
};

export const WORKSPACE_COLORS: WorkspaceColorDef[] = [
  {
    id: "forest",
    label: "Forest",
    description: "Default CropFort accent",
    light: {
      background: "90 12% 96%",
      sidebarBackground: "90 10% 97%",
      muted: "90 8% 95%",
      secondary: "90 8% 95%",
      border: "120 6% 89%",
      input: "120 6% 89%",
      mutedForeground: "150 5% 42%",
      primary: "154 48% 24%",
      primaryHover: "155 51% 18%",
      accent: "150 25% 93%",
      accentForeground: "154 48% 20%",
      ring: "154 48% 24%",
      sidebarPrimary: "154 48% 24%",
      sidebarAccent: "150 25% 93%",
      sidebarAccentForeground: "154 48% 20%",
      sidebarBorder: "120 6% 89%",
      surfaceOverlay: "90 8% 95%",
      swatch: "#1F5A42",
    },
    dark: {
      background: "150 12% 9%",
      sidebarBackground: "150 12% 10%",
      muted: "150 8% 14%",
      secondary: "150 8% 15%",
      border: "150 8% 18%",
      input: "150 8% 18%",
      mutedForeground: "120 6% 62%",
      primary: "154 42% 42%",
      primaryHover: "154 45% 36%",
      accent: "154 18% 16%",
      accentForeground: "150 30% 82%",
      ring: "154 42% 48%",
      sidebarPrimary: "154 42% 48%",
      sidebarAccent: "154 16% 15%",
      sidebarAccentForeground: "150 30% 85%",
      sidebarBorder: "150 8% 16%",
      surfaceOverlay: "150 10% 10%",
      swatch: "#3D9B6E",
    },
  },
  {
    id: "upwork",
    label: "Green",
    description: "Bright action green with mint canvas",
    light: {
      /* Upwork-like mint workspace */
      background: "113 33% 97%",
      sidebarBackground: "0 0% 100%",
      muted: "113 22% 95%",
      secondary: "113 28% 94%",
      border: "113 14% 88%",
      input: "113 14% 86%",
      mutedForeground: "150 8% 38%",
      primary: "113 100% 33%",
      primaryHover: "113 100% 28%",
      accent: "113 48% 93%",
      accentForeground: "113 50% 18%",
      ring: "113 100% 33%",
      sidebarPrimary: "113 100% 33%",
      sidebarAccent: "113 40% 95%",
      sidebarAccentForeground: "113 50% 16%",
      sidebarBorder: "113 14% 90%",
      surfaceOverlay: "113 28% 95%",
      swatch: "#14A800",
    },
    dark: {
      background: "150 16% 8%",
      sidebarBackground: "150 18% 9%",
      muted: "150 10% 14%",
      secondary: "150 12% 16%",
      border: "150 12% 18%",
      input: "150 12% 18%",
      mutedForeground: "113 10% 62%",
      primary: "113 85% 42%",
      primaryHover: "113 85% 36%",
      accent: "113 22% 16%",
      accentForeground: "113 40% 78%",
      ring: "113 85% 48%",
      sidebarPrimary: "113 85% 42%",
      sidebarAccent: "113 18% 14%",
      sidebarAccentForeground: "113 40% 82%",
      sidebarBorder: "150 12% 16%",
      surfaceOverlay: "150 14% 10%",
      swatch: "#1FCF08",
    },
  },
  {
    id: "mint",
    label: "Light green",
    description: "Soft mint workspace",
    light: {
      background: "113 40% 96%",
      sidebarBackground: "113 35% 98%",
      muted: "113 30% 94%",
      secondary: "113 32% 93%",
      border: "113 18% 88%",
      input: "113 18% 86%",
      mutedForeground: "113 12% 40%",
      primary: "113 45% 38%",
      primaryHover: "113 48% 30%",
      accent: "113 42% 92%",
      accentForeground: "113 40% 22%",
      ring: "113 45% 38%",
      sidebarPrimary: "113 45% 38%",
      sidebarAccent: "113 35% 93%",
      sidebarAccentForeground: "113 40% 22%",
      sidebarBorder: "113 18% 88%",
      surfaceOverlay: "113 30% 94%",
      swatch: "#5FAF4A",
    },
    dark: {
      background: "140 14% 9%",
      sidebarBackground: "140 14% 10%",
      muted: "140 10% 14%",
      secondary: "140 10% 15%",
      border: "140 10% 18%",
      input: "140 10% 18%",
      mutedForeground: "113 12% 62%",
      primary: "113 48% 52%",
      primaryHover: "113 48% 44%",
      accent: "113 18% 16%",
      accentForeground: "113 35% 80%",
      ring: "113 48% 55%",
      sidebarPrimary: "113 48% 52%",
      sidebarAccent: "113 16% 15%",
      sidebarAccentForeground: "113 35% 85%",
      sidebarBorder: "140 10% 16%",
      surfaceOverlay: "140 12% 10%",
      swatch: "#7BC96A",
    },
  },
  {
    id: "navy",
    label: "Navy",
    description: "Cool blue workspace",
    light: {
      background: "214 28% 97%",
      sidebarBackground: "214 30% 98%",
      muted: "214 22% 95%",
      secondary: "214 24% 94%",
      border: "214 16% 88%",
      input: "214 16% 86%",
      mutedForeground: "215 12% 40%",
      primary: "215 50% 28%",
      primaryHover: "215 55% 22%",
      accent: "214 40% 93%",
      accentForeground: "215 50% 24%",
      ring: "215 50% 28%",
      sidebarPrimary: "215 50% 28%",
      sidebarAccent: "214 40% 94%",
      sidebarAccentForeground: "215 50% 24%",
      sidebarBorder: "214 16% 88%",
      surfaceOverlay: "214 22% 95%",
      swatch: "#243B66",
    },
    dark: {
      background: "220 18% 9%",
      sidebarBackground: "220 18% 10%",
      muted: "220 12% 14%",
      secondary: "220 12% 15%",
      border: "220 12% 18%",
      input: "220 12% 18%",
      mutedForeground: "214 12% 62%",
      primary: "214 55% 52%",
      primaryHover: "214 55% 44%",
      accent: "215 25% 16%",
      accentForeground: "214 40% 82%",
      ring: "214 55% 56%",
      sidebarPrimary: "214 55% 52%",
      sidebarAccent: "215 22% 15%",
      sidebarAccentForeground: "214 40% 85%",
      sidebarBorder: "220 12% 16%",
      surfaceOverlay: "220 14% 10%",
      swatch: "#5B8DEF",
    },
  },
  {
    id: "slate",
    label: "Slate",
    description: "Cool gray workspace",
    light: {
      background: "210 12% 96%",
      sidebarBackground: "210 10% 98%",
      muted: "210 10% 94%",
      secondary: "210 10% 93%",
      border: "210 10% 88%",
      input: "210 10% 86%",
      mutedForeground: "210 8% 40%",
      primary: "210 12% 28%",
      primaryHover: "210 14% 20%",
      accent: "210 10% 93%",
      accentForeground: "210 12% 24%",
      ring: "210 12% 28%",
      sidebarPrimary: "210 12% 28%",
      sidebarAccent: "210 10% 94%",
      sidebarAccentForeground: "210 12% 24%",
      sidebarBorder: "210 10% 88%",
      surfaceOverlay: "210 10% 94%",
      swatch: "#3F4A54",
    },
    dark: {
      background: "210 10% 9%",
      sidebarBackground: "210 10% 10%",
      muted: "210 8% 14%",
      secondary: "210 8% 15%",
      border: "210 8% 18%",
      input: "210 8% 18%",
      mutedForeground: "210 8% 62%",
      primary: "210 14% 62%",
      primaryHover: "210 14% 54%",
      accent: "210 10% 16%",
      accentForeground: "210 12% 85%",
      ring: "210 14% 65%",
      sidebarPrimary: "210 14% 62%",
      sidebarAccent: "210 10% 15%",
      sidebarAccentForeground: "210 12% 88%",
      sidebarBorder: "210 8% 16%",
      surfaceOverlay: "210 10% 10%",
      swatch: "#92A0AE",
    },
  },
  {
    id: "coffee",
    label: "Coffee",
    description: "Warm estate workspace",
    light: {
      background: "35 22% 96%",
      sidebarBackground: "35 20% 98%",
      muted: "35 16% 94%",
      secondary: "35 18% 93%",
      border: "30 12% 88%",
      input: "30 12% 86%",
      mutedForeground: "25 10% 40%",
      primary: "25 35% 28%",
      primaryHover: "25 38% 20%",
      accent: "30 28% 93%",
      accentForeground: "25 35% 24%",
      ring: "25 35% 28%",
      sidebarPrimary: "25 35% 28%",
      sidebarAccent: "30 28% 94%",
      sidebarAccentForeground: "25 35% 24%",
      sidebarBorder: "30 12% 88%",
      surfaceOverlay: "35 16% 94%",
      swatch: "#5C4033",
    },
    dark: {
      background: "25 14% 9%",
      sidebarBackground: "25 14% 10%",
      muted: "25 10% 14%",
      secondary: "25 10% 15%",
      border: "25 10% 18%",
      input: "25 10% 18%",
      mutedForeground: "30 10% 62%",
      primary: "28 40% 52%",
      primaryHover: "28 40% 44%",
      accent: "25 18% 16%",
      accentForeground: "30 25% 82%",
      ring: "28 40% 55%",
      sidebarPrimary: "28 40% 52%",
      sidebarAccent: "25 16% 15%",
      sidebarAccentForeground: "30 25% 85%",
      sidebarBorder: "25 10% 16%",
      surfaceOverlay: "25 12% 10%",
      swatch: "#C49A6C",
    },
  },
  {
    id: "olive",
    label: "Olive",
    description: "Field olive workspace",
    light: {
      background: "80 18% 96%",
      sidebarBackground: "80 16% 98%",
      muted: "80 14% 94%",
      secondary: "80 14% 93%",
      border: "80 10% 88%",
      input: "80 10% 86%",
      mutedForeground: "80 10% 40%",
      primary: "80 28% 28%",
      primaryHover: "80 32% 20%",
      accent: "80 22% 92%",
      accentForeground: "80 28% 22%",
      ring: "80 28% 28%",
      sidebarPrimary: "80 28% 28%",
      sidebarAccent: "80 22% 93%",
      sidebarAccentForeground: "80 28% 22%",
      sidebarBorder: "80 10% 88%",
      surfaceOverlay: "80 14% 94%",
      swatch: "#4A5A32",
    },
    dark: {
      background: "90 12% 9%",
      sidebarBackground: "90 12% 10%",
      muted: "90 8% 14%",
      secondary: "90 8% 15%",
      border: "90 8% 18%",
      input: "90 8% 18%",
      mutedForeground: "80 10% 62%",
      primary: "80 30% 48%",
      primaryHover: "80 30% 40%",
      accent: "80 16% 15%",
      accentForeground: "80 22% 82%",
      ring: "80 30% 52%",
      sidebarPrimary: "80 30% 48%",
      sidebarAccent: "80 14% 14%",
      sidebarAccentForeground: "80 22% 85%",
      sidebarBorder: "90 8% 16%",
      surfaceOverlay: "90 10% 10%",
      swatch: "#8FA35A",
    },
  },
  {
    id: "teal",
    label: "Teal",
    description: "Cool teal workspace",
    light: {
      background: "178 22% 96%",
      sidebarBackground: "178 20% 98%",
      muted: "178 16% 94%",
      secondary: "178 18% 93%",
      border: "178 12% 88%",
      input: "178 12% 86%",
      mutedForeground: "178 10% 40%",
      primary: "178 42% 28%",
      primaryHover: "178 45% 20%",
      accent: "178 30% 92%",
      accentForeground: "178 42% 22%",
      ring: "178 42% 28%",
      sidebarPrimary: "178 42% 28%",
      sidebarAccent: "178 30% 93%",
      sidebarAccentForeground: "178 42% 22%",
      sidebarBorder: "178 12% 88%",
      surfaceOverlay: "178 16% 94%",
      swatch: "#29665F",
    },
    dark: {
      background: "185 14% 9%",
      sidebarBackground: "185 14% 10%",
      muted: "185 10% 14%",
      secondary: "185 10% 15%",
      border: "185 10% 18%",
      input: "185 10% 18%",
      mutedForeground: "178 10% 62%",
      primary: "178 40% 45%",
      primaryHover: "178 40% 38%",
      accent: "178 20% 15%",
      accentForeground: "178 30% 82%",
      ring: "178 40% 50%",
      sidebarPrimary: "178 40% 45%",
      sidebarAccent: "178 18% 14%",
      sidebarAccentForeground: "178 30% 85%",
      sidebarBorder: "185 10% 16%",
      surfaceOverlay: "185 12% 10%",
      swatch: "#4DB6AC",
    },
  },
  {
    id: "gold",
    label: "Gold",
    description: "Warm golden workspace",
    light: {
      background: "42 35% 96%",
      sidebarBackground: "42 30% 98%",
      muted: "42 28% 94%",
      secondary: "42 30% 93%",
      border: "40 18% 88%",
      input: "40 18% 86%",
      mutedForeground: "35 12% 40%",
      primary: "38 70% 38%",
      primaryHover: "38 75% 30%",
      accent: "42 45% 92%",
      accentForeground: "38 55% 22%",
      ring: "38 70% 38%",
      sidebarPrimary: "38 70% 38%",
      sidebarAccent: "42 40% 93%",
      sidebarAccentForeground: "38 55% 22%",
      sidebarBorder: "40 18% 88%",
      surfaceOverlay: "42 28% 94%",
      swatch: "#C49A1A",
    },
    dark: {
      background: "35 14% 9%",
      sidebarBackground: "35 14% 10%",
      muted: "35 12% 14%",
      secondary: "35 12% 15%",
      border: "35 12% 18%",
      input: "35 12% 18%",
      mutedForeground: "40 12% 62%",
      primary: "42 65% 48%",
      primaryHover: "42 65% 40%",
      accent: "38 22% 15%",
      accentForeground: "42 40% 82%",
      ring: "42 65% 52%",
      sidebarPrimary: "42 65% 48%",
      sidebarAccent: "38 20% 14%",
      sidebarAccentForeground: "42 40% 85%",
      sidebarBorder: "35 12% 16%",
      surfaceOverlay: "35 12% 10%",
      swatch: "#D4A84B",
    },
  },
];

export const DEFAULT_WORKSPACE_COLOR: WorkspaceColorId = "forest";

/** Role desk colors — vendor green, asset owner blue, etc. */
export const ROLE_WORKSPACE_COLOR: Record<CropfortRole, WorkspaceColorId> = {
  bagro_office: "upwork", // vendor — green
  farm_owner: "navy", // asset owner / Silva — blue
  field_supervisor: "teal", // site
  spx_validator: "forest", // SPX
  spx_platform_admin: "slate", // platform admin
};

export function workspaceColorForRole(role: CropfortRole): WorkspaceColorId {
  return ROLE_WORKSPACE_COLOR[role] ?? DEFAULT_WORKSPACE_COLOR;
}

export function getWorkspaceColor(id: WorkspaceColorId | string | undefined): WorkspaceColorDef {
  return WORKSPACE_COLORS.find((c) => c.id === id) ?? WORKSPACE_COLORS[0];
}

const TOKEN_MAP: Record<keyof Omit<WorkspaceColorTokens, "swatch">, string> = {
  background: "--background",
  sidebarBackground: "--sidebar-background",
  muted: "--muted",
  secondary: "--secondary",
  border: "--border",
  input: "--input",
  mutedForeground: "--muted-foreground",
  primary: "--primary",
  primaryHover: "--primary-hover",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  ring: "--ring",
  sidebarPrimary: "--sidebar-primary",
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarBorder: "--sidebar-border",
  surfaceOverlay: "--surface-overlay",
};

/** Apply workspace theme CSS variables onto the document root. */
export function applyWorkspaceColor(id: WorkspaceColorId, dark: boolean) {
  if (typeof document === "undefined") return;
  const def = getWorkspaceColor(id);
  const tokens = dark ? def.dark : def.light;
  const root = document.documentElement;
  root.setAttribute("data-workspace-color", def.id);
  (Object.keys(TOKEN_MAP) as Array<keyof typeof TOKEN_MAP>).forEach((key) => {
    root.style.setProperty(TOKEN_MAP[key], tokens[key]);
  });
  root.style.setProperty("--sidebar-ring", tokens.ring);
}
