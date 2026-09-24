"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_USERS_DATA, useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import {
  applyWorkspaceColor,
  DEFAULT_WORKSPACE_COLOR,
  type WorkspaceColorId,
} from "@/lib/workspace-themes";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

const LOCAL_RESET_VERSION_KEY = "coffee-field-os-reset-v1";

/** Marketing / auth surfaces stay on fixed Green (upwork) light, ignoring dashboard theme. */
function isPublicThemeLockedPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/invite" || pathname.startsWith("/invite/")) return true;
  return false;
}

const PUBLIC_THEME_COLOR: WorkspaceColorId = "upwork";

function applyDocumentTheme(isDark: boolean, color: WorkspaceColorId) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  applyWorkspaceColor(color, isDark);
}

const ThemeApplier = () => {
  const pathname = usePathname();
  const dark = useThemeStore((s) => s.dark);
  const workspaceColor = useThemeStore((s) => s.workspaceColor);
  const syncForUser = useThemeStore((s) => s.syncForUser);
  const clearActiveUser = useThemeStore((s) => s.clearActiveUser);
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const locked = isPublicThemeLockedPath(pathname);

  useEffect(() => {
    if (isAuthenticated && authUser) {
      syncForUser(authUser);
    } else if (!isAuthenticated) {
      clearActiveUser();
    }
  }, [isAuthenticated, authUser?.id, authUser?.role, authUser?.backendRole, syncForUser, clearActiveUser]);

  useEffect(() => {
    const apply = () => {
      if (isPublicThemeLockedPath(pathname)) {
        applyDocumentTheme(false, PUBLIC_THEME_COLOR);
        return;
      }
      const s = useThemeStore.getState();
      applyDocumentTheme(
        Boolean(s.dark),
        s.workspaceColor ?? DEFAULT_WORKSPACE_COLOR,
      );
    };

    apply();

    const unsub = useThemeStore.persist.onFinishHydration(() => {
      apply();
    });
    if (useThemeStore.persist.hasHydrated()) {
      apply();
    }

    return unsub;
  }, [dark, workspaceColor, pathname, locked, authUser?.id]);

  return null;
};

const StorageResetBootstrap = () => {
  useEffect(() => {
    if (localStorage.getItem(LOCAL_RESET_VERSION_KEY) === "done") return;

    const keysToRemove = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("hestia-") ||
        k.startsWith("bunalink-") ||
        (k.startsWith("cropfort-") && k !== "cropfort-auth") ||
        k.includes("pharmacy"),
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    useAuthStore.setState({
      user: null,
      me: null,
      permissions: [],
      isAuthenticated: false,
      usersData: DEFAULT_USERS_DATA,
    });

    try {
      indexedDB.deleteDatabase("hestialink-cache");
    } catch {
      // ignore
    }

    localStorage.setItem(LOCAL_RESET_VERSION_KEY, "done");
  }, []);
  return null;
};

const AuthBootstrap = () => {
  const initAuth = useAuthStore((s) => s.initAuth);
  useEffect(() => {
    void initAuth();
  }, [initAuth]);
  return null;
};

function scheduleIdle(fn: () => void) {
  if (typeof window === "undefined") return () => undefined;
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(fn, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const t = globalThis.setTimeout(fn, 1);
  return () => globalThis.clearTimeout(t);
}

const DeferredBootstraps = () => {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_BOOTSTRAPS !== "true") {
      return;
    }
    return scheduleIdle(() => {
      void import("./deferred-bootstraps").then((m) => m.runDeferredBootstraps());
    });
  }, []);
  return null;
};

const Sonner = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <StorageResetBootstrap />
        <ThemeApplier />
        <AuthBootstrap />
        <DeferredBootstraps />
        {children}
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
