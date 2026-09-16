"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { MainNav, MobileNavTrigger } from "@/components/navigation/main-nav";
import { CropfortMobileNav } from "@/components/navigation/mobile-nav";
import { CropfortAuthProvider, useCropfortAuth } from "@/components/navigation/auth-context";
import { WorkspaceChip } from "@/components/navigation/workspace-switcher";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const UserMenu = dynamic(
  () => import("@/components/navigation/user-menu").then((m) => m.UserMenu),
  { ssr: false, loading: () => <div className="h-8 w-8 rounded-full bg-muted" aria-hidden /> }
);
const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), {
  ssr: false,
  loading: () => <div className="hidden h-9 w-9 sm:block" aria-hidden />,
});

function CropfortShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sessionWarning, minutesRemaining, extendSession } = useCropfortAuth();

  return (
    <div className="flex min-h-[100dvh] items-stretch overflow-x-hidden bg-background text-foreground">
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      <MainNav mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_1px_2px_rgba(15,23,20,0.06),0_4px_16px_-6px_rgba(15,23,20,0.12)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            <MobileNavTrigger open={mobileOpen} onOpenChange={setMobileOpen} />

            <WorkspaceChip />

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
              <NotificationBell />
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
              <UserMenu />
            </div>
          </div>

          {sessionWarning ? (
            <div
              role="status"
              aria-live="assertive"
              className="flex flex-col gap-2 border-t border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <span className="flex items-center gap-2">
                <Badge variant="warning">Session</Badge>
                Expires in {minutesRemaining} min
              </span>
              <Button size="sm" variant="outline" className="h-9 w-full sm:h-7 sm:w-auto" onClick={extendSession}>
                Stay signed in
              </Button>
            </div>
          ) : null}
        </header>

        <main
          id="cropfort-main"
          className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      <CropfortMobileNav />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}

export default function CropfortLayout({ children }: { children: ReactNode }) {
  return (
    <CropfortAuthProvider>
      <CropfortShell>{children}</CropfortShell>
    </CropfortAuthProvider>
  );
}
