import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CropfortRole } from "@/types/cropfort";
import {
  DEFAULT_WORKSPACE_COLOR,
  type WorkspaceColorId,
  resolveWorkspaceColorId,
  workspaceColorForRole,
} from "@/lib/workspace-themes";
import {
  DEFAULT_WORKSPACE_FONT,
  type WorkspaceFontId,
  resolveWorkspaceFontId,
} from "@/lib/workspace-fonts";
import { mapToCropfortRole } from "@/lib/api/role-map";

type UserThemePrefs = {
  dark: boolean;
  workspaceColor: WorkspaceColorId;
  workspaceFont: WorkspaceFontId;
  /** Last role used to seed the color — re-seed if role changes. */
  roleSeed?: CropfortRole;
};

interface ThemeStore {
  dark: boolean;
  workspaceColor: WorkspaceColorId;
  workspaceFont: WorkspaceFontId;
  activeUserId: string | null;
  byUser: Record<string, UserThemePrefs>;
  toggle: () => void;
  setDark: (dark: boolean) => void;
  setWorkspaceColor: (color: WorkspaceColorId) => void;
  setWorkspaceFont: (font: WorkspaceFontId) => void;
  /** Bind theme to the logged-in user; keep their color, seed from role when new/changed. */
  syncForUser: (user: {
    id: string;
    role?: string | null;
    backendRole?: string | null;
  } | null) => void;
  clearActiveUser: () => void;
}

function writeActive(
  set: (partial: Partial<ThemeStore> | ((s: ThemeStore) => Partial<ThemeStore>)) => void,
  get: () => ThemeStore,
  patch: Partial<Pick<UserThemePrefs, "dark" | "workspaceColor" | "workspaceFont" | "roleSeed">>,
) {
  const s = get();
  const userId = s.activeUserId;
  const nextDark = patch.dark ?? s.dark;
  const nextColor = patch.workspaceColor ?? s.workspaceColor;
  const nextFont = patch.workspaceFont ?? s.workspaceFont;
  const nextSeed = patch.roleSeed !== undefined ? patch.roleSeed : s.byUser[userId ?? ""]?.roleSeed;
  if (!userId) {
    set({ dark: nextDark, workspaceColor: nextColor, workspaceFont: nextFont });
    return;
  }
  set({
    dark: nextDark,
    workspaceColor: nextColor,
    workspaceFont: nextFont,
    byUser: {
      ...s.byUser,
      [userId]: {
        dark: nextDark,
        workspaceColor: nextColor,
        workspaceFont: nextFont,
        roleSeed: nextSeed,
      },
    },
  });
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      dark: false,
      workspaceColor: DEFAULT_WORKSPACE_COLOR,
      workspaceFont: DEFAULT_WORKSPACE_FONT,
      activeUserId: null,
      byUser: {},

      toggle: () => {
        const next = !get().dark;
        writeActive(set, get, { dark: next });
      },

      setDark: (dark) => writeActive(set, get, { dark }),

      setWorkspaceColor: (workspaceColor) =>
        writeActive(set, get, { workspaceColor: resolveWorkspaceColorId(workspaceColor) }),

      setWorkspaceFont: (workspaceFont) =>
        writeActive(set, get, { workspaceFont: resolveWorkspaceFontId(workspaceFont) }),

      syncForUser: (user) => {
        if (!user?.id) {
          get().clearActiveUser();
          return;
        }
        const role = mapToCropfortRole(user.backendRole || user.role || "");
        const roleColor = workspaceColorForRole(role);
        const existing = get().byUser[user.id];

        if (!existing) {
          set({
            activeUserId: user.id,
            dark: false,
            workspaceColor: roleColor,
            workspaceFont: DEFAULT_WORKSPACE_FONT,
            byUser: {
              ...get().byUser,
              [user.id]: {
                dark: false,
                workspaceColor: roleColor,
                workspaceFont: DEFAULT_WORKSPACE_FONT,
                roleSeed: role,
              },
            },
          });
          return;
        }

        const color = resolveWorkspaceColorId(
          existing.roleSeed && existing.roleSeed !== role
            ? roleColor
            : existing.workspaceColor || roleColor,
        );
        const font = resolveWorkspaceFontId(existing.workspaceFont);

        set({
          activeUserId: user.id,
          dark: existing.dark,
          workspaceColor: color,
          workspaceFont: font,
          byUser: {
            ...get().byUser,
            [user.id]: {
              dark: existing.dark,
              workspaceColor: color,
              workspaceFont: font,
              roleSeed: role,
            },
          },
        });
      },

      clearActiveUser: () =>
        set({
          activeUserId: null,
          workspaceColor: DEFAULT_WORKSPACE_COLOR,
          workspaceFont: DEFAULT_WORKSPACE_FONT,
          dark: false,
        }),
    }),
    {
      name: "spx-farm-os-theme",
      version: 5,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ThemeStore> & {
          dark?: boolean;
          workspaceColor?: WorkspaceColorId | string;
          workspaceFont?: WorkspaceFontId | string;
        };
        if (version < 2) {
          return {
            dark: Boolean(p.dark),
            workspaceColor: resolveWorkspaceColorId(p.workspaceColor),
            workspaceFont: DEFAULT_WORKSPACE_FONT,
            activeUserId: null,
            byUser: {},
          };
        }
        const byUser: ThemeStore["byUser"] = {};
        if (p.byUser) {
          for (const [id, prefs] of Object.entries(p.byUser)) {
            byUser[id] = {
              dark: Boolean(prefs.dark),
              workspaceColor: resolveWorkspaceColorId(prefs.workspaceColor),
              workspaceFont: resolveWorkspaceFontId(prefs.workspaceFont),
              roleSeed: prefs.roleSeed,
            };
          }
        }
        return {
          dark: Boolean(p.dark),
          workspaceColor: resolveWorkspaceColorId(p.workspaceColor),
          workspaceFont: resolveWorkspaceFontId(p.workspaceFont),
          activeUserId: p.activeUserId ?? null,
          byUser,
        };
      },
      partialize: (s) => ({
        dark: s.dark,
        workspaceColor: s.workspaceColor,
        workspaceFont: s.workspaceFont,
        activeUserId: s.activeUserId,
        byUser: s.byUser,
      }),
    },
  ),
);
