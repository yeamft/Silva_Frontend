import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isSupabaseConfigured } from "@/lib/supabase";
import { authenticateWithPin, callAdminUsersFunction, fetchProfiles } from "@/services/supabaseUserAdmin";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import type { MeResponse } from "@/lib/api/types";
import { userFromMe } from "@/lib/api/role-map";
import { clearTokens, readTokens } from "@/lib/api/token-storage";
import type { FieldUserRole } from "@/types/fieldOs";
import { LEGACY_ROLE_MAP } from "@/lib/rbac";

export type UserRole = FieldUserRole;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  branchId?: string;
  backendRole?: string;
  organizationType?: string | null;
  activeProgramId?: string | null;
}

export type LoginOutcome =
  | { ok: true }
  | {
      ok: false;
      error: string;
      requiresOtp?: boolean;
      otpChallengeToken?: string;
      requiresTotpEnrollment?: boolean;
      enrollmentToken?: string;
      qrDataUrl?: string;
    };

type UserEntry = { password: string; user: User };
type UsersData = Record<string, UserEntry>;

function normalizeRole(role: string): UserRole {
  if (role in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[role];
  if (role.startsWith("vendor_")) return "vendor_lead";
  if (role.startsWith("silva_")) return "silva_owner";
  return "spx_principal";
}

export const DEFAULT_USERS_DATA: UsersData = {
  "owner@silva.example": {
    password: "Password123!",
    user: {
      id: "u-silva",
      email: "owner@silva.example",
      name: "Silva Owner",
      role: "silva_owner",
      organizationId: "org-silva",
      branchId: "prog-shecha",
    },
  },
  "principal@spx.example": {
    password: "Password123!",
    user: {
      id: "u-spx",
      email: "principal@spx.example",
      name: "SPX Account Manager",
      role: "spx_principal",
      organizationId: "org-spx",
      branchId: "prog-shecha",
    },
  },
  "lead@bagro.example": {
    password: "Password123!",
    user: {
      id: "u-bagro",
      email: "lead@bagro.example",
      name: "B-Agro Lead",
      role: "vendor_lead",
      organizationId: "org-bagro",
      branchId: "prog-shecha",
    },
  },
};

function normalizeKey(email: string) {
  return email.toLowerCase().trim();
}

const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

export const MIN_PASSWORD_LENGTH = 8;
const isValidPassword = (password: string) =>
  typeof password === "string" && password.trim().length >= MIN_PASSWORD_LENGTH;

const generateLocalUniquePin = (data: UsersData): string => {
  for (let i = 0; i < 50; i++) {
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const pinInUse = Object.values(data).some((e) => e.password === pin);
    if (!pinInUse) return pin;
  }
  throw new Error("Failed to generate unique PIN");
};

interface AuthStore {
  user: User | null;
  me: MeResponse | null;
  permissions: string[];
  isAuthenticated: boolean;
  isHydrated: boolean;
  sessionPin: string | null;
  usersData: UsersData;
  initAuth: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeOtp: (otpChallengeToken: string, code: string) => Promise<LoginOutcome>;
  completeTotpEnrollment: (enrollmentToken: string, code: string) => Promise<LoginOutcome>;
  applyMe: (me: MeResponse) => void;
  switchProgram: (programId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  getUsers: () => User[];
  createUser: (
    email: string,
    pin: string,
    name: string,
    role: UserRole,
  ) => Promise<{ success: boolean; error?: string; generatedPin?: string }>;
  updateUser: (
    id: string,
    updates: Partial<Pick<User, "name" | "email" | "role">>,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  setPassword: (id: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const mergeUsersData = (persisted: unknown): UsersData => {
  if (!persisted || typeof persisted !== "object") return DEFAULT_USERS_DATA;
  const p = persisted as Record<string, UserEntry>;
  const merged: UsersData = { ...DEFAULT_USERS_DATA };
  Object.entries(p).forEach(([key, entry]) => {
    if (!entry?.user) return;
    merged[key] = {
      ...entry,
      user: {
        ...entry.user,
        role: normalizeRole(entry.user.role as string),
        organizationId: entry.user.organizationId ?? "org-1",
        branchId: entry.user.branchId ?? "br-1",
      },
    };
  });
  return merged;
};

function applySession(set: (partial: Partial<AuthStore>) => void, me: MeResponse) {
  set({
    user: userFromMe(me),
    me,
    permissions: me.permissions || [],
    isAuthenticated: true,
    sessionPin: null,
  });
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      me: null,
      permissions: [],
      isAuthenticated: false,
      isHydrated: false,
      sessionPin: null,
      usersData: DEFAULT_USERS_DATA,

      applyMe: (me) => applySession(set, me),

      switchProgram: async (programId) => {
        try {
          const data = await authApi.switchProgram(programId);
          if (data.me) {
            applySession(set, data.me);
            return { ok: true };
          }
          const me = await authApi.fetchMe();
          applySession(set, me);
          return { ok: true };
        } catch (err) {
          if (err instanceof ApiError) return { ok: false, error: err.message };
          return { ok: false, error: "Unable to switch workspace." };
        }
      },

      initAuth: async () => {
        const tokens = readTokens();
        if (!tokens?.accessToken) {
          set({
            user: null,
            me: null,
            permissions: [],
            isAuthenticated: false,
            isHydrated: true,
            sessionPin: null,
          });
          return;
        }

        try {
          const me = await authApi.fetchMe();
          applySession(set, me);
        } catch {
          clearTokens();
          set({
            user: null,
            me: null,
            permissions: [],
            isAuthenticated: false,
            sessionPin: null,
          });
        } finally {
          set({ isHydrated: true });
        }

        if (isSupabaseConfigured) {
          await get().refreshUsers();
        }
      },

      refreshUsers: async () => {
        if (!isSupabaseConfigured) return;
        try {
          const users = await fetchProfiles();
          const mapped: UsersData = {};
          users.forEach((u) => {
            mapped[normalizeKey(u.email)] = {
              password: "",
              user: u,
            };
          });
          const currentUser = get().user;
          const updatedCurrent = currentUser
            ? users.find((u) => u.id === currentUser.id) ?? currentUser
            : null;
          set({
            usersData: mapped,
            user: updatedCurrent,
            isAuthenticated: updatedCurrent ? true : get().isAuthenticated,
          });
        } catch {
          // keep current state if fetch fails
        }
      },

      login: async (email, password) => {
        if (!isValidPassword(password)) {
          return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
        }

        try {
          const data = await authApi.login(normalizeKey(email), password);

          if ("requiresOtp" in data && data.requiresOtp) {
            return {
              ok: false,
              error: "Enter your authenticator code to continue.",
              requiresOtp: true,
              otpChallengeToken: data.otpChallengeToken,
            };
          }

          if ("requiresTotpEnrollment" in data && data.requiresTotpEnrollment) {
            return {
              ok: false,
              error: "Scan the QR code and enter a verification code to finish setup.",
              requiresTotpEnrollment: true,
              enrollmentToken: data.enrollmentToken,
              qrDataUrl: data.qrDataUrl,
            };
          }

          if ("me" in data && data.me) {
            applySession(set, data.me);
            return { ok: true };
          }

          if ("accessToken" in data) {
            const me = await authApi.fetchMe();
            applySession(set, me);
            return { ok: true };
          }

          return { ok: false, error: "Unexpected login response." };
        } catch (err) {
          if (err instanceof ApiError) {
            return { ok: false, error: err.message };
          }
          return { ok: false, error: "Unable to reach the auth server." };
        }
      },

      completeOtp: async (otpChallengeToken, code) => {
        try {
          const data = await authApi.verifyOtp(otpChallengeToken, code, "Web");
          if (data.me) {
            applySession(set, data.me);
            return { ok: true };
          }
          const me = await authApi.fetchMe();
          applySession(set, me);
          return { ok: true };
        } catch (err) {
          if (err instanceof ApiError) return { ok: false, error: err.message };
          return { ok: false, error: "OTP verification failed." };
        }
      },

      completeTotpEnrollment: async (enrollmentToken, code) => {
        try {
          const data = await authApi.enrollTotp(enrollmentToken, code);
          if (data.me) {
            applySession(set, data.me);
            return { ok: true };
          }
          const me = await authApi.fetchMe();
          applySession(set, me);
          return { ok: true };
        } catch (err) {
          if (err instanceof ApiError) return { ok: false, error: err.message };
          return { ok: false, error: "TOTP enrollment failed." };
        }
      },

      register: async () => false,

      logout: async () => {
        const tokens = readTokens();
        await authApi.logout(tokens?.refreshToken);
        set({
          user: null,
          me: null,
          permissions: [],
          isAuthenticated: false,
          sessionPin: null,
        });
      },

      getUsers: () => Object.values(get().usersData).map((e) => e.user),

      createUser: async (email, pin, name, role) => {
        if (isSupabaseConfigured) {
          try {
            let actorId = get().user?.id;
            const actorPin = get().sessionPin;
            if (!actorId && actorPin) {
              const actor = await authenticateWithPin(actorPin);
              actorId = actor?.id;
              if (actor) set({ user: actor, isAuthenticated: true });
            }
            if (!actorId) return { success: false, error: "Admin session expired. Please login again." };
            const res = await callAdminUsersFunction({
              action: "create",
              email: normalizeKey(email),
              name: name.trim(),
              role,
              actorId,
              actorPin,
            });
            await get().refreshUsers();
            return { success: true, generatedPin: res.generatedPin };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to create user" };
          }
        }

        const key = normalizeKey(email);
        const data = get().usersData;
        if (data[key]) return { success: false, error: "Email already registered" };
        const generatedPin = isValidPassword(pin) ? pin : generateLocalUniquePin(data);
        const pinInUse = Object.values(data).some((e) => e.password === generatedPin);
        if (pinInUse) return { success: false, error: "Password already in use" };
        const user: User = { id: `u-${Date.now()}`, email: key, name: name.trim(), role };
        set({ usersData: { ...data, [key]: { password: generatedPin, user } } });
        return { success: true, generatedPin };
      },

      updateUser: async (id, updates) => {
        if (isSupabaseConfigured) {
          try {
            let actorId = get().user?.id;
            const actorPin = get().sessionPin;
            if (!actorId && actorPin) {
              const actor = await authenticateWithPin(actorPin);
              actorId = actor?.id;
              if (actor) set({ user: actor, isAuthenticated: true });
            }
            if (!actorId) return { success: false, error: "Admin session expired. Please login again." };
            await callAdminUsersFunction({
              action: "update",
              userId: id,
              name: updates.name,
              email: updates.email ? normalizeKey(updates.email) : undefined,
              role: updates.role,
              actorId,
              actorPin,
            });
            await get().refreshUsers();
            const currentUser = get().user;
            if (currentUser?.id === id) {
              set({
                user: {
                  ...currentUser,
                  ...updates,
                  email: updates.email ? normalizeKey(updates.email) : currentUser.email,
                },
              });
            }
            return { success: true };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to update user" };
          }
        }

        const data = get().usersData;
        const currentUser = get().user;
        const entry = Object.entries(data).find(([, e]) => e.user.id === id);
        if (!entry) return { success: false, error: "User not found" };
        const [oldKey, { password, user }] = entry;
        const newEmail = updates.email ? normalizeKey(updates.email) : user.email;
        if (updates.email && newEmail !== oldKey && data[newEmail]) {
          return { success: false, error: "Email already in use" };
        }
        const updatedUser: User = { ...user, ...updates, email: newEmail };
        const newData = { ...data };
        delete newData[oldKey];
        newData[newEmail] = { password, user: updatedUser };
        set({
          usersData: newData,
          user: currentUser?.id === id ? updatedUser : currentUser,
        });
        return { success: true };
      },

      deleteUser: async (id) => {
        const currentUser = get().user;
        if (currentUser?.id === id) return { success: false, error: "Cannot delete your own account" };

        if (isSupabaseConfigured) {
          try {
            let actorId = get().user?.id;
            const actorPin = get().sessionPin;
            if (!actorId && actorPin) {
              const actor = await authenticateWithPin(actorPin);
              actorId = actor?.id;
              if (actor) set({ user: actor, isAuthenticated: true });
            }
            if (!actorId) return { success: false, error: "Admin session expired. Please login again." };
            await callAdminUsersFunction({ action: "delete", userId: id, actorId, actorPin });
            await get().refreshUsers();
            return { success: true };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to delete user" };
          }
        }

        const data = get().usersData;
        const entry = Object.entries(data).find(([, e]) => e.user.id === id);
        if (!entry) return { success: false, error: "User not found" };
        const [key] = entry;
        const newData = { ...data };
        delete newData[key];
        set({ usersData: newData });
        return { success: true };
      },

      setPassword: async (id, newPassword) => {
        if (isSupabaseConfigured) {
          if (!isValidPin(newPassword)) {
            return { success: false, error: "PIN must be exactly 4 digits" };
          }
          try {
            let actorId = get().user?.id;
            const actorPin = get().sessionPin;
            if (!actorId && actorPin) {
              const actor = await authenticateWithPin(actorPin);
              actorId = actor?.id;
              if (actor) set({ user: actor, isAuthenticated: true });
            }
            if (!actorId) return { success: false, error: "Admin session expired. Please login again." };
            await callAdminUsersFunction({
              action: "set_pin",
              userId: id,
              pin: newPassword,
              actorId,
              actorPin,
            });
            return { success: true };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to set PIN" };
          }
        }

        if (!isValidPassword(newPassword)) {
          return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
        }
        const data = get().usersData;
        const pinInUse = Object.values(data).some((e) => e.user.id !== id && e.password === newPassword);
        if (pinInUse) return { success: false, error: "Password already in use" };
        const entry = Object.entries(data).find(([, e]) => e.user.id === id);
        if (!entry) return { success: false, error: "User not found" };
        const [key, { user }] = entry;
        set({ usersData: { ...data, [key]: { password: newPassword, user } } });
        return { success: true };
      },
    }),
    {
      name: "cropfort-auth",
      partialize: (s) => ({ usersData: s.usersData }),
      merge: (persisted, current) => {
        const p = persisted as { usersData?: UsersData } | undefined;
        return {
          ...current,
          user: null,
          me: null,
          permissions: [],
          isAuthenticated: false,
          isHydrated: false,
          sessionPin: null,
          usersData: mergeUsersData(p?.usersData ?? DEFAULT_USERS_DATA),
        };
      },
    },
  ),
);
