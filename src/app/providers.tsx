"use client";

import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_USERS_DATA, useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const LOCAL_RESET_VERSION_KEY = "coffee-field-os-reset-v1";

const ThemeApplier = () => {
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };

    apply(dark);

    // Ensure DOM matches after zustand persist rehydrates
    const unsub = useThemeStore.persist.onFinishHydration((state) => {
      apply(Boolean(state?.dark));
    });
    if (useThemeStore.persist.hasHydrated()) {
      apply(useThemeStore.getState().dark);
    }

    return unsub;
  }, [dark]);

  return null;
};

/** Cheap one-time localStorage wipe — must run before auth init. */
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
  const t = window.setTimeout(fn, 1);
  return () => window.clearTimeout(t);
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
