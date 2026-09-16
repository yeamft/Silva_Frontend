"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import * as authApi from "@/lib/api/auth";
import { mapToCropfortRole } from "@/lib/api/role-map";
import type { AuthProgram, AuthTenant, MeResponse } from "@/lib/api/types";
import { readTokens } from "@/lib/api/token-storage";
import { useAuthStore } from "@/store/authStore";
import {
  CROPFORT_ROLE_LABELS,
  type CropfortRole,
  type CropfortSession,
  type CropfortUser,
  type SyncStatus,
} from "@/types/cropfort";

const WARNING_BEFORE_MS = 5 * 60 * 1000;

interface CropfortAuthContextValue {
  user: CropfortUser;
  tenant: AuthTenant | null;
  activeProgram: MeResponse["activeProgram"];
  programs: AuthProgram[];
  sessions: CropfortSession[];
  expiresAt: number;
  sessionWarning: boolean;
  minutesRemaining: number;
  isOnline: boolean;
  queuedItems: number;
  syncStatus: SyncStatus;
  switchProgram: (programId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  setDemoRole: (role: CropfortRole) => void;
  extendSession: () => void;
  simulateSessionWarning: () => void;
  logout: () => void;
  revokeSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  setQueuedItems: (count: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

const CropfortAuthContext = createContext<CropfortAuthContextValue | null>(null);

export function CropfortAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const me = useAuthStore((s) => s.me);
  const storeLogout = useAuthStore((s) => s.logout);
  const storeSwitchProgram = useAuthStore((s) => s.switchProgram);

  const [expiresAt, setExpiresAt] = useState(() => Date.now() + 60 * 60 * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [queuedItems, setQueuedItems] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [isOnline, setIsOnline] = useState(true);
  const [sessions, setSessions] = useState<CropfortSession[]>([]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    const tokens = readTokens();
    const ttlSec = tokens?.expiresIn || 3600;
    setExpiresAt(Date.now() + ttlSec * 1000);
  }, [authUser?.id, isAuthenticated]);

  // Tick only when the session warning window is approaching — avoids
  // re-rendering the whole Cropfort shell every 15s for the full hour.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();

    const msUntilWarn = Math.max(0, expiresAt - Date.now() - WARNING_BEFORE_MS);
    let intervalId: number | undefined;
    const warnTimer = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 30_000);
    }, msUntilWarn);

    return () => {
      window.clearTimeout(warnTimer);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [expiresAt]);

  useEffect(() => {
    let syncTimer: number | undefined;
    const onOffline = () => {
      setIsOnline(false);
      setSyncStatus("pending");
    };
    const onOnline = () => {
      setIsOnline(true);
      setSyncStatus("syncing");
      syncTimer = window.setTimeout(() => setSyncStatus("synced"), 800);
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) onOffline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (syncTimer) window.clearTimeout(syncTimer);
    };
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const rows = await authApi.listSessions();
      const currentId = readTokens()?.sessionId;
      setSessions(
        rows.map((s) => ({
          id: s.id,
          device: s.deviceLabel || "Unknown device",
          location: s.otpVerified ? "MFA verified" : "Signed in",
          lastActiveAt: s.lastActiveAt || s.createdAt,
          current: s.id === currentId,
        })),
      );
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void refreshSessions();
  }, [isAuthenticated, refreshSessions]);

  const remaining = Math.max(0, expiresAt - now);
  const sessionWarning = remaining > 0 && remaining <= WARNING_BEFORE_MS;
  const minutesRemaining = Math.ceil(remaining / 60_000);

  const extendSession = useCallback(() => {
    setExpiresAt(Date.now() + (readTokens()?.expiresIn || 3600) * 1000);
  }, []);

  const simulateSessionWarning = useCallback(() => {
    setNow(Date.now());
    setExpiresAt(Date.now() + WARNING_BEFORE_MS - 5_000);
  }, []);

  const logout = useCallback(() => {
    void storeLogout().then(() => router.replace("/login"));
  }, [storeLogout, router]);

  const switchProgram = useCallback(
    (programId: string) => storeSwitchProgram(programId),
    [storeSwitchProgram],
  );

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await authApi.revokeSession(sessionId);
      await refreshSessions();
    },
    [refreshSessions],
  );

  const setDemoRole = useCallback((_role: CropfortRole) => {
    // Demo role switching disabled — JWT roles come from the backend.
  }, []);

  const cropfortUser: CropfortUser | null = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: mapToCropfortRole(authUser.backendRole || authUser.role),
        tenantId: me?.tenant.id || authUser.organizationId || "",
        tenantName: me?.tenant.displayName || me?.tenant.name || "Organization",
      }
    : null;

  const value = useMemo<CropfortAuthContextValue | null>(() => {
    if (!cropfortUser) return null;
    return {
      user: cropfortUser,
      tenant: me?.tenant ?? null,
      activeProgram: me?.activeProgram ?? null,
      programs: me?.programs ?? [],
      sessions,
      expiresAt,
      sessionWarning,
      minutesRemaining,
      isOnline,
      queuedItems,
      syncStatus,
      switchProgram,
      setDemoRole,
      extendSession,
      simulateSessionWarning,
      logout,
      revokeSession,
      refreshSessions,
      setQueuedItems,
      setSyncStatus,
    };
  }, [
    cropfortUser,
    me?.tenant,
    me?.activeProgram,
    me?.programs,
    sessions,
    expiresAt,
    sessionWarning,
    minutesRemaining,
    isOnline,
    queuedItems,
    syncStatus,
    switchProgram,
    setDemoRole,
    extendSession,
    simulateSessionWarning,
    logout,
    revokeSession,
    refreshSessions,
  ]);

  if (!isHydrated || !isAuthenticated || !value) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading session" />
      </div>
    );
  }

  return <CropfortAuthContext.Provider value={value}>{children}</CropfortAuthContext.Provider>;
}

export function useCropfortAuth() {
  const ctx = useContext(CropfortAuthContext);
  if (!ctx) {
    throw new Error("useCropfortAuth must be used within CropfortAuthProvider");
  }
  return ctx;
}

export { CROPFORT_ROLE_LABELS };
