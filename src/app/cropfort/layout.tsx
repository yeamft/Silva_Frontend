"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MainNav, MobileNavTrigger } from "@/components/navigation/main-nav";
import { CropfortMobileNav } from "@/components/navigation/mobile-nav";
import { CropfortAuthProvider, useCropfortAuth } from "@/components/navigation/auth-context";
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
import {
  needsWorkspaceSelection,
  SELECT_WORKSPACE_PATH,
} from "@/lib/workspace-gate";

function WorkspaceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeProgram, programs } = useCropfortAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mustPick =
      needsWorkspaceSelection() || (!activeProgram?.id && programs.length > 0);

    if (mustPick) {
      router.replace(SELECT_WORKSPACE_PATH);
      return;
    }
    setReady(true);
  }, [activeProgram?.id, programs.length, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        Opening workspace…
      </div>
    );
  }

  return <>{children}</>;
}

function CropfortShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const attentionCount = useAttentionCount();
  const { sessionWarning, minutesRemaining, extendSession } = useCropfortAuth();

  useEffect(() => {
    try {
      if (localStorage.getItem("cropfort.ui.density") === "compact") {
        document.documentElement.classList.add("cf-density-compact");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex min-h-[100dvh] items-stretch overflow-x-hidden bg-background text-foreground">
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      <MainNav mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-stretch border-b border-border bg-card">
            <div className="flex shrink-0 items-center pl-2 md:hidden">
              <MobileNavTrigger open={mobileOpen} onOpenChange={setMobileOpen} />
            </div>
            <div className="min-w-0 flex-1">
              <GlobalContextBar
                onOpenSearch={() => setSearchOpen(true)}
                onOpenAttention={() => setAttentionOpen(true)}
                attentionCount={attentionCount}
                className="border-b-0"
              />
            </div>
          </div>

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
        </div>

        <main
          id="cropfort-main"
          className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      <ActivePlanSync />
      <ActiveSpendBandSync />
      <ActiveAgreementConfigSync />
      <CropfortMobileNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NeedsAttentionDrawer open={attentionOpen} onOpenChange={setAttentionOpen} />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}

export default function CropfortLayout({ children }: { children: ReactNode }) {
  return (
    <CropfortAuthProvider>
      <WorkspaceGate>
        <CropfortShell>{children}</CropfortShell>
      </WorkspaceGate>
    </CropfortAuthProvider>
  );
}
