"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { MainNav } from "@/components/navigation/main-nav";
import { CropfortMobileNav } from "@/components/navigation/mobile-nav";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { ActivePlanSync } from "@/components/navigation/active-plan-sync";
import { ActiveSpendBandSync } from "@/components/navigation/active-spend-band-sync";
import { ActiveAgreementConfigSync } from "@/components/navigation/active-agreement-config-sync";
import { GlobalContextBar } from "@/components/navigation/global-context-bar";
import { WorkspaceNav } from "@/components/navigation/workspace-nav";
import { CommandPalette } from "@/components/navigation/command-palette";
import {
  NeedsAttentionDrawer,
  useAttentionCount,
} from "@/components/navigation/needs-attention";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const SIDEBAR_COLLAPSE_KEY = "cropfort.sidebar.collapsed";

/** Current dense OpsDesk chrome — SPX / platform admin only. */
export function SpxPlatformShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const attentionCount = useAttentionCount();
  const { sessionWarning, minutesRemaining, extendSession } = useCropfortAuth();

  useEffect(() => {
    try {
      setSidebarOpen(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) !== "1");
      if (localStorage.getItem("cropfort.ui.density") === "compact") {
        document.documentElement.classList.add("cf-density-compact");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarOpen(open);
        try {
          localStorage.setItem(SIDEBAR_COLLAPSE_KEY, open ? "0" : "1");
        } catch {
          /* keep the current session usable when storage is unavailable */
        }
      }}
      style={
        {
          "--sidebar-width": "14.5rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
      className="min-h-[100dvh] items-stretch overflow-x-hidden bg-background text-foreground"
    >
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      <MainNav />

      <SidebarInset
        id="cropfort-main"
        tabIndex={-1}
        className="min-w-0 overflow-x-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        <header className="sticky top-0 z-30 bg-background supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <Card className="rounded-none border-x-0 border-t-0 bg-card shadow-sm">
            <CardContent className="flex h-14 items-center gap-3 px-3 py-0 sm:px-5">
              <SidebarTrigger
                className="shrink-0 border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Toggle navigation"
              />
              <Separator orientation="vertical" className="h-6 shrink-0" />
              <div className="ml-auto min-w-0 shrink-0">
                <GlobalContextBar
                  onOpenSearch={() => setSearchOpen(true)}
                  onOpenAttention={() => setAttentionOpen(true)}
                  attentionCount={attentionCount}
                  className="w-auto px-0 shadow-none sm:px-0 md:px-0"
                />
              </div>
            </CardContent>
          </Card>

          {sessionWarning ? (
            <div
              role="status"
              aria-live="assertive"
              className="flex flex-col gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <span className="flex items-center gap-2">
                <Badge variant="warning">Session</Badge>
                Expires in {minutesRemaining} min
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-full sm:h-7 sm:w-auto"
                onClick={extendSession}
              >
                Stay signed in
              </Button>
            </div>
          ) : null}

          <WorkspaceNav />
        </header>

        {children}
      </SidebarInset>

      <ActivePlanSync />
      <ActiveSpendBandSync />
      <ActiveAgreementConfigSync />
      <CropfortMobileNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NeedsAttentionDrawer open={attentionOpen} onOpenChange={setAttentionOpen} />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </SidebarProvider>
  );
}
