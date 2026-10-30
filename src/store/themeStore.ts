import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CropfortRole } from "@/types/cropfort";
import {
  DEFAULT_WORKSPACE_COLOR,
  type WorkspaceColorId,
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
  patch: Partial<Pick<UserThemePrefs, "workspaceFont" | "roleSeed">>,
) {
  const s = get();
  const userId = s.activeUserId;
  const nextFont = patch.workspaceFont ?? s.workspaceFont;
  const nextSeed = patch.roleSeed !== undefined ? patch.roleSeed : s.byUser[userId ?? ""]?.roleSeed;
  if (!userId) {
    set({ workspaceFont: nextFont });
    return;
  }
  set({
    workspaceFont: nextFont,
    byUser: {
      ...s.byUser,
      [userId]: {
        dark: false,
        workspaceColor: DEFAULT_WORKSPACE_COLOR,
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

        const color = roleColor;
        // Old defaults ("plus-jakarta", then "inter") were never picked on purpose, so they move to the new default
        const font =
          (existing.workspaceFont as string) === "plus-jakarta" || existing.workspaceFont === "inter"
            ? DEFAULT_WORKSPACE_FONT
            : resolveWorkspaceFontId(existing.workspaceFont);

        set({
          activeUserId: user.id,
          dark: false,
          workspaceColor: color,
          workspaceFont: font,
          byUser: {
            ...get().byUser,
            [user.id]: {
              dark: false,
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
            dark: false,
            workspaceColor: DEFAULT_WORKSPACE_COLOR,
            workspaceFont: DEFAULT_WORKSPACE_FONT,
            activeUserId: null,
            byUser: {},
          };
        }
        const byUser: ThemeStore["byUser"] = {};
        if (p.byUser) {
          for (const [id, prefs] of Object.entries(p.byUser)) {
            byUser[id] = {
              dark: false,
              workspaceColor: DEFAULT_WORKSPACE_COLOR,
              workspaceFont: resolveWorkspaceFontId(prefs.workspaceFont),
              roleSeed: prefs.roleSeed,
            };
          }
        }
        return {
          dark: false,
          workspaceColor: DEFAULT_WORKSPACE_COLOR,
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
