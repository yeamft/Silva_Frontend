/**
 * Workspace color palettes — curated CropFort themes.
 * Soft background = page canvas; primary = actions / accents.
 */

import type { CropfortRole } from "@/types/cropfort";

export type WorkspaceColorId =
  | "forest"
  | "emerald"
  | "light-green"
  | "blue"
  | "indigo"
  | "teal"
  | "earth";

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
  primaryHex: string;
  softBgHex: string;
  light: WorkspaceColorTokens;
  dark: WorkspaceColorTokens;
};

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const raw = hex.replace("#", "");
  const n = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hsl(h: number, s: number, l: number) {
  return `${Math.round(h)} ${Math.max(0, Math.min(100, Math.round(s)))}% ${Math.max(0, Math.min(100, Math.round(l)))}%`;
}

function buildLightTokens(primaryHex: string, softBgHex: string): WorkspaceColorTokens {
  const p = hexToHsl(primaryHex);
  const soft = hexToHsl(softBgHex);
  const softBg = hsl(soft.h, soft.s, soft.l);
  return {
    background: softBg,
    sidebarBackground: hsl(soft.h, Math.max(soft.s - 4, 8), Math.min(soft.l + 1, 99)),
    muted: hsl(soft.h, Math.max(soft.s - 6, 6), Math.max(soft.l - 3, 90)),
    secondary: hsl(soft.h, Math.max(soft.s - 4, 8), Math.max(soft.l - 4, 90)),
    border: hsl(p.h, Math.min(p.s, 14), 88),
    input: hsl(p.h, Math.min(p.s, 14), 86),
    mutedForeground: hsl(p.h, Math.min(p.s, 12), 40),
    primary: hsl(p.h, p.s, p.l),
    primaryHover: hsl(p.h, Math.min(100, p.s + 4), Math.max(14, p.l - 8)),
    accent: softBg,
    accentForeground: hsl(p.h, Math.min(p.s, 55), Math.max(16, Math.min(p.l, 28))),
    ring: hsl(p.h, p.s, p.l),
    sidebarPrimary: hsl(p.h, p.s, p.l),
    sidebarAccent: hsl(soft.h, Math.max(soft.s - 2, 10), Math.max(soft.l - 2, 92)),
    sidebarAccentForeground: hsl(p.h, Math.min(p.s, 55), Math.max(16, Math.min(p.l, 28))),
    sidebarBorder: hsl(p.h, Math.min(p.s, 12), 88),
    surfaceOverlay: hsl(soft.h, Math.max(soft.s - 4, 8), Math.max(soft.l - 2, 92)),
    swatch: primaryHex.toUpperCase(),
  };
}

function buildDarkTokens(primaryHex: string): WorkspaceColorTokens {
  const { h, s, l } = hexToHsl(primaryHex);
  const darkPrimaryL = Math.min(62, Math.max(42, l + (l < 40 ? 18 : 8)));
  const darkPrimaryS = Math.min(85, Math.max(s, 35));
  return {
    background: hsl(h, Math.min(s, 14), 9),
    sidebarBackground: hsl(h, Math.min(s, 14), 10),
    muted: hsl(h, Math.min(s, 10), 14),
    secondary: hsl(h, Math.min(s, 10), 15),
    border: hsl(h, Math.min(s, 10), 18),
    input: hsl(h, Math.min(s, 10), 18),
    mutedForeground: hsl(h, Math.min(s, 12), 62),
    primary: hsl(h, darkPrimaryS, darkPrimaryL),
    primaryHover: hsl(h, darkPrimaryS, Math.max(30, darkPrimaryL - 8)),
    accent: hsl(h, Math.min(s, 22), 16),
    accentForeground: hsl(h, Math.min(s, 40), 82),
    ring: hsl(h, darkPrimaryS, Math.min(70, darkPrimaryL + 4)),
    sidebarPrimary: hsl(h, darkPrimaryS, darkPrimaryL),
    sidebarAccent: hsl(h, Math.min(s, 18), 15),
    sidebarAccentForeground: hsl(h, Math.min(s, 40), 85),
    sidebarBorder: hsl(h, Math.min(s, 10), 16),
    surfaceOverlay: hsl(h, Math.min(s, 12), 10),
    swatch: primaryHex.toUpperCase(),
  };
}

function defineTheme(
  id: WorkspaceColorId,
  label: string,
  description: string,
  primaryHex: string,
  softBgHex: string,
): WorkspaceColorDef {
  return {
    id,
    label,
    description,
    primaryHex: primaryHex.toUpperCase(),
    softBgHex: softBgHex.toUpperCase(),
    light: buildLightTokens(primaryHex, softBgHex),
    dark: buildDarkTokens(primaryHex),
  };
}

/** Curated themes for the appearance toggler. */
export const WORKSPACE_COLORS: WorkspaceColorDef[] = [
  defineTheme("forest", "Forest", "Agricultural / Cropfort", "#16803A", "#EDF7F0"),
  defineTheme("emerald", "Emerald", "Modern", "#059669", "#ECFDF5"),
  defineTheme("light-green", "Light Green", "Bright mint + Upwork-style green", "#14A800", "#F3FBF3"),
  defineTheme("blue", "Blue", "Enterprise", "#2563EB", "#EFF6FF"),
  defineTheme("indigo", "Indigo", "Technical", "#4F46E5", "#EEF2FF"),
  defineTheme("teal", "Teal", "Operational", "#0F766E", "#F0FDFA"),
  defineTheme("earth", "Earth", "Agricultural", "#9A6A35", "#FAF5EE"),
];

export const DEFAULT_WORKSPACE_COLOR: WorkspaceColorId = "forest";

/** Map legacy persisted ids → current palette. */
const LEGACY_COLOR_MAP: Record<string, WorkspaceColorId> = {
  "deep-emerald": "emerald",
  olive: "forest",
  upwork: "light-green",
  mint: "light-green",
  "royal-blue": "blue",
  "deep-navy": "blue",
  "sky-blue": "blue",
  "deep-purple": "indigo",
  "rich-gold": "earth",
  "dark-gold": "earth",
  coffee: "earth",
  gold: "earth",
  amber: "earth",
  orange: "earth",
  crimson: "earth",
  charcoal: "indigo",
  slate: "indigo",
  "cool-gray": "indigo",
};

/** Role desk colors. */
export const ROLE_WORKSPACE_COLOR: Record<CropfortRole, WorkspaceColorId> = {
  bagro_office: "light-green",
  farm_owner: "blue",
  field_supervisor: "teal",
  spx_validator: "forest",
  spx_platform_admin: "indigo",
};

export function workspaceColorForRole(role: CropfortRole): WorkspaceColorId {
  return ROLE_WORKSPACE_COLOR[role] ?? DEFAULT_WORKSPACE_COLOR;
}

export function resolveWorkspaceColorId(
  id: WorkspaceColorId | string | undefined | null,
): WorkspaceColorId {
  if (!id) return DEFAULT_WORKSPACE_COLOR;
  if (WORKSPACE_COLORS.some((c) => c.id === id)) return id as WorkspaceColorId;
  return LEGACY_COLOR_MAP[id] ?? DEFAULT_WORKSPACE_COLOR;
}

export function getWorkspaceColor(id: WorkspaceColorId | string | undefined): WorkspaceColorDef {
  const resolved = resolveWorkspaceColorId(id);
  return WORKSPACE_COLORS.find((c) => c.id === resolved) ?? WORKSPACE_COLORS[0];
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
