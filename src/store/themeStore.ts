import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CropfortRole } from "@/types/cropfort";
import {
  DEFAULT_WORKSPACE_COLOR,
  type WorkspaceColorId,
  workspaceColorForRole,
} from "@/lib/workspace-themes";
import { mapToCropfortRole } from "@/lib/api/role-map";

type UserThemePrefs = {
  dark: boolean;
  workspaceColor: WorkspaceColorId;
  /** Last role used to seed the color — re-seed if role changes. */
  roleSeed?: CropfortRole;
};

interface ThemeStore {
  dark: boolean;
  workspaceColor: WorkspaceColorId;
  activeUserId: string | null;
  byUser: Record<string, UserThemePrefs>;
  toggle: () => void;
  setDark: (dark: boolean) => void;
  setWorkspaceColor: (color: WorkspaceColorId) => void;
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
  patch: Partial<Pick<UserThemePrefs, "dark" | "workspaceColor" | "roleSeed">>,
) {
  const s = get();
  const userId = s.activeUserId;
  const nextDark = patch.dark ?? s.dark;
  const nextColor = patch.workspaceColor ?? s.workspaceColor;
  const nextSeed = patch.roleSeed !== undefined ? patch.roleSeed : s.byUser[userId ?? ""]?.roleSeed;
  if (!userId) {
    set({ dark: nextDark, workspaceColor: nextColor });
    return;
  }
  set({
    dark: nextDark,
    workspaceColor: nextColor,
    byUser: {
      ...s.byUser,
      [userId]: {
        dark: nextDark,
        workspaceColor: nextColor,
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
      activeUserId: null,
      byUser: {},

      toggle: () => {
        const next = !get().dark;
        writeActive(set, get, { dark: next });
      },

      setDark: (dark) => writeActive(set, get, { dark }),

      setWorkspaceColor: (workspaceColor) => writeActive(set, get, { workspaceColor }),

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
            byUser: {
              ...get().byUser,
              [user.id]: { dark: false, workspaceColor: roleColor, roleSeed: role },
            },
          });
          return;
        }

        // Role changed (e.g. different account type) — re-apply desk color.
        const color =
          existing.roleSeed && existing.roleSeed !== role
            ? roleColor
            : existing.workspaceColor || roleColor;

        set({
          activeUserId: user.id,
          dark: existing.dark,
          workspaceColor: color,
          byUser: {
            ...get().byUser,
            [user.id]: {
              dark: existing.dark,
              workspaceColor: color,
              roleSeed: role,
            },
          },
        });
      },

      clearActiveUser: () =>
        set({
          activeUserId: null,
          workspaceColor: DEFAULT_WORKSPACE_COLOR,
          dark: false,
        }),
    }),
    {
      name: "spx-farm-os-theme",
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ThemeStore> & {
          dark?: boolean;
          workspaceColor?: WorkspaceColorId;
        };
        if (version < 2) {
          return {
            dark: Boolean(p.dark),
            workspaceColor: p.workspaceColor ?? DEFAULT_WORKSPACE_COLOR,
            activeUserId: null,
            byUser: {},
          };
        }
        return {
          dark: Boolean(p.dark),
          workspaceColor: p.workspaceColor ?? DEFAULT_WORKSPACE_COLOR,
          activeUserId: p.activeUserId ?? null,
          byUser: p.byUser ?? {},
        };
      },
      partialize: (s) => ({
        dark: s.dark,
        workspaceColor: s.workspaceColor,
        activeUserId: s.activeUserId,
        byUser: s.byUser,
      }),
    },
  ),
);
