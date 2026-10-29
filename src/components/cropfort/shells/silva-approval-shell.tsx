"use client";

import Link from "next/link";
import { FarmAreaSelector } from "@/components/cropfort/farm-area-label";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileText,
  Files,
  Home,
  Leaf,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { UserMenu } from "@/components/navigation/user-menu";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { ActivePlanSync } from "@/components/navigation/active-plan-sync";
import { LiveUpdates } from "@/components/navigation/live-updates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useOwnerCounts } from "@/lib/cropfort/use-owner-counts";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  /** Which waiting count to show next to the link. */
  badge?: "approvals" | "assessments";
};

const SILVA_NAV: NavItem[] = [
  {
    href: CROPFORT_ROUTES.dashboard,
    label: "Home",
    icon: Home,
    match: (p) => p === CROPFORT_ROUTES.dashboard || p === "/cropfort",
  },
  {
    href: CROPFORT_ROUTES.approvals,
    label: "Approvals",
    icon: ClipboardCheck,
    match: (p) => p.startsWith(CROPFORT_ROUTES.approvals),
    badge: "approvals",
  },
  {
    href: CROPFORT_ROUTES.farmAssessments,
    label: "Farm assessments",
    icon: Files,
    match: (p) => p.startsWith(CROPFORT_ROUTES.farmAssessments),
    badge: "assessments",
  },
  {
    href: CROPFORT_ROUTES.reports,
    label: "Reports",
    icon: FileText,
    match: (p) => p.startsWith(CROPFORT_ROUTES.reports),
  },
];

const SIDEBAR_COLLAPSE_KEY = "cropfort.owner-sidebar.collapsed";

// Keep assessment notifications available through their direct links on mobile.
function SessionBanner() {
  const { sessionWarning, minutesRemaining, extendSession } = useCropfortAuth();
  if (!sessionWarning) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      className="flex flex-col gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <span className="flex items-center gap-2">
        <Badge variant="warning">Session</Badge>
        Expires in {minutesRemaining} min
      </span>
      <Button size="sm" variant="outline" className="h-8 w-full sm:w-auto" onClick={extendSession}>
        Stay signed in
      </Button>
    </div>
  );
}

function OwnerNav() {
  const pathname = usePathname();
  const { activeProgram } = useCropfortAuth();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const { badges } = useOwnerCounts();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-gradient-to-b from-emerald-50 to-sidebar">
      <SidebarHeader className="flex h-16 justify-center border-b border-sidebar-border/70 px-3 py-0">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Open menu"
              title="Open menu"
              className="cf-focus flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <PanelLeftOpen className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
                <Leaf className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold tracking-tight text-sidebar-foreground">Cropfort</span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  Asset owner
                </span>
              </span>
              {isMobile ? null : (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Close menu"
                  title="Close menu"
                  className="cf-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Asset owner desk" className="gap-0.5">
              {SILVA_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={count ? `${item.label} · ${count} waiting` : item.label}
                      className="h-10 rounded-lg text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-primary/[0.08] hover:text-sidebar-foreground data-[active=true]:bg-primary/[0.12] data-[active=true]:font-semibold data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center"
                    >
                      <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                        <span className="relative">
                          <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-sidebar-foreground/55")} aria-hidden />
                          {count ? (
                            <span className="absolute -right-1.5 -top-1.5 hidden h-2 w-2 rounded-full bg-amber-500 group-data-[collapsible=icon]:block" aria-hidden />
                          ) : null}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {count ? (
                          <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 group-data-[collapsible=icon]:hidden dark:text-amber-400">
                            {count}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <p className="truncate px-2 py-1 text-xs text-sidebar-foreground/60">{activeProgram?.name || "Cropfort"}</p>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Approval-first desk for any asset owner (farm_owner). */
export function SilvaApprovalShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      setSidebarOpen(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) !== "1");
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
      style={{ "--sidebar-width": "11.5rem" } as React.CSSProperties}
      className="min-h-[100dvh] items-stretch overflow-x-hidden bg-background text-foreground"
      data-desk="silva"
    >
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      <OwnerNav />

      <SidebarInset
        id="cropfort-main"
        tabIndex={-1}
        className="min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom)]"
      >
        <header className="sticky top-0 z-30 bg-card supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="cf-shell-topbar flex h-14 items-center gap-3 border-b border-border px-3 sm:px-5">
            <SidebarTrigger
              className="shrink-0 md:hidden border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Toggle navigation"
            />
            <FarmAreaSelector className="min-w-0" />
            <div className="flex-1" />
            <NotificationBell />
            <UserMenu />
          </div>
          <SessionBanner />
        </header>

        {children}

      </SidebarInset>

      <LiveUpdates />
      <ActivePlanSync />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </SidebarProvider>
  );
}
